import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProcure } from '../../context/ProcurementContext';
import { UserAvatar } from '../common/UserAvatar';
import { Button } from '../common/Button';
import {
  validateProfileImageFile,
  MAX_PROFILE_IMAGE_SIZE_BYTES,
  ALLOWED_IMAGE_TYPES,
} from '../../services/profileStorageService';
import {
  UploadCloud,
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Cloud,
  ShieldAlert,
  Loader2,
  X,
} from 'lucide-react';

export const ProfilePictureUploadCard: React.FC = () => {
  const {
    user,
    userProfile,
    isDemoSession,
    uploadProfileImage,
    removeProfileImage,
  } = useAuth();
  const { currentUser, addToast, navigateTo } = useProcure();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isAuthenticated = Boolean(user && !isDemoSession);

  // Handle file selection from input or drop
  const handleFileChange = (file: File | null) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    // Comprehensive client validation (type and size)
    const validation = validateProfileImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Create client-side preview
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleClearSelected = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMessage(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Perform upload to Firebase Cloud Storage & Firestore
  const handleUpload = async () => {
    if (!selectedFile) return;

    if (!isAuthenticated) {
      setErrorMessage(
        'Authentication required: You are currently in Demo Sandbox Mode. Please sign in with your enterprise account to upload persistent assets to Firebase Cloud Storage.'
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setErrorMessage(null);

    try {
      await uploadProfileImage(selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      setSuccessMessage('Profile picture successfully uploaded and stored in Firebase Cloud Storage.');
      addToast(
        'Profile Picture Updated',
        'Your new profile picture is now active across all devices and procurement audits.',
        'success'
      );

      // Reset selection state
      handleClearSelected();
    } catch (err: any) {
      console.error('Profile image upload error:', err);
      const msg = err?.message || 'Failed to upload profile picture. Please try again.';
      setErrorMessage(msg);
      addToast('Upload Error', msg, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Remove photo from Storage and Firestore
  const handleRemove = async () => {
    if (!currentUser.avatarUrl && !userProfile?.avatarUrl) return;

    const confirmed = window.confirm(
      'Are you sure you want to remove your profile picture? Your initials will be displayed as the fallback avatar.'
    );
    if (!confirmed) return;

    setIsUploading(true);
    try {
      await removeProfileImage();
      handleClearSelected();
      setSuccessMessage('Profile picture removed. Enterprise initials fallback is now active.');
      addToast('Profile Picture Removed', 'Profile avatar reset to initials fallback.', 'info');
    } catch (err: any) {
      console.error('Profile picture removal error:', err);
      const msg = err?.message || 'Failed to remove profile picture.';
      setErrorMessage(msg);
      addToast('Error', msg, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      id="profile-picture-upload-card"
      className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-5"
    >
      {/* Card Header with Storage Environment Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">
              Enterprise Identity & Profile Picture
            </h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-mono font-bold px-2 py-0.5 rounded border border-indigo-200/60">
              Cloud Storage v2
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Manage your persistent avatar used across the 4-Gate Procurement Gatekeeper and audit trail.
          </p>
        </div>

        <div>
          {isAuthenticated ? (
            <span
              id="storage-mode-active"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              Firebase Cloud Storage Active
            </span>
          ) : (
            <span
              id="storage-mode-demo"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Demo Sandbox Session
            </span>
          )}
        </div>
      </div>

      {/* Demo Sandbox Alert (if unauthenticated) */}
      {!isAuthenticated && (
        <div
          id="demo-mode-notice"
          className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">Demo Sandbox Persona Active:</span>
            <span className="text-[11px] text-amber-800 leading-relaxed block">
              You are testing in Demo Mode as <strong>{currentUser.name}</strong> ({currentUser.role}).
              To persist uploaded photos to real Firebase Cloud Storage at{' '}
              <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[10px]">
                profilePictures/{'{userId}'}/*
              </code>
              , please sign in with your enterprise account.
            </span>
            <button
              type="button"
              id="btn-goto-login"
              onClick={() => navigateTo('/login')}
              className="text-indigo-700 hover:text-indigo-800 font-semibold underline text-xs pt-0.5 cursor-pointer inline-block"
            >
              Sign In to Enterprise Account →
            </button>
          </div>
        </div>
      )}

      {/* Main Avatar & Action Controls Grid */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Left: Current or Preview Avatar Display */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="relative group">
            {previewUrl ? (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="New Profile Preview"
                  className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500 shadow-md ring-4 ring-indigo-50"
                />
                <span className="absolute top-0 right-0 bg-indigo-600 text-white p-1 rounded-full shadow-xs">
                  <Camera className="w-3 h-3" />
                </span>
              </div>
            ) : (
              <div className="relative">
                <UserAvatar
                  id="settings-user-avatar"
                  name={currentUser.name}
                  avatarUrl={currentUser.avatarUrl}
                  role={currentUser.role}
                  size="xl"
                  showRoleBadge={true}
                  className="ring-4 ring-slate-100 shadow-sm"
                />
                <button
                  type="button"
                  id="btn-trigger-file-select"
                  onClick={() => fileInputRef.current?.click()}
                  title="Choose image"
                  className="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded-full shadow-sm cursor-pointer transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            {previewUrl ? 'Preview ready' : currentUser.role}
          </span>
        </div>

        {/* Right: Upload Dropzone & Controls */}
        <div className="flex-1 min-w-0 w-full space-y-3">
          {/* Hidden HTML File Input */}
          <input
            ref={fileInputRef}
            type="file"
            id="profile-image-file-input"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            className="hidden"
          />

          {/* If file is selected, show Preview confirmation toolbar */}
          {selectedFile && previewUrl ? (
            <div
              id="selected-file-confirmation-panel"
              className="p-3.5 bg-indigo-50/50 border border-indigo-200 rounded-lg space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-semibold text-xs text-slate-900 block truncate max-w-[200px] sm:max-w-xs">
                      {selectedFile.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-cancel-preview"
                  onClick={handleClearSelected}
                  disabled={isUploading}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors"
                  title="Cancel selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-medium text-indigo-900">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                      Uploading to Cloud Storage...
                    </span>
                    <span className="font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-indigo-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Upload Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  id="btn-confirm-upload"
                  type="button"
                  variant="primary"
                  size="sm"
                  isLoading={isUploading}
                  leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
                  onClick={handleUpload}
                >
                  Save & Upload to Cloud Storage
                </Button>
                <Button
                  id="btn-discard-selection"
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={handleClearSelected}
                >
                  Discard
                </Button>
              </div>
            </div>
          ) : (
            /* Normal Drag & Drop Dropzone */
            <div
              id="avatar-dropzone"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-indigo-50/20"
            >
              <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
              <div className="text-xs font-semibold text-slate-700">
                Click to browse or drag & drop an image here
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                JPEG, PNG, or WebP up to 5 MB. Stored securely in Firebase Cloud Storage.
              </div>
            </div>
          )}

          {/* Secondary Actions (Select File Button & Remove Photo) */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              id="btn-browse-photo"
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Camera className="w-3.5 h-3.5" />}
              onClick={() => fileInputRef.current?.click()}
            >
              Select New Photo
            </Button>

            {currentUser.avatarUrl && (
              <Button
                id="btn-remove-photo"
                type="button"
                variant="ghost"
                size="sm"
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={handleRemove}
                disabled={isUploading}
              >
                Remove Photo
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div
          id="profile-upload-success"
          className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div
          id="profile-upload-error"
          className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900 text-xs font-semibold ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Security & Isolation Summary Banner */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-slate-400 gap-2">
        <span className="flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
          Zero-Trust Storage Path: <code className="font-mono text-slate-600">profilePictures/{'{userId}'}/*</code>
        </span>
        <span>MIME Verified • Maximum 5.00 MB • Immutable Path Isolation</span>
      </div>
    </div>
  );
};
