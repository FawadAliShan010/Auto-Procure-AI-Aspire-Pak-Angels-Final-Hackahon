import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  auth,
  signInWithGoogle as fbSignInWithGoogle,
  signInWithEmail as fbSignInWithEmail,
  signUpWithEmail as fbSignUpWithEmail,
  signOutUser as fbSignOutUser,
  onAuthStateChanged,
  User,
} from '../services/firebase';
import { UserProfile, EnterpriseRole, normalizeRole } from '../types/procurement';
import { CURRENT_USER, DEMO_PERSONAS } from '../data/mockProcurementData';
import { getUserProfile, saveUserProfile, logAuditEvent } from '../services/persistentDataService';
import { UserProfileDoc } from '../types/procurementDataModel';
import {
  uploadProfileImageToStorage,
  deleteProfileImageFromStorage,
  validateProfileImageFile,
} from '../services/profileStorageService';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  enterpriseRole: EnterpriseRole;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isDemoSession: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    pass: string,
    displayName: string,
    role?: EnterpriseRole
  ) => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
  signInWithDemo: (persona?: UserProfile) => void;
  updateUserProfile: (updates: {
    name?: string;
    department?: string;
    avatarUrl?: string;
  }) => Promise<void>;
  uploadProfileImage: (
    file: File,
    onProgress?: (percent: number) => void
  ) => Promise<string>;
  removeProfileImage: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isDemoSession, setIsDemoSession] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Synchronize authenticated Firebase user with Firestore persistent profile
  const syncProfileFromFirestore = useCallback(
    async (firebaseUser: User, overrideRole?: EnterpriseRole): Promise<UserProfile> => {
      try {
        const existingDoc = await getUserProfile(firebaseUser.uid);

        if (existingDoc) {
          const role = normalizeRole(existingDoc.role);
          const resolvedProfile: UserProfile = {
            id: firebaseUser.uid,
            name: existingDoc.displayName || firebaseUser.displayName || 'Enterprise User',
            email: existingDoc.email || firebaseUser.email || '',
            role: role,
            department: existingDoc.department || 'Procurement & Operations',
            avatarUrl: existingDoc.profilePictureRef || firebaseUser.photoURL || CURRENT_USER.avatarUrl,
            profilePicturePath: existingDoc.profilePicturePath,
          };
          setUserProfile(resolvedProfile);
          return resolvedProfile;
        } else {
          // Document does not exist yet: create persistent profile in Firestore
          // Security policy: Bootstrap fawadalishan21@gmail.com as ADMIN; default new users to REQUISITIONER
          const assignedRole: EnterpriseRole =
            overrideRole ||
            (firebaseUser.email === 'fawadalishan21@gmail.com' ? 'ADMIN' : 'REQUISITIONER');

          const newDoc: UserProfileDoc = {
            id: firebaseUser.uid,
            displayName:
              firebaseUser.displayName ||
              firebaseUser.email?.split('@')[0] ||
              'Enterprise User',
            email: firebaseUser.email || '',
            role: assignedRole,
            department: 'Procurement & Operations',
            profilePictureRef: firebaseUser.photoURL || '',
            profilePicturePath: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await saveUserProfile(newDoc);

          const resolvedProfile: UserProfile = {
            id: newDoc.id,
            name: newDoc.displayName,
            email: newDoc.email,
            role: assignedRole,
            department: newDoc.department,
            avatarUrl: newDoc.profilePictureRef || CURRENT_USER.avatarUrl,
            profilePicturePath: '',
          };

          setUserProfile(resolvedProfile);

          // Log security event for audit trail
          logAuditEvent({
            user: {
              id: newDoc.id,
              name: newDoc.displayName,
              email: newDoc.email,
              role: assignedRole,
            },
            action: 'USER_PROFILE_INITIALIZED',
            entityType: 'USER_PROFILE',
            entityId: newDoc.id,
            newValue: { role: assignedRole, email: newDoc.email },
            reason: 'User profile registered in Firestore database',
          }).catch(() => {});

          return resolvedProfile;
        }
      } catch (err: any) {
        console.warn('Firestore profile sync fallback:', err?.message || err);
        // Resilient fallback if offline
        const fallbackRole =
          firebaseUser.email === 'fawadalishan21@gmail.com' ? 'ADMIN' : 'REQUISITIONER';
        const fallbackProfile: UserProfile = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Enterprise User',
          email: firebaseUser.email || '',
          role: fallbackRole,
          department: 'Procurement & Operations',
          avatarUrl: firebaseUser.photoURL || CURRENT_USER.avatarUrl,
        };
        setUserProfile(fallbackProfile);
        return fallbackProfile;
      }
    },
    []
  );

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          setIsDemoSession(false);
          setAuthError(null);
          await syncProfileFromFirestore(firebaseUser);
        } else {
          setUser(null);
          // If not in demo session, clear profile
          if (!isDemoSession) {
            setUserProfile(null);
          }
        }
        setIsAuthLoading(false);
      },
      (error) => {
        console.error('onAuthStateChanged error:', error);
        setAuthError('Authentication service encountered an issue.');
        setIsAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, [syncProfileFromFirestore, isDemoSession]);

  const signInWithGoogle = async (): Promise<void> => {
    try {
      setIsAuthLoading(true);
      setAuthError(null);
      const fbUser = await fbSignInWithGoogle();
      setUser(fbUser);
      setIsDemoSession(false);
      await syncProfileFromFirestore(fbUser);
    } catch (err: any) {
      const message = err.message || 'Unable to sign in with Google. Please try email login.';
      setAuthError(message);
      throw err;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string): Promise<void> => {
    try {
      setIsAuthLoading(true);
      setAuthError(null);
      const fbUser = await fbSignInWithEmail(email, pass);
      setUser(fbUser);
      setIsDemoSession(false);
      await syncProfileFromFirestore(fbUser);
    } catch (err: any) {
      const message = err.message || 'Invalid email or password.';
      setAuthError(message);
      throw err;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    displayName: string,
    role: EnterpriseRole = 'REQUISITIONER'
  ): Promise<void> => {
    try {
      setIsAuthLoading(true);
      setAuthError(null);
      const fbUser = await fbSignUpWithEmail(email, pass, displayName);
      setUser(fbUser);
      setIsDemoSession(false);
      await syncProfileFromFirestore(fbUser, role);
    } catch (err: any) {
      const message = err.message || 'Unable to create account. Please try again.';
      setAuthError(message);
      throw err;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setIsAuthLoading(true);
      if (user) {
        await fbSignOutUser();
      }
      setUser(null);
      setUserProfile(null);
      setIsDemoSession(false);
      setAuthError(null);
    } catch (err: any) {
      setAuthError(err.message || 'Unable to sign out.');
      throw err;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  // Explicit demo sign-in for testing/simulation environments
  const signInWithDemo = (persona: UserProfile = CURRENT_USER) => {
    setUser(null);
    setIsDemoSession(true);
    setUserProfile(persona);
    setAuthError(null);
  };

  // Profile update (name, department, profile picture)
  const updateUserProfile = async (updates: {
    name?: string;
    department?: string;
    avatarUrl?: string;
  }): Promise<void> => {
    if (!userProfile) return;

    const updatedProfile: UserProfile = {
      ...userProfile,
      name: updates.name ?? userProfile.name,
      department: updates.department ?? userProfile.department,
      avatarUrl: updates.avatarUrl ?? userProfile.avatarUrl,
    };

    setUserProfile(updatedProfile);

    if (user && !isDemoSession) {
      // Save directly to Firestore /users/{uid}
      const existingDoc = await getUserProfile(user.uid);
      const docToSave: UserProfileDoc = {
        id: user.uid,
        displayName: updatedProfile.name,
        email: updatedProfile.email,
        role: existingDoc?.role || normalizeRole(userProfile.role),
        department: updatedProfile.department,
        profilePictureRef: updatedProfile.avatarUrl,
        profilePicturePath: updatedProfile.profilePicturePath || existingDoc?.profilePicturePath,
        createdAt: existingDoc?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveUserProfile(docToSave);

      logAuditEvent({
        user: {
          id: user.uid,
          name: updatedProfile.name,
          email: updatedProfile.email,
          role: userProfile.role,
        },
        action: 'USER_PROFILE_UPDATED',
        entityType: 'USER_PROFILE',
        entityId: user.uid,
        newValue: {
          name: updatedProfile.name,
          department: updatedProfile.department,
          avatar: updatedProfile.avatarUrl,
        },
        reason: 'User updated personal profile details',
      }).catch(() => {});
    }
  };

  // Upload and persist real profile picture in Firebase Cloud Storage
  const uploadProfileImage = async (
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<string> => {
    // 1. Validation
    const validation = validateProfileImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid profile image file.');
    }

    // 2. Authenticated state check
    if (!user || isDemoSession) {
      throw new Error(
        'Authentication required: Please sign in with your enterprise account to upload persistent profile assets to Cloud Storage.'
      );
    }

    const userId = user.uid;
    const previousPath = userProfile?.profilePicturePath;

    // 3. Upload to Firebase Cloud Storage at user-scoped path
    const { downloadUrl, storagePath } = await uploadProfileImageToStorage(
      file,
      userId,
      onProgress
    );

    // 4. Update Firestore user document
    const existingDoc = await getUserProfile(userId);
    const docToSave: UserProfileDoc = {
      id: userId,
      displayName: userProfile?.name || existingDoc?.displayName || user.displayName || 'Enterprise User',
      email: user.email || userProfile?.email || '',
      role: existingDoc?.role || normalizeRole(userProfile?.role),
      department: userProfile?.department || existingDoc?.department || 'Procurement & Operations',
      profilePictureRef: downloadUrl,
      profilePicturePath: storagePath,
      profilePictureUpdatedAt: new Date().toISOString(),
      createdAt: existingDoc?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveUserProfile(docToSave);

    // 5. Update local React auth state
    if (userProfile) {
      setUserProfile({
        ...userProfile,
        avatarUrl: downloadUrl,
        profilePicturePath: storagePath,
      });
    }

    // 6. Safely clean up previous image in storage if it was a custom upload and differs
    if (previousPath && previousPath !== storagePath) {
      deleteProfileImageFromStorage(previousPath).catch((err) => {
        console.warn('Non-blocking cleanup of previous image failed:', err);
      });
    }

    // 7. Audit log event
    logAuditEvent({
      user: {
        id: userId,
        name: docToSave.displayName,
        email: docToSave.email,
        role: docToSave.role,
      },
      action: 'PROFILE_PICTURE_UPLOADED',
      entityType: 'USER_PROFILE',
      entityId: userId,
      newValue: {
        profilePictureRef: downloadUrl,
        profilePicturePath: storagePath,
      },
      reason: 'User uploaded new verified enterprise profile picture',
    }).catch(() => {});

    return downloadUrl;
  };

  // Remove profile picture from Cloud Storage and Firestore
  const removeProfileImage = async (): Promise<void> => {
    if (!user || isDemoSession) {
      if (userProfile) {
        setUserProfile({
          ...userProfile,
          avatarUrl: undefined,
          profilePicturePath: undefined,
        });
      }
      return;
    }

    const userId = user.uid;
    const previousPath = userProfile?.profilePicturePath;

    // 1. Clean up from Storage
    if (previousPath) {
      await deleteProfileImageFromStorage(previousPath);
    }

    // 2. Update Firestore
    const existingDoc = await getUserProfile(userId);
    const docToSave: UserProfileDoc = {
      id: userId,
      displayName: userProfile?.name || existingDoc?.displayName || user.displayName || 'Enterprise User',
      email: user.email || userProfile?.email || '',
      role: existingDoc?.role || normalizeRole(userProfile?.role),
      department: userProfile?.department || existingDoc?.department || 'Procurement & Operations',
      profilePictureRef: '',
      profilePicturePath: '',
      createdAt: existingDoc?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveUserProfile(docToSave);

    // 3. Update React auth state
    if (userProfile) {
      setUserProfile({
        ...userProfile,
        avatarUrl: undefined,
        profilePicturePath: undefined,
      });
    }

    // 4. Audit log event
    logAuditEvent({
      user: {
        id: userId,
        name: docToSave.displayName,
        email: docToSave.email,
        role: docToSave.role,
      },
      action: 'PROFILE_PICTURE_REMOVED',
      entityType: 'USER_PROFILE',
      entityId: userId,
      reason: 'User removed enterprise profile picture',
    }).catch(() => {});
  };

  const refreshUserProfile = async (): Promise<void> => {
    if (user) {
      await syncProfileFromFirestore(user);
    }
  };

  const currentRole = normalizeRole(userProfile?.role);

  const value: AuthContextType = {
    user,
    userProfile,
    enterpriseRole: currentRole,
    isAuthenticated: !!user || (isDemoSession && !!userProfile),
    isAuthLoading,
    isDemoSession,
    authError,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    clearAuthError,
    signInWithDemo,
    updateUserProfile,
    uploadProfileImage,
    removeProfileImage,
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
