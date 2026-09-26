import { useEffect, useState } from "react";

// Reports whether the returned ref's element is anywhere near the viewport
// (a generous rootMargin, not exact visibility) via IntersectionObserver.
// Used to gate expensive always-on work — specifically the two R3F
// canvases' frameloop (PHASE 11: "unnecessary WebGL canvases... animation
// loops") — rather than burning GPU/battery rendering a scene nobody is
// looking at.
export function useInView(ref, { rootMargin = "200px 0px" } = {}) {
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);

  return inView;
}
