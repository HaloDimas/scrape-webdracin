import { Link, useLocation } from "react-router-dom";
import { Play, X } from "lucide-react";
import { getContinueWatching, removeContinueWatching, ContinueWatching } from "@/lib/storage";
import { useState, useEffect } from "react";

export function ContinueWatchingRow() {
  const [items, setItems] = useState<ContinueWatching[]>([]);
  const location = useLocation();

  // Reload items whenever location changes (user navigates back from watch page)
  useEffect(() => {
    const loadItems = () => {
      const data = getContinueWatching();
      setItems(data);
    };
    
    loadItems();
  }, [location.pathname]);

  // Also listen for storage changes from other tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.includes('continue')) {
        setItems(getContinueWatching());
      }
    };
    
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleRemove = (e: React.MouseEvent, dramaId: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeContinueWatching(dramaId);
    setItems(getContinueWatching());
  };

  if (items.length === 0) return null;

  return (
    <section className="fade-in">
      <div className="mb-3 flex items-center justify-between px-4">
        <h2 className="text-lg font-bold text-foreground md:text-xl">
          Continue Watching
        </h2>
      </div>

      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2">
        {items.map((item) => {
          const resumeUrl = `/watch/${item.source}/${item.dramaId}/${item.episodeId}?t=${item.timestamp}`;
          
          return (
            <Link
              key={item.dramaId}
              to={resumeUrl}
              className="group relative flex-shrink-0"
            >
              <div className="relative h-28 w-48 overflow-hidden rounded-xl bg-muted md:h-32 md:w-56">
                <img
                  src={item.drama.poster}
                  alt={item.drama.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(item.progress, 100)}%` }}
                  />
                </div>

                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/90 shadow-lg transition-transform group-hover:scale-110">
                    <Play className="h-5 w-5 fill-primary-foreground text-primary-foreground" />
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={(e) => handleRemove(e, item.dramaId)}
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-background/70 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Episode info */}
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.drama.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Episode {item.episodeNumber}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
