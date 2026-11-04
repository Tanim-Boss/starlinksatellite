import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { cn } from "@/utils/cn";
import { useReducedMotion } from "@/lib/useMediaQuery";
import { toBn } from "@/lib/format";
import { Button } from "./primitives";

/**
 * The step machine behind every animation in the lab.
 *
 * Nothing autoplays on mount: a visitor reads the explanation first, then
 * presses start. Play advances one step per interval; the previous/next
 * buttons and a click on the step list move by hand, which is also how the
 * lesson works with `prefers-reduced-motion` (the CSS transitions switch off,
 * the steps still advance).
 */
export interface StepPlayer {
  index: number;
  total: number;
  playing: boolean;
  finished: boolean;
  reduced: boolean;
  start: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  next: () => void;
  prev: () => void;
  go: (i: number) => void;
}

export function useStepPlayer(total: number, intervalMs = 2800): StepPlayer {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const reduced = useReducedMotion();
  const timer = useRef<number | undefined>(undefined);

  const clear = useCallback(() => {
    if (timer.current !== undefined) {
      window.clearInterval(timer.current);
      timer.current = undefined;
    }
  }, []);

  const go = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(total - 1, next));
      setIndex(clamped);
      setFinished(clamped === total - 1);
    },
    [total],
  );

  const pause = useCallback(() => {
    clear();
    setPlaying(false);
  }, [clear]);

  const start = useCallback(() => {
    // Restarting from the end begins again from the first step.
    setIndex((current) => (current >= total - 1 ? 0 : current));
    setFinished(false);
    setPlaying(true);
  }, [total]);

  const reset = useCallback(() => {
    clear();
    setPlaying(false);
    setIndex(0);
    setFinished(false);
  }, [clear]);

  const next = useCallback(() => {
    setIndex((current) => {
      if (current >= total - 1) {
        clear();
        setPlaying(false);
        setFinished(true);
        return current;
      }
      return current + 1;
    });
  }, [clear, total]);

  const prev = useCallback(() => {
    setFinished(false);
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  // Autoplay. Reading the ref-free state through the callback form keeps one
  // interval alive for the whole run instead of restarting it every step.
  useEffect(() => {
    if (!playing) return;
    clear();
    timer.current = window.setInterval(next, intervalMs);
    return clear;
  }, [playing, intervalMs, next, clear]);

  useEffect(() => clear, [clear]);

  return {
    index,
    total,
    playing,
    finished,
    reduced,
    start,
    pause,
    toggle: () => (playing ? pause() : start()),
    reset,
    next,
    prev,
    go,
  };
}

export function StepControls({
  player,
  className,
  label = "সিমুলেশন",
}: {
  player: StepPlayer;
  className?: string;
  label?: string;
}) {
  const { index, total, playing, finished } = player;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3",
        className,
      )}
    >
      <Button
        variant="primary"
        onClick={player.toggle}
        ariaLabel={playing ? `${label} থামাও` : `${label} চালু করো`}
        icon={playing ? <Pause size={13} /> : <Play size={13} />}
      >
        {playing ? "থামাও" : finished ? "আবার চালাও" : "চালু করো"}
      </Button>
      <Button
        variant="ghost"
        onClick={player.prev}
        disabled={index === 0}
        ariaLabel="আগের ধাপে যাও"
        icon={<SkipBack size={13} />}
      >
        আগের ধাপ
      </Button>
      <Button
        variant="ghost"
        onClick={player.next}
        disabled={index >= total - 1}
        ariaLabel="পরের ধাপে যাও"
        icon={<SkipForward size={13} />}
      >
        পরের ধাপ
      </Button>
      <Button
        variant="quiet"
        onClick={player.reset}
        ariaLabel={`${label} রিসেট করো`}
        icon={<RotateCcw size={13} />}
      >
        রিসেট
      </Button>

      <p
        className="bangla ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-faint"
        aria-live="polite"
      >
        ধাপ {toBn(index + 1)} / {toBn(total)}
        {player.reduced && <span className="ml-2 text-warn">· motion কমিয়ে দেওয়া হয়েছে</span>}
      </p>
    </div>
  );
}
