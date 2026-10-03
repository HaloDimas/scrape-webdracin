import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Play, X } from "lucide-react";
import { getContinueWatching, ContinueWatching } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function QuickResumeButton() {
  const [continueItem, setContinueItem] = useState<ContinueWatching | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const location = useLocation();

  const isWatchPage = location.pathname.startsWith("/watch");

  useEffect(() => {
    const items = getContinueWatching();
    const latest = items[0] || null;
    setContinueItem(latest);
    setDismissed(false);

    if (latest && !isWatchPage) {
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [location, isWatchPage]);

  useEffect(() => {
    if (visible && !dismissed) {
      const hideTimer = setTimeout(() => setVisible(false), 10000);
      return () => clearTimeout(hideTimer);
    }
  }, [visible, dismissed]);

  if (!continueItem || isWatchPage || dismissed || !visible) {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissed(true);
    setVisible(false);
  };

  const resumeUrl = `/watch/${continueItem.source}/${continueItem.dramaId}/${continueItem.episodeId}?t=${continueItem.timestamp}`;

  return (
    <Link
      to={resumeUrl}
      className={cn(
        "fixed bottom-24 right-4 z-40 flex items-center gap-3",
        "rounded-full bg-primary pl-1.5 pr-4 py-1.5",
        "shadow-lg shadow-primary/30 transition-all duration-300",
        "hover:scale-105 hover:shadow-xl animate-scale-in",
        "max-w-[300px]"
      )}
    >
      <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border-2 border-primary-foreground/20">
        <img
          src={continueItem.drama.poster}
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-background/40">
          <Play className="h-3.5 w-3.5 fill-primary-foreground text-primary-foreground" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-primary-foreground">
          Continue Watching
        </p>
        <p className="truncate text-[11px] text-primary-foreground/80">
          {continueItem.drama.title} • Ep {continueItem.episodeNumber}
        </p>
      </div>

      <button
        onClick={handleDismiss}
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-foreground/20 transition-colors hover:bg-primary-foreground/30"
      >
        <X className="h-3 w-3 text-primary-foreground" />
      </button>
    </Link>
  );
}
