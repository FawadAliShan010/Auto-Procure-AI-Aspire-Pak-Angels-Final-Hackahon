import React, { useState } from 'react';
import { getInitials } from '../../services/profileStorageService';

interface UserAvatarProps {
  id?: string;
  name?: string;
  avatarUrl?: string;
  role?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showRoleBadge?: boolean;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-8 h-8 text-xs',
  lg: 'w-12 h-12 text-sm',
  xl: 'w-20 h-20 text-lg font-bold',
};

const badgeSizeClasses = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-4 h-4',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  id = 'user-avatar',
  name = 'Enterprise User',
  avatarUrl,
  role = 'REQUISITIONER',
  size = 'md',
  className = '',
  showRoleBadge = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(name);

  const roleColor =
    role === 'ADMIN'
      ? 'bg-rose-500 ring-rose-400'
      : role === 'PURCHASE_MANAGER'
      ? 'bg-amber-500 ring-amber-400'
      : 'bg-emerald-500 ring-emerald-400';

  const hasValidImage = Boolean(avatarUrl) && !imageError;

  return (
    <div id={id} className={`relative inline-flex shrink-0 ${className}`}>
      {hasValidImage ? (
        <img
          src={avatarUrl}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          className={`${sizeClasses[size]} rounded-full object-cover border border-slate-200/80 shadow-2xs`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold tracking-tight bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white border border-indigo-400/40 shadow-2xs select-none`}
        >
          {initials}
        </div>
      )}

      {showRoleBadge && (
        <span
          title={`Role: ${role}`}
          className={`absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-slate-900 ${roleColor} ${badgeSizeClasses[size]}`}
        />
      )}
    </div>
  );
};
