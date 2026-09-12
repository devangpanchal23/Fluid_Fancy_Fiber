import { useEffect } from "react";

// Applies a damped pointer-follow translate to [data-magnetic] elements,
// skipped for touch pointers and reduced-motion users.
export function useMagnetic(containerRef, deps = []) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const root = containerRef?.current || document;
    const magnets = Array.from(root.querySelectorAll("[data-magnetic]"));

    const cleanups = magnets.map((el) => {
      const onMove = (ev) => {
        if (ev.pointerType === "touch") return;
        const r = el.getBoundingClientRect();
        const dx = ev.clientX - (r.left + r.width / 2);
        const dy = ev.clientY - (r.top + r.height / 2);
        el.style.transition = "transform 110ms linear";
        el.style.transform = `translate(${(dx * 0.16).toFixed(2)}px, ${(dy * 0.26).toFixed(2)}px)`;
      };
      const onLeave = () => {
        el.style.transition = "transform 520ms cubic-bezier(0.2,1.25,0.35,1)";
        el.style.transform = "translate(0,0)";
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      return () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      };
    });

    return () => cleanups.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
