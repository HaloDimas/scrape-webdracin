import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getWatchHistory, clearHistory, WatchHistoryItem } from "@/lib/storage";
import { History as HistoryIcon, Trash2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export default function History() {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);

  useEffect(() => {
    setHistory(getWatchHistory());
  }, []);

  const handleClear = () => {
    clearHistory();
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-background pb-safe pt-4">
      <div className="px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Watch History</h1>
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="gap-2 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <HistoryIcon className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              No watch history
            </h3>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Start watching dramas and they will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item, index) => (
              <Link
                key={`${item.dramaId}-${item.episodeNumber}-${index}`}
                to={`/drama/${item.dramaId}`}
                className="group flex gap-3 rounded-xl bg-card p-3 transition-all hover:bg-muted"
              >
                <div className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg">
                  <img
                    src={item.drama.poster}
                    alt={item.drama.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <Play className="h-6 w-6 fill-foreground text-foreground" />
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-center">
                  <h3 className="line-clamp-1 font-medium text-foreground">
                    {item.drama.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Episode {item.episodeNumber}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {formatDistanceToNow(item.watchedAt, { addSuffix: true })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
