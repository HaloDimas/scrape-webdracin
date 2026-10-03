import { cn } from "@/lib/utils";

interface DramaCardSkeletonProps {
  size?: "small" | "medium" | "large";
}

export function DramaCardSkeleton({ size = "medium" }: DramaCardSkeletonProps) {
  const sizeClasses = {
    small: "w-28 md:w-32",
    medium: "w-36 md:w-44",
    large: "w-44 md:w-56",
  };

  return (
    <div className={cn("flex-shrink-0", sizeClasses[size])}>
      <div className="shimmer aspect-poster rounded-xl" />
      <div className="shimmer mt-2 h-4 w-3/4 rounded" />
      <div className="shimmer mt-1 h-3 w-1/2 rounded" />
    </div>
  );
}

export function DramaRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <section className="space-y-3">
      <div className="px-4">
        <div className="shimmer h-6 w-32 rounded" />
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4">
        {Array.from({ length: count }).map((_, i) => (
          <DramaCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
