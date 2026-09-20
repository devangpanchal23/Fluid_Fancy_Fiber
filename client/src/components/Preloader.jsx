import { useEffect, useState } from "react";
import { images } from "../assets/images";

export default function Preloader({ onDone }) {
  const [pct, setPct] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Keep the page from scrolling behind the loader.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPct(100);
      setExiting(true);
      const t = setTimeout(() => {
        setHidden(true);
        onDone?.();
      }, 50);
      return () => clearTimeout(t);
    }

    const start = performance.now();
    const duration = 1100;
    let raf;
    const tick = (t) => {
      const k = Math.min(1, (t - start) / duration);
      setPct(Math.round(k * 100));
      if (k < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setTimeout(() => setExiting(true), 140);
        setTimeout(() => {
          setHidden(true);
          onDone?.();
        }, 1050);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (hidden) return null;

  return (
    <div className={`ff-preloader${exiting ? " is-exiting" : ""}`} role="status" aria-live="polite">
      <div className="ff-preloader-inner">
        <div className="ff-preloader-logo-wrap">
          <img className="ff-preloader-logo" src={images.logo} alt="Fluid Fancy Fibre LLP" />
        </div>
        <div className="ff-preloader-bar">
          <div className="ff-preloader-fill" style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
        <div className="ff-preloader-label">
          <span>Spinning up</span>
          <span className="ff-preloader-pct">{pct}%</span>
        </div>
      </div>
    </div>
  );
}
