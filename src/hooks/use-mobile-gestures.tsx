import { useEffect, useRef, useCallback, useState } from "react";

interface GestureHandlers {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onDoubleTapLeft?: () => void;
  onDoubleTapRight?: () => void;
  onLongPressStart?: () => void;
  onLongPressEnd?: () => void;
}

interface GestureState {
  isLongPressing: boolean;
  gestureText: string | null;
}

export function useMobileGestures(
  containerRef: React.RefObject<HTMLElement>,
  handlers: GestureHandlers,
  enabled: boolean = true
): GestureState {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<{ x: number; time: number }>({ x: 0, time: 0 });
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [gestureText, setGestureText] = useState<string | null>(null);

  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  const showGestureText = useCallback((text: string) => {
    setGestureText(text);
    setTimeout(() => setGestureText(null), 800);
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || !isMobile) return;

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    // Start long press timer
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressing(true);
      handlers.onLongPressStart?.();
      showGestureText("1.5x Speed");
    }, 500);
  }, [enabled, isMobile, handlers, showGestureText]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !isMobile || !touchStartRef.current) return;

    // Cancel long press on movement
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, [enabled, isMobile]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || !isMobile) return;

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // End long press
    if (isLongPressing) {
      setIsLongPressing(false);
      handlers.onLongPressEnd?.();
      touchStartRef.current = null;
      return;
    }

    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    const minSwipeDistance = 50;
    const maxSwipeTime = 300;

    // Detect double tap
    const now = Date.now();
    const doubleTapMaxTime = 300;
    if (deltaTime < 200 && Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20) {
      const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
      const tapX = touch.clientX;
      const isLeftSide = tapX < containerWidth / 2;

      if (now - lastTapRef.current.time < doubleTapMaxTime) {
        if (isLeftSide) {
          handlers.onDoubleTapLeft?.();
          showGestureText("-10s");
        } else {
          handlers.onDoubleTapRight?.();
          showGestureText("+10s");
        }
        lastTapRef.current = { x: 0, time: 0 };
      } else {
        lastTapRef.current = { x: tapX, time: now };
      }
    }

    // Detect swipes
    if (deltaTime < maxSwipeTime) {
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          handlers.onSwipeRight?.();
          showGestureText("+10s");
        } else {
          handlers.onSwipeLeft?.();
          showGestureText("-10s");
        }
      } else if (Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY > 0) {
          handlers.onSwipeDown?.();
          showGestureText("Volume -");
        } else {
          handlers.onSwipeUp?.();
          showGestureText("Volume +");
        }
      }
    }

    touchStartRef.current = null;
  }, [enabled, isMobile, handlers, isLongPressing, containerRef, showGestureText]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled || !isMobile) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [containerRef, enabled, isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { isLongPressing, gestureText };
}
