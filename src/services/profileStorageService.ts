import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  StorageError,
} from 'firebase/storage';
import { storage, auth } from './firebase';

export const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export interface UploadProfileImageResult {
  downloadUrl: string;
  storagePath: string;
}

/**
 * Validates a profile picture file against security and operational criteria:
 * - MIME type: image/jpeg, image/png, image/webp
 * - File size: <= 5MB
 */
export const validateProfileImageFile = (file: File | null | undefined): ImageValidationResult => {
  if (!file) {
    return { valid: false, error: 'No image file selected.' };
  }

  // Check MIME type
  const isAllowedMime = ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase());
  
  // Extension fallback check for safety
  const fileNameLower = file.name.toLowerCase();
  const hasAllowedExt = /\.(jpe?g|png|webp)$/i.test(fileNameLower);

  if (!isAllowedMime || !hasAllowedExt) {
    return {
      valid: false,
      error: `Unsupported file type (${file.type || 'unknown'}). Please upload a JPEG, PNG, or WebP image.`,
    };
  }

  // Check File Size limit
  if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `Image size (${sizeInMB} MB) exceeds the 5.00 MB limit. Please choose a smaller image.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'Selected file is empty (0 bytes). Please choose a valid image.',
    };
  }

  return { valid: true };
};

/**
 * Determines file extension safely from MIME type or file name
 */
export const getFileExtension = (file: File): string => {
  if (file.type === 'image/jpeg') return 'jpg';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  const match = file.name.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : 'jpg';
};

/**
 * Generates user-scoped storage path adhering to:
 * profilePictures/{authenticatedUserId}/profile_{timestamp}.{extension}
 */
export const generateProfileStoragePath = (userId: string, extension: string): string => {
  return `profilePictures/${userId}/profile_${Date.now()}.${extension}`;
};

/**
 * Uploads a profile picture to Firebase Cloud Storage for an authenticated user.
 * Supports upload progress tracking and user-scoped storage path isolation.
 */
export const uploadProfileImageToStorage = (
  file: File,
  userId: string,
  onProgress?: (percent: number) => void
): Promise<UploadProfileImageResult> => {
  return new Promise((resolve, reject) => {
    // Zero-trust client validation: User must be authenticated and match target UID
    if (!auth.currentUser) {
      reject(new Error('Authentication required. Please sign in to upload a persistent profile picture.'));
      return;
    }

    if (auth.currentUser.uid !== userId) {
      reject(new Error('Security violation: Cannot upload image to another user profile directory.'));
      return;
    }

    // Validate file constraints
    const validation = validateProfileImageFile(file);
    if (!validation.valid) {
      reject(new Error(validation.error || 'Invalid profile image.'));
      return;
    }

    const extension = getFileExtension(file);
    const storagePath = generateProfileStoragePath(userId, extension);
    const storageRef = ref(storage, storagePath);

    const metadata = {
      contentType: file.type,
      customMetadata: {
        userId,
        uploadedAt: new Date().toISOString(),
        originalFileName: file.name,
      },
    };

    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0) {
          const percent = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          if (onProgress) {
            onProgress(percent);
          }
        }
      },
      (error: StorageError) => {
        console.error('Firebase Storage upload error:', error);
        let userMessage = 'Upload failed. Please check network connectivity and try again.';
        if (error.code === 'storage/unauthorized') {
          userMessage = 'Permission denied: You can only upload images to your own profile.';
        } else if (error.code === 'storage/quota-exceeded') {
          userMessage = 'Storage quota exceeded for this Firebase project.';
        }
        reject(new Error(userMessage));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            downloadUrl,
            storagePath,
          });
        } catch (err: any) {
          reject(new Error(`Failed to retrieve image download URL: ${err?.message || err}`));
        }
      }
    );
  });
};

/**
 * Safely deletes a previous profile image from Firebase Cloud Storage.
 * Ignores 404/not-found errors to prevent blocking the user profile update.
 */
export const deleteProfileImageFromStorage = async (storagePathOrUrl: string): Promise<void> => {
  if (!storagePathOrUrl) return;

  try {
    let targetRef;
    if (storagePathOrUrl.startsWith('profilePictures/')) {
      targetRef = ref(storage, storagePathOrUrl);
    } else if (storagePathOrUrl.startsWith('gs://') || storagePathOrUrl.startsWith('http')) {
      targetRef = ref(storage, storagePathOrUrl);
    } else {
      return;
    }

    await deleteObject(targetRef);
  } catch (error: any) {
    // Non-critical cleanup error; log and proceed safely
    if (error?.code !== 'storage/object-not-found') {
      console.warn('Previous profile picture cleanup notification:', error?.message || error);
    }
  }
};

/**
 * Extracts initials from user name for reliable, accessible avatar fallback
 */
export const getInitials = (name?: string | null): string => {
  if (!name || !name.trim()) return 'AP';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
