import { useState, useEffect } from "react";
import { X, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Episode } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AutoPlayNextOverlayProps {
  nextEpisode: Episode | null;
  onPlay: () => void;
  onCancel: () => void;
  countdownSeconds?: number;
}

export function AutoPlayNextOverlay({
  nextEpisode,
  onPlay,
  onCancel,
  countdownSeconds = 10,
}: AutoPlayNextOverlayProps) {
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (cancelled || !nextEpisode) return;

    if (countdown <= 0) {
      onPlay();
      return;
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, cancelled, nextEpisode, onPlay]);

  if (!nextEpisode || cancelled) return null;

  const handleCancel = () => {
    setCancelled(true);
    onCancel();
  };

  const progress = ((countdownSeconds - countdown) / countdownSeconds) * 100;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="text-center">
        <p className="mb-2 text-sm text-muted-foreground">Up Next</p>
        <h3 className="mb-4 text-xl font-bold text-foreground">
          Episode {nextEpisode.number}
        </h3>

        {/* Countdown circle */}
        <div className="relative mx-auto mb-6 h-24 w-24">
          <svg className="h-full w-full -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="44"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="4"
            />
            <circle
              cx="48"
              cy="48"
              r="44"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-foreground">{countdown}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="lg"
            onClick={handleCancel}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button size="lg" onClick={onPlay} className="gap-2">
            <Play className="h-4 w-4 fill-current" />
            Play Now
          </Button>
        </div>
      </div>
    </div>
  );
}
