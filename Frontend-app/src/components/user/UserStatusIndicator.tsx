import { useRealTimeUserStatus } from '@/hooks/useUserStatus';

interface UserStatusIndicatorProps {
  userId: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function UserStatusIndicator({
  userId,
  showLabel = false,
  size = 'md',
  className = '',
}: UserStatusIndicatorProps) {
  const { icon, label, isLoading, color, isOnline, isOffline, isInactive } = useRealTimeUserStatus(userId);

  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <div className={`${sizeClasses[size]} rounded-full bg-gray-200 animate-pulse`} />
        {showLabel && <span className={`${labelSizeClasses[size]} text-muted-foreground`}>Loading...</span>}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center ${
          isOnline
            ? 'bg-green-500'
            : isOffline
            ? 'bg-red-500'
            : isInactive
            ? 'bg-orange-500'
            : 'bg-gray-400'
        }`}
        title={label}
      >
        <span className="text-white text-[8px] leading-none">{icon}</span>
      </div>
      {showLabel && <span className={`${labelSizeClasses[size]} font-medium`}>{label}</span>}
    </div>
  );
}

// Component for badge-style status display
interface UserStatusBadgeProps {
  userId: string;
  variant?: 'default' | 'outline' | 'minimal';
  className?: string;
}

export function UserStatusBadge({
  userId,
  variant = 'default',
  className = '',
}: UserStatusBadgeProps) {
  const { icon, label, isLoading, color, isOnline, isOffline, isInactive } = useRealTimeUserStatus(userId);

  if (isLoading) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600 ${className}`}>
        <div className="h-2 w-2 rounded-full bg-gray-300 animate-pulse" />
        Loading...
      </span>
    );
  }

  const variantClasses = {
    default: `inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
      isOnline
        ? 'bg-green-100 text-green-800'
        : isOffline
        ? 'bg-red-100 text-red-800'
        : isInactive
        ? 'bg-orange-100 text-orange-800'
        : 'bg-gray-100 text-gray-800'
    }`,
    outline: `inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${
      isOnline
        ? 'border-green-200 text-green-700'
        : isOffline
        ? 'border-red-200 text-red-700'
        : isInactive
        ? 'border-orange-200 text-orange-700'
        : 'border-gray-200 text-gray-700'
    }`,
    minimal: `inline-flex items-center gap-1.5 ${className}`,
  };

  return (
    <span className={`${variantClasses[variant]} ${className}`} title={label}>
      <span className="text-xs">{icon}</span>
      {variant !== 'minimal' && label}
    </span>
  );
}

// Component for list item with status
interface UserStatusListItemProps {
  userId: string;
  name: string;
  email: string;
  showEmail?: boolean;
  className?: string;
}

export function UserStatusListItem({
  userId,
  name,
  email,
  showEmail = true,
  className = '',
}: UserStatusListItemProps) {
  const { icon, label, isLoading } = useRealTimeUserStatus(userId);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-between p-3 rounded-lg border ${className}`}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gray-200 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            {showEmail && <div className="h-3 w-48 bg-gray-200 rounded animate-pulse" />}
          </div>
        </div>
        <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors ${className}`}>
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 rounded-full flex items-center justify-center ${
          icon === '🟢' ? 'bg-green-100 text-green-600' :
          icon === '🔴' ? 'bg-red-100 text-red-600' :
          icon === '🟠' ? 'bg-orange-100 text-orange-600' :
          'bg-gray-100 text-gray-600'
        }`}>
          <span className="text-lg">{icon}</span>
        </div>
        <div>
          <p className="font-medium">{name}</p>
          {showEmail && <p className="text-sm text-muted-foreground">{email}</p>}
        </div>
      </div>
      <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted">
        {label}
      </span>
    </div>
  );
}