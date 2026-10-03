import { useState, useEffect, RefObject } from "react";
import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaybackSpeedControlProps {
  videoRef: RefObject<HTMLVideoElement>;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function PlaybackSpeedControl({ videoRef }: PlaybackSpeedControlProps) {
  const [speed, setSpeed] = useState(1);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Sync initial speed
    setSpeed(video.playbackRate);

    const handleRateChange = () => {
      setSpeed(video.playbackRate);
    };

    video.addEventListener("ratechange", handleRateChange);
    return () => video.removeEventListener("ratechange", handleRateChange);
  }, [videoRef]);

  const handleSpeedChange = (newSpeed: number) => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = newSpeed;
      setSpeed(newSpeed);
    }
    setShowOptions(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="flex items-center gap-1.5 rounded-lg bg-background/80 px-3 py-2 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-background"
      >
        <Gauge className="h-4 w-4" />
        <span>{speed}x</span>
      </button>

      {showOptions && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowOptions(false)} 
          />
          <div className="absolute bottom-full right-0 z-50 mb-2 overflow-hidden rounded-lg bg-background/95 shadow-lg backdrop-blur-sm">
            {SPEED_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => handleSpeedChange(option)}
                className={cn(
                  "block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-muted",
                  speed === option && "bg-primary text-primary-foreground"
                )}
              >
                {option}x
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
