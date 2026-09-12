import { useEffect, useRef, useState } from "react";

// Eases 0 -> each target once the ref's element becomes visible.
export function useCountUp(targets, { duration = 1000 } = {}) {
  const [counts, setCounts] = useState(targets.map(() => 0));
  const ref = useRef(null);
  const started = useRef(false);
  const rafRef = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const run = () => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();
      const tick = (t) => {
        const k = Math.min(1, (t - start) / duration);
        const eased = 1 - (1 - k) ** 3;
        setCounts(targets.map((v) => Math.round(v * eased)));
        if (k < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            run();
            io.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets.join(","), duration]);

  return [ref, counts];
}
