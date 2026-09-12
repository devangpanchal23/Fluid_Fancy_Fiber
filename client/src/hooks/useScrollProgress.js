import { useEffect, useState } from "react";

// Tracks scroll fraction (0-1), whether the page has scrolled past a shrink
// threshold, and whether it has scrolled far enough to show "back to top".
export function useScrollProgress({ shrinkAt = 90, topAt = 0.08 } = {}) {
  const [scroll, setScroll] = useState(0);
  const [shrink, setShrink] = useState(false);

  useEffect(() => {
    let raf = null;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const y = window.scrollY || 0;
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        setScroll(Math.min(1, y / max));
        setShrink(y > shrinkAt);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [shrinkAt]);

  return { scroll, shrink, showTop: scroll > topAt };
}
