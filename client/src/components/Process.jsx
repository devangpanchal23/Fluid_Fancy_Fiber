import { useEffect, useRef, useState } from "react";
import { STEPS } from "../data/content";

// PHASE 6 — "as the user scrolls, the current step becomes active": tracks
// which step card is nearest the vertical center of the viewport (the
// step whose top has most recently crossed the midline), independent of
// the existing scroll-tied fill-line effect below.
function useActiveStep(count) {
  const [active, setActive] = useState(0);
  const refs = useRef([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const i = refs.current.indexOf(entry.target);
          if (i !== -1) setActive(i);
        });
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    refs.current.slice(0, count).forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [count]);

  return { active, refs };
}

export default function Process() {
  const lineRef = useRef(null);
  const { active, refs: stepRefs } = useActiveStep(STEPS.length);

  useEffect(() => {
    let raf = null;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const el = lineRef.current;
        if (!el) return;
        const r = el.parentElement.getBoundingClientRect();
        const k = Math.max(0, Math.min(1, (window.innerHeight * 0.85 - r.top) / (window.innerHeight * 0.55)));
        el.style.transform = `scaleX(${k.toFixed(3)})`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section id="process" className="ff-section ff-section--dark">
      <div className="ff-container">
        <div className="ff-section-head" data-reveal="up">
          <div>
            <div className="ff-kicker ff-kicker--dark">02 — Process</div>
            <h2 className="ff-heading">Bale to beam in five</h2>
          </div>
          <p className="ff-lede" style={{ maxWidth: "38ch", color: "rgba(244,240,232,0.66)" }}>
            Every stage is logged against the lot number, so a cone on your loom can be traced back to the bale it
            came from.
          </p>
        </div>

        <div className="ff-process-track">
          <div className="ff-process-line-bg" />
          <div ref={lineRef} className="ff-process-line-fill" />
          <div className="ff-process-grid">
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                ref={(el) => (stepRefs.current[i] = el)}
                className={`ff-process-step${active === i ? " is-active" : ""}`}
                data-reveal="up"
              >
                <span className="ff-process-dot" />
                <div className="ff-process-num">{step.num}</div>
                <h3 className="ff-process-title">{step.title}</h3>
                <p className="ff-process-body">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
