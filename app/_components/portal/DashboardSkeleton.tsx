function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-surface p-5 shadow-sm animate-pulse flex flex-col gap-3 ${className}`}>
      <div className="h-3 w-24 rounded bg-surface-deep" />
      <div className="h-6 w-32 rounded bg-surface-deep" />
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Greeting skeleton */}
      <div className="animate-pulse">
        <div className="h-4 w-32 rounded bg-surface-deep mb-2" />
        <div className="h-7 w-56 rounded bg-surface-deep" />
      </div>

      {/* Status + Plan grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Debt section */}
      <SkeletonCard className="col-span-full" />

      {/* Tickets section */}
      <div className="rounded-2xl bg-surface p-5 shadow-sm animate-pulse flex flex-col gap-3">
        <div className="h-3 w-28 rounded bg-surface-deep" />
        <div className="h-16 w-full rounded bg-surface-deep" />
        <div className="h-16 w-full rounded bg-surface-deep" />
      </div>
    </div>
  );
}
