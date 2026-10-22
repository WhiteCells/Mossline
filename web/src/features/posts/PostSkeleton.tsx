export function PostSkeleton() {
  return (
    <div className="post-card skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-cover" />
      <div className="post-content">
        <div className="skeleton skeleton-short" />
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line narrow" />
        <div className="skeleton skeleton-meta" />
      </div>
    </div>
  )
}
