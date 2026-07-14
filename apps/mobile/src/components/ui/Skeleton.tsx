import { cn } from '@utils/Cn.js';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton rounded-lg', className)} />;
}

/** A skeleton that looks like a policy list card */
export function PolicyCardSkeleton() {
  return (
    <div className="rounded-[22px] border border-line bg-surface overflow-hidden">
      <div className="flex h-full items-stretch">
        <div className="w-1.5 flex-none skeleton" />
        <div className="flex-1 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3 items-center">
              <Skeleton className="h-11 w-11 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton for a KPI metric card */
export function MetricCardSkeleton() {
  return (
    <div className="rounded-[26px] border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3 flex-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-16" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-11 w-11 rounded-2xl" />
      </div>
    </div>
  );
}

/** Skeleton for a settings row */
export function SettingsRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-paper/80 px-4 py-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-10 w-28 rounded-2xl" />
    </div>
  );
}

export default Skeleton;
