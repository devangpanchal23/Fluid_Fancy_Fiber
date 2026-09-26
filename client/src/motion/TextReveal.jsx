import { useEffect, useRef, useState } from "react";

// Word-by-word mask reveal for short headings/statements. Kept separate
// from the block-level [data-reveal] system (Reveal.jsx) because it needs
// per-word stagger timing, not per-sibling — a single heading is one
// [data-reveal] element as far as that system is concerned.
export default function TextReveal({ as: As = "span", text, className = "", wordDelay = 45 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return undefined;
    }
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const words = text.split(" ");

  return (
    <As ref={ref} className={`ff-text-reveal ${className}`.trim()}>
      {words.map((word, i) => (
        <span className="ff-text-reveal-mask" key={`${word}-${i}`}>
          <span
            className={`ff-text-reveal-word${visible ? " is-visible" : ""}`}
            style={{ transitionDelay: `${i * wordDelay}ms` }}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        </span>
      ))}
    </As>
  );
}
