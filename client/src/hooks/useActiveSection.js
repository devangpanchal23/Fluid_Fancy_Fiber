import { useEffect, useState } from "react";

export function useActiveSection(ids, initial = ids[0]) {
  const [active, setActive] = useState(initial);
  const idsKey = ids.join(",");

  useEffect(() => {
    const sections = idsKey.split(",").map((id) => document.getElementById(id)).filter(Boolean);
    if (!sections.length) return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [idsKey]);

  return active;
}
