import { useCallback, useEffect, useRef, useState } from "react";
import { SLIDE_AUTO_MS } from "../data/slides";

export type SlideDirection = "forward" | "back";

export interface UseSlideDeckOptions {
  total: number;
  autoAdvance?: boolean;
  autoMs?: number;
  onComplete?: () => void;
}

export interface SlideDeckState {
  index: number;
  targetIndex: number | null;
  direction: SlideDirection;
  isAnimating: boolean;
  progress: number;
  goTo: (next: number) => void;
  next: () => void;
  prev: () => void;
  pause: () => void;
  resume: () => void;
  paused: boolean;
}

export function useSlideDeck({
  total,
  autoAdvance = true,
  autoMs = SLIDE_AUTO_MS,
  onComplete,
}: UseSlideDeckOptions): SlideDeckState {
  const [index, setIndex] = useState(0);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<SlideDirection>("forward");
  const [isAnimating, setIsAnimating] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRaf = useRef<number | null>(null);
  const progressStart = useRef(0);

  const clearAnimTimer = useCallback(() => {
    if (animTimer.current) {
      clearTimeout(animTimer.current);
      animTimer.current = null;
    }
  }, []);

  const stopProgress = useCallback(() => {
    if (progressRaf.current !== null) {
      cancelAnimationFrame(progressRaf.current);
      progressRaf.current = null;
    }
  }, []);

  const goTo = useCallback(
    (next: number) => {
      if (isAnimating || next === index || next < 0 || next >= total) {
        if (next >= total) {
          onComplete?.();
        }
        return;
      }

      clearAnimTimer();
      stopProgress();
      setDirection(next > index ? "forward" : "back");
      setTargetIndex(next);
      setIsAnimating(true);
      setProgress(0);

      animTimer.current = setTimeout(() => {
        setIndex(next);
        setTargetIndex(null);
        setIsAnimating(false);
        if (next >= total - 1) {
          onComplete?.();
        }
      }, 420);
    },
    [clearAnimTimer, index, isAnimating, onComplete, stopProgress, total],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  useEffect(() => {
    if (!autoAdvance || paused || isAnimating) {
      stopProgress();
      return;
    }

    progressStart.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - progressStart.current;
      setProgress(Math.min(1, elapsed / autoMs));
      if (elapsed >= autoMs) {
        next();
        return;
      }
      progressRaf.current = requestAnimationFrame(tick);
    };
    progressRaf.current = requestAnimationFrame(tick);

    return stopProgress;
  }, [autoAdvance, autoMs, index, isAnimating, next, paused, stopProgress]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
        event.preventDefault();
        next();
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        prev();
      }
      if (event.key === "Home") {
        event.preventDefault();
        goTo(0);
      }
      if (event.key === "End") {
        event.preventDefault();
        goTo(total - 1);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, next, prev, total]);

  useEffect(() => {
    const onTouchStart = (event: TouchEvent) => {
      touchStartX.current = event.touches[0]?.clientX ?? null;
    };
    const onTouchEnd = (event: TouchEvent) => {
      const start = touchStartX.current;
      if (start === null) {
        return;
      }
      const end = event.changedTouches[0]?.clientX ?? start;
      const delta = end - start;
      if (Math.abs(delta) > 48) {
        if (delta < 0) {
          next();
        } else {
          prev();
        }
      }
      touchStartX.current = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [next, prev]);

  useEffect(
    () => () => {
      clearAnimTimer();
      stopProgress();
    },
    [clearAnimTimer, stopProgress],
  );

  return {
    index,
    targetIndex,
    direction,
    isAnimating,
    progress,
    goTo,
    next,
    prev,
    pause,
    resume,
    paused,
  };
}
