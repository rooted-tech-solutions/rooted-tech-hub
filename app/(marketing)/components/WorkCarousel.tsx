"use client";

import { useCallback, useEffect, useRef, useState, type FocusEvent, type WheelEvent } from "react";
import type { WorkItem } from "@/content/work";

const ADVANCE_MS = 7000;
/** A manual scroll or touch holds off auto-advance for this long. */
const RESUME_MS = 12000;

/**
 * Horizontal, auto-advancing case-study rail.
 *
 * The track is a real scroll container (snap-x), so a trackpad swipe or touch
 * drag behaves exactly as the visitor expects and the browser owns the physics.
 * Auto-advance runs only while the rail is on screen, un-hovered, un-focused,
 * and the visitor has not just moved it themselves — and never under
 * prefers-reduced-motion. The explicit pause button is not optional: content
 * that moves on its own for more than five seconds needs one (WCAG 2.2.2).
 */
export default function WorkCarousel({ items }: { items: readonly WorkItem[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const programmatic = useRef(false);
  const resumeTimer = useRef<number | null>(null);

  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [inView, setInView] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const count = items.length;
  const autoplaying =
    count > 1 && inView && !userPaused && !hovered && !focused && !interacting && !reducedMotion;

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(
    () => () => {
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    },
    [],
  );

  const padLeft = (track: HTMLElement) => parseFloat(getComputedStyle(track).paddingLeft) || 0;

  const scrollToIndex = useCallback((i: number) => {
    const track = trackRef.current;
    const slide = track?.children[i] as HTMLElement | undefined;
    if (!track || !slide) return;
    programmatic.current = true;
    track.scrollTo({ left: slide.offsetLeft - padLeft(track), behavior: "smooth" });
    window.setTimeout(() => {
      programmatic.current = false;
    }, 700);
  }, []);

  const noteInteraction = useCallback(() => {
    setInteracting(true);
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setInteracting(false), RESUME_MS);
  }, []);

  /** Keep `index` in step with wherever the track actually is. */
  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const x = track.scrollLeft + padLeft(track);
    let best = 0;
    let bestDist = Infinity;
    Array.from(track.children).forEach((el, i) => {
      const d = Math.abs((el as HTMLElement).offsetLeft - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setIndex(best);
    if (!programmatic.current) noteInteraction();
  };

  /** Only a sideways wheel counts — scrolling the page past the rail should not pause it. */
  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) noteInteraction();
  };

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
  };

  useEffect(() => {
    if (!autoplaying) return;
    const id = window.setInterval(() => scrollToIndex((indexRef.current + 1) % count), ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [autoplaying, count, scrollToIndex]);

  const go = (i: number) => {
    noteInteraction();
    scrollToIndex((i + count) % count);
  };

  const controlClass =
    "inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white ring-1 ring-white/15 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-site-mint/70 disabled:opacity-40";

  return (
    <div
      ref={rootRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={onBlur}
    >
      {/*
        Left padding lines the first card up with the max-w-6xl container above
        it, while the rail itself bleeds to the viewport edge. 72rem = max-w-6xl;
        2rem = the container's lg:px-8. Percentages here are of the section,
        which excludes the scrollbar, so the alignment is exact.
      */}
      <div
        ref={trackRef}
        role="group"
        aria-roledescription="carousel"
        aria-label="Recent work"
        aria-live={autoplaying ? "off" : "polite"}
        tabIndex={0}
        onScroll={onScroll}
        onWheel={onWheel}
        onPointerDown={noteInteraction}
        onTouchStart={noteInteraction}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 scroll-px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-site-mint/60 lg:px-[max(2rem,calc((100%_-_72rem)_/_2_+_2rem))] lg:scroll-px-[max(2rem,calc((100%_-_72rem)_/_2_+_2rem))]"
      >
        {items.map((item, i) => (
          <div
            key={item.title}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            className="w-full shrink-0 snap-start rounded-3xl bg-white/[0.06] p-7 ring-1 ring-white/10 sm:p-9 lg:p-11"
          >
            <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
              <div>
                <p className="font-mono text-sm text-white/40">
                  {String(i + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
                </p>
                <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-white/45">{item.client}</p>
                <h3 className="mt-3 text-2xl font-bold leading-snug text-white sm:text-3xl">{item.title}</h3>
                {item.tags && item.tags.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-medium text-white/85 ring-1 ring-white/15"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {item.problem && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/45">The problem</p>
                    <p className="mt-2 text-[15px] leading-relaxed text-white/70 sm:text-base">{item.problem}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-site-mint">What we built</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-white/85 sm:text-base">{item.built}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="mx-auto mt-8 flex max-w-6xl items-center justify-between gap-6 px-6 lg:px-8">
          <div className="flex items-center gap-2" aria-label="Choose a project">
            {items.map((item, i) => (
              <button
                key={item.title}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to ${item.title}`}
                aria-current={i === index ? "true" : undefined}
                className={`h-2 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-site-mint/70 ${
                  i === index ? "w-8 bg-site-mint" : "w-2 bg-white/25 hover:bg-white/50"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!reducedMotion && (
              <button
                type="button"
                onClick={() => setUserPaused((p) => !p)}
                aria-pressed={userPaused}
                aria-label={userPaused ? "Resume auto-advance" : "Pause auto-advance"}
                className={controlClass}
              >
                {userPaused ? (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
                  </svg>
                )}
              </button>
            )}
            <button type="button" onClick={() => go(index - 1)} aria-label="Previous project" className={controlClass}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button type="button" onClick={() => go(index + 1)} aria-label="Next project" className={controlClass}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
