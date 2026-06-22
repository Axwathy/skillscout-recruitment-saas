import { Skeleton } from "@/components/ui/Skeleton";

export default function CandidateLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-[20px]" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-[20px]" />
    </div>
  );
}
