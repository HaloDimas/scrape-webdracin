import { Drama } from "@/lib/api";
import { DramaCard } from "./DramaCard";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface DramaRowProps {
  title: string;
  dramas: Drama[];
  seeAllLink?: string;
  size?: "small" | "medium" | "large";
  className?: string;
}

export function DramaRow({
  title,
  dramas,
  seeAllLink,
  size = "medium",
  className,
}: DramaRowProps) {
  if (!dramas || dramas.length === 0) return null;

  return (
    <section className={cn("fade-in", className)}>
      <div className="mb-3 flex items-center justify-between px-4">
        <h2 className="text-lg font-bold text-foreground md:text-xl">{title}</h2>
        {seeAllLink && (
          <Link
            to={seeAllLink}
            className="flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            See All
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2">
        {dramas.map((drama, index) => (
          <DramaCard
            key={drama.id || index}
            drama={drama}
            size={size}
            className="animate-scale-in"
          />
        ))}
      </div>
    </section>
  );
}
