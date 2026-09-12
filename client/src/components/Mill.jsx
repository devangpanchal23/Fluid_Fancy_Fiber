import { useEffect, useRef } from "react";
import { CREDENTIALS } from "../data/content";
import { images } from "../assets/images";

export default function Mill() {
  const wrapRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let raf = null;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const wrap = wrapRef.current;
        const img = imgRef.current;
        if (!wrap || !img) return;
        const r = wrap.getBoundingClientRect();
        const k = Math.max(-1, Math.min(1, (window.innerHeight - r.top) / (window.innerHeight + r.height)));
        // Clamp the shift to the image's own 16% (8% each side) height buffer
        // so it never translates far enough to expose the frame's edge.
        const maxShift = r.height * 0.08;
        const shift = Math.max(-maxShift, Math.min(maxShift, k * -36));
        img.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section id="mill" className="ff-section">
      <div className="ff-mill-grid">
        <div className="ff-mill-media" data-reveal="left">
          <figure className="ff-mill-frame">
            <i className="corner tl" />
            <i className="corner tr" />
            <i className="corner bl" />
            <i className="corner br" />
            <div ref={wrapRef} className="ff-mill-frame-inner">
              <img ref={imgRef} src={images.mill} alt="Cotton fibre and cones on the mill floor" />
            </div>
          </figure>
          <div className="ff-mill-badge">
            <i className="corner tl" />
            <i className="corner tr" />
            <i className="corner bl" />
            <i className="corner br" />
            <div className="ff-mill-badge-title">Woman-led</div>
            <div className="ff-mill-badge-sub">Since 2005</div>
          </div>
        </div>
        <div className="ff-mill-copy" data-reveal="right">
          <div className="ff-kicker">03 — The mill</div>
          <h2 className="ff-heading">Run by people who can read a cone</h2>
          <p>
            Fluid Fancy Fibre was set up to remove the variable most mills quietly absorb: the batch that doesn't
            match the one before it. Our floor is led by women who came up through spinning, winding and quality,
            not through a spreadsheet.
          </p>
          <p>
            That shows up in small places — twist held inside tolerance across a 40-tonne run, clearer settings
            logged per programme, and a sample sent before the order, every time.
          </p>
          <div className="ff-credentials">
            {CREDENTIALS.map((c) => (
              <div className="ff-credential" key={c}>
                <span className="ff-credential-dot" />
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
