import { useRef } from "react";
import { images } from "../assets/images";
import HeroCanvas from "../three/HeroCanvas";
import { useParallax } from "../hooks/useParallax";

export default function Hero({ onOpenModal }) {
  const imgRef = useRef(null);

  const frameRef = useParallax((k, r) => {
    const img = imgRef.current;
    if (!img) return;
    // Clamp the shift to the frame's own -8% inset buffer (see .ff-hero-frame-inner)
    // so the enlarged image never translates far enough to expose the frame edge.
    const maxShift = r.height * 0.08;
    const shift = Math.max(-maxShift, Math.min(maxShift, k * -46));
    img.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
  });

  return (
    <section id="top" className="ff-hero">
      <HeroCanvas />
      <div className="ff-container">
        <div className="ff-hero-eyebrow">
          <span className="ff-hero-rule" />
          <span className="ff-hero-eyebrow-text">Ring-spun yarn · Woman-led · Est. 2005</span>
        </div>

        <h1>
          <span className="ff-hero-line">
            <span style={{ animationDelay: "80ms" }}>Consistent</span>
          </span>
          <span className="ff-hero-line">
            <span style={{ animationDelay: "220ms" }}>to the last</span>
          </span>
          <span className="ff-hero-line">
            <span className="is-accent" style={{ animationDelay: "360ms" }}>
              metre.
            </span>
          </span>
        </h1>

        <div className="ff-hero-body">
          <p className="ff-hero-copy">
            Fluid Fancy Fibre spins mono, lino and specialty counts for mills that cannot afford a variable batch.
            Eleven lines, lot-level traceability, and a technician who signs off every cone before it ships.
          </p>
          <div className="ff-hero-actions">
            <a data-magnetic href="#catalogue" className="ff-btn ff-btn-primary blueprint">
              <i className="corner tl" />
              <i className="corner tr" />
              <i className="corner bl" />
              <i className="corner br" />
              <span>See the counts</span>
            </a>
            <button
              type="button"
              data-magnetic
              className="ff-btn ff-btn-ghost"
              onClick={() => onOpenModal("Request spec sheet")}
            >
              Request spec sheet
            </button>
          </div>
        </div>

        <figure ref={frameRef} className="ff-hero-frame">
          <i className="corner tl" />
          <i className="corner tr" />
          <i className="corner bl" />
          <i className="corner br" />
          <div ref={imgRef} className="ff-hero-frame-inner">
            <img src={images.hero} alt="Spinning frames with taut thread lines running to cones on the production floor" />
          </div>
          <div className="ff-hero-frame-shade" />
          <figcaption className="ff-hero-figcaption">
            <span>Unit 04 — Ring spinning hall</span>
            <span style={{ opacity: 0.72 }}>Fig. 01</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
