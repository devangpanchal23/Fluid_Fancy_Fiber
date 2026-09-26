import { useEffect, useRef } from "react";

// Calls `onProgress(k)` on every scroll frame with how far the returned ref's
// element has crossed the viewport, normalized to roughly -1 (below) .. 0
// (centered) .. 1 (above). Deliberately imperative (a callback, not state) —
// this is meant to be dropped into many sections at once, and re-rendering
// a component on every scroll tick would defeat the purpose. Callers mutate
// DOM/style directly inside `onProgress`, the same pattern the hero's photo
// parallax already used before this was pulled out into a shared hook.
// No-ops (never calls onProgress) for reduced-motion users.
export function useParallax(onProgress) {
  const ref = useRef(null);
  const callbackRef = useRef(onProgress);
  callbackRef.current = onProgress;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let raf = null;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const k = Math.max(-1, Math.min(1, (window.innerHeight - r.top) / (window.innerHeight + r.height)));
        callbackRef.current?.(k, r);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return ref;
}
