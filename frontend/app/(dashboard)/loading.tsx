import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Skeleton className="h-6 w-36 rounded-full" />
          <Skeleton className="h-12 w-72" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-[260px] w-full rounded-[20px]" />
        </div>
        <Skeleton className="h-64 w-full rounded-[20px]" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-44 w-full rounded-[20px]" />
        ))}
      </div>
    </div>
  );
}
