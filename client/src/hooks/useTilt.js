import { useEffect, useRef } from "react";

// Subtle pointer-driven 3D tilt (CSS transform, no WebGL) for a product
// image frame — perspective + rotateX/rotateY proportional to pointer
// position within the element, eased back to flat on leave. Skipped for
// touch pointers and reduced-motion users, same convention as useMagnetic.
export function useTilt({ max = 8, scale = 1.015 } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const el = ref.current;
    if (!el) return undefined;

    const onMove = (ev) => {
      if (ev.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      const px = (ev.clientX - r.left) / r.width - 0.5;
      const py = (ev.clientY - r.top) / r.height - 0.5;
      el.style.transition = "transform 120ms linear";
      el.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`;
    };
    const onLeave = () => {
      el.style.transition = "transform 620ms cubic-bezier(0.2,1,0.3,1)";
      el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [max, scale]);

  return ref;
}
