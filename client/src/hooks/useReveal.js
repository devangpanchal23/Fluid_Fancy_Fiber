import { useEffect } from "react";

// Fades/slides [data-reveal] elements into view as they cross the viewport,
// staggering siblings, mirroring the original canvas site's scroll reveals.
//
// [data-reveal] elements start at opacity 0, so every one of them must be
// picked up — including ones React renders *after* this effect first runs
// (anything that appears after an API fetch, e.g. the People section). A
// MutationObserver watches for those late arrivals; without it they stay
// invisible forever.
export function useReveal(containerRef, deps = []) {
  useEffect(() => {
    const root = containerRef?.current || document;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const io = reduceMotion
      ? null
      : new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              const el = entry.target;
              const siblings = Array.from(el.parentElement?.children || []).filter((n) =>
                n.hasAttribute?.("data-reveal")
              );
              const i = Math.max(0, siblings.indexOf(el));
              el.style.transitionDelay = `${i * 90}ms`;
              el.classList.add("is-visible");
              io.unobserve(el);
            });
          },
          { threshold: 0.12, rootMargin: "0px 0px -7% 0px" }
        );

    const seen = new WeakSet();
    const timers = new Set();

    function track(el) {
      if (seen.has(el) || el.classList.contains("is-visible")) return;
      seen.add(el);
      if (!io) {
        el.classList.add("is-visible");
        return;
      }
      io.observe(el);
      // Safety net so nothing can stay hidden if the observer never fires.
      const t = setTimeout(() => {
        el.classList.add("is-visible");
        io.unobserve(el);
        timers.delete(t);
      }, 2600);
      timers.add(t);
    }

    function trackTree(node) {
      if (node.nodeType !== 1) return;
      if (node.hasAttribute("data-reveal")) track(node);
      node.querySelectorAll?.("[data-reveal]").forEach(track);
    }

    root.querySelectorAll("[data-reveal]").forEach(track);

    const mo = new MutationObserver((mutations) => {
      mutations.forEach((m) => m.addedNodes.forEach(trackTree));
    });
    mo.observe(root === document ? document.body : root, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io?.disconnect();
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
