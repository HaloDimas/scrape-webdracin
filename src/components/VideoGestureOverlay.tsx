import { cn } from "@/lib/utils";

interface VideoGestureOverlayProps {
  text: string | null;
}

export function VideoGestureOverlay({ text }: VideoGestureOverlayProps) {
  if (!text) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div
        className={cn(
          "rounded-xl bg-background/80 px-6 py-3 backdrop-blur-sm",
          "animate-scale-in"
        )}
      >
        <span className="text-lg font-bold text-foreground">{text}</span>
      </div>
    </div>
  );
}
