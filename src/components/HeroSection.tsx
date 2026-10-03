import { Link } from "react-router-dom";
import { Play, Info } from "lucide-react";
import { Drama } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  drama: Drama | null;
}

export function HeroSection({ drama }: HeroSectionProps) {
  if (!drama) {
    return (
      <div className="relative h-[50vh] min-h-[350px] w-full shimmer md:h-[60vh]" />
    );
  }

  return (
    <section className="relative h-[50vh] min-h-[350px] w-full overflow-hidden md:h-[60vh]">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={drama.poster}
          alt={drama.title}
          className="h-full w-full object-cover"
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
        <div className="container mx-auto">
          <h1 className="mb-2 max-w-xl text-2xl font-bold text-foreground md:text-4xl lg:text-5xl">
            {drama.title}
          </h1>

          {drama.description && (
            <p className="mb-4 line-clamp-2 max-w-lg text-sm text-muted-foreground md:text-base">
              {drama.description}
            </p>
          )}

          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {drama.rating && drama.rating > 0 && (
              <span className="flex items-center gap-1 font-medium text-primary">
                ⭐ {drama.rating.toFixed(1)}
              </span>
            )}
            {drama.year && <span>• {drama.year}</span>}
            {drama.episodes && <span>• {drama.episodes} Episodes</span>}
            {drama.genre && drama.genre.length > 0 && (
              <span>• {drama.genre.slice(0, 3).join(", ")}</span>
            )}
          </div>

          <div className="flex gap-3">
            <Link to={`/drama/${drama.id}`}>
              <Button size="lg" className="gap-2 font-semibold">
                <Play className="h-5 w-5 fill-current" />
                Watch Now
              </Button>
            </Link>
            <Link to={`/drama/${drama.id}`}>
              <Button
                size="lg"
                variant="secondary"
                className="gap-2 font-semibold"
              >
                <Info className="h-5 w-5" />
                Details
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
