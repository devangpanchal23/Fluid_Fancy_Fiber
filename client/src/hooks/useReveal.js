import { useEffect } from "react";

// Fades/slides [data-reveal] elements into view as they cross the viewport,
// staggering siblings, mirroring the original canvas site's scroll reveals.
export function useReveal(containerRef, deps = []) {
  useEffect(() => {
    const root = containerRef?.current || document;
    const nodes = Array.from(root.querySelectorAll("[data-reveal]"));
    if (!nodes.length) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      nodes.forEach((el) => el.classList.add("is-visible"));
      return undefined;
    }

    const io = new IntersectionObserver(
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

    nodes.forEach((n) => io.observe(n));
    const fallback = setTimeout(() => {
      nodes.forEach((el) => el.classList.add("is-visible"));
      io.disconnect();
    }, 2600);

    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
