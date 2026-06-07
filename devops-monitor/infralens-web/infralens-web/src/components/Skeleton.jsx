export const Skeleton = ({ className = '' }) => (
  <div className={`skeleton ${className}`} />
);

export const SkeletonCard = () => (
  <div className="glass-card p-4">
    <Skeleton className="h-4 w-24 mb-3 rounded" />
    <Skeleton className="h-8 w-16 mb-2 rounded" />
    <Skeleton className="h-3 w-32 rounded" />
  </div>
);
