import { Link } from "react-router-dom";
import { Bell, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface EpisodeAlert {
  dramaId: string;
  dramaTitle: string;
  poster: string;
  newEpisodeCount: number;
  previousCount: number;
}

interface EpisodeAlertBannerProps {
  alerts: EpisodeAlert[];
  onDismiss: (dramaId: string) => void;
  onDismissAll: () => void;
}

export function EpisodeAlertBanner({
  alerts,
  onDismiss,
  onDismissAll,
}: EpisodeAlertBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed left-4 right-4 top-4 z-50 space-y-2 animate-slide-in-right">
      {alerts.slice(0, 3).map((alert) => (
        <div
          key={alert.dramaId}
          className={cn(
            "glass-card flex items-center gap-3 rounded-xl p-3",
            "shadow-lg"
          )}
        >
          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
            <img
              src={alert.poster}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              <Bell className="h-3 w-3" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              New Episode Available!
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {alert.dramaTitle} • Ep {alert.newEpisodeCount}
            </p>
          </div>

          <Link
            to={`/drama/${alert.dramaId}`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>

          <button
            onClick={() => onDismiss(alert.dramaId)}
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      {alerts.length > 1 && (
        <button
          onClick={onDismissAll}
          className="w-full rounded-lg bg-muted/50 py-2 text-center text-xs text-muted-foreground hover:bg-muted"
        >
          Dismiss all ({alerts.length} notifications)
        </button>
      )}
    </div>
  );
}
