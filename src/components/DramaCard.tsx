import { Link } from "react-router-dom";
import { Heart, Play, CheckCircle } from "lucide-react";
import { Drama, DramaSource } from "@/lib/api";
import { isFavorite, addFavorite, removeFavorite, getContinueWatching } from "@/lib/storage";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface DramaCardProps {
  drama: Drama;
  size?: "small" | "medium" | "large";
  showFavorite?: boolean;
  showProgress?: boolean;
  showSource?: boolean;
  className?: string;
}

export function DramaCard({
  drama,
  size = "medium",
  showFavorite = true,
  showProgress = true,
  showSource = false,
  className,
}: DramaCardProps) {
  const [favorite, setFavorite] = useState(() => isFavorite(drama.id));

  // Get watch progress from continue watching
  const watchProgress = useMemo(() => {
    if (!showProgress) return null;
    const continueWatching = getContinueWatching();
    const item = continueWatching.find((c) => c.dramaId === drama.id);
    return item ? item.progress : null;
  }, [drama.id, showProgress]);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (favorite) {
      removeFavorite(drama.id);
    } else {
      addFavorite(drama);
    }
    setFavorite(!favorite);
  };

  const sizeClasses = {
    small: "w-28 md:w-32",
    medium: "w-36 md:w-44",
    large: "w-44 md:w-56",
  };

  // Include source in URL for proper routing
  const source = drama.source || 'dramabox';
  const dramaLink = `/drama/${source}/${drama.id}`;

  return (
    <Link
      to={dramaLink}
      state={{ drama }}
      className={cn("drama-card group flex-shrink-0", sizeClasses[size], className)}
    >
      <div className="relative aspect-poster overflow-hidden rounded-xl bg-muted">
        {drama.poster ? (
          <img
            src={drama.poster}
            alt={drama.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <Play className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        
        {/* Play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 shadow-lg backdrop-blur-sm">
            <Play className="h-6 w-6 fill-primary-foreground text-primary-foreground" />
          </div>
        </div>

        {/* Source badge */}
        {showSource && source && (
          <div
            className={cn(
              "absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase backdrop-blur-sm",
              source === 'melolo' && "bg-purple-500/90 text-white",
              source === 'netshort' && "bg-blue-500/90 text-white",
              source === 'dramadash' && "bg-green-500/90 text-white",
              source === 'dramawave' && "bg-cyan-500/90 text-white",
              source === 'freereels' && "bg-orange-500/90 text-white",
              source === 'starshot' && "bg-yellow-500/90 text-white",
              source === 'dramabox' && "bg-pink-500/90 text-white",
              source === 'webdracin' && "bg-rose-600/90 text-white"
            )}
          >
            {source.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Favorite button */}
        {showFavorite && (
          <button
            onClick={toggleFavorite}
            className={cn(
              "absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200",
              favorite
                ? "bg-primary text-primary-foreground"
                : "bg-background/60 text-foreground backdrop-blur-sm hover:bg-background/80"
            )}
          >
            <Heart
              className="h-4 w-4"
              fill={favorite ? "currentColor" : "none"}
            />
          </button>
        )}

        {/* Rating badge */}
        {drama.rating && drama.rating > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-primary/90 px-2 py-0.5 text-xs font-semibold text-primary-foreground backdrop-blur-sm">
            ⭐ {Number(drama.rating).toFixed(1)}
          </div>
        )}

        {/* Watch progress bar */}
        {watchProgress !== null && watchProgress > 0 && (
          <>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${watchProgress}%` }}
              />
            </div>
            {watchProgress >= 90 && (
              <div className="absolute left-2 top-2">
                <CheckCircle className="h-5 w-5 text-primary drop-shadow-lg" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Title */}
      <h3 className="mt-2 line-clamp-2 text-sm font-medium text-foreground transition-colors group-hover:text-primary">
        {drama.title}
      </h3>
      
      {drama.genre && drama.genre.length > 0 && (
        <p className="mt-0.5 text-xs text-muted-foreground">
          {drama.genre.slice(0, 2).join(" • ")}
        </p>
      )}
    </Link>
  );
}
