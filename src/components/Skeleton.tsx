import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Skeleton loading placeholder component
 * Used to show loading states for content
 */
export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const baseClasses = 'bg-ink/10';

  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: '',
    none: '',
  };

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  if (animation === 'wave') {
    return (
      <div
        className={`${baseClasses} ${variantClasses[variant]} ${className} overflow-hidden relative`}
        style={style}
      >
        <motion.div
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ translateX: ['100%', '-100%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
}

/**
 * Skeleton for POI panel content
 */
export function POIPanelSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {/* Type badge */}
      <Skeleton variant="rectangular" width={100} height={24} />

      {/* Title */}
      <Skeleton variant="text" width="80%" height={28} />

      {/* Floor info */}
      <div className="flex items-center gap-2">
        <Skeleton variant="circular" width={20} height={20} />
        <Skeleton variant="text" width={60} />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="90%" />
        <Skeleton variant="text" width="70%" />
      </div>

      {/* Metadata */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" width={16} height={16} />
          <Skeleton variant="text" width={120} />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" width={16} height={16} />
          <Skeleton variant="text" width={100} />
        </div>
      </div>

      {/* Action button */}
      <Skeleton variant="rectangular" width="100%" height={48} className="mt-6" />
    </div>
  );
}

/**
 * Skeleton for attendee list items
 */
export function AttendeeListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="40%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for venue cards
 */
export function VenueCardSkeleton() {
  return (
    <div className="bg-paper rounded-xl p-4 shadow-md space-y-3">
      <Skeleton variant="rectangular" width="100%" height={120} className="rounded-lg" />
      <Skeleton variant="text" width="60%" height={24} />
      <Skeleton variant="text" width="80%" height={16} />
      <Skeleton variant="text" width="40%" height={16} />
    </div>
  );
}

/**
 * Full-screen loading skeleton for initial app load
 */
export function AppLoadingSkeleton() {
  return (
    <div className="h-full w-full bg-cream flex flex-col">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-4">
        <Skeleton variant="rectangular" width={120} height={32} />
        <Skeleton variant="circular" width={40} height={40} />
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 relative">
        {/* Map area */}
        <Skeleton variant="rectangular" className="absolute inset-0 rounded-none" animation="wave" />

        {/* Floor selector */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="circular" width={40} height={40} />
          ))}
        </div>
      </div>

      {/* Bottom controls skeleton */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
        <Skeleton variant="circular" width={56} height={56} />
        <Skeleton variant="circular" width={56} height={56} />
      </div>
    </div>
  );
}

/**
 * Loading spinner component
 */
export function LoadingSpinner({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-teal-600 border-t-transparent rounded-full animate-spin ${className}`}
    />
  );
}
