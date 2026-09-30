import { useEffect, useRef } from "react";
import { FACTORY_ADVANTAGES } from "../data/content";
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
              <img
                ref={imgRef}
                src={images.mill}
                alt="Fluid Fancy Fibre modern textile spinning machinery and factory floor"
              />
            </div>
          </figure>
          <div className="ff-mill-badge blueprint">
            <i className="corner tl" />
            <i className="corner tr" />
            <i className="corner bl" />
            <i className="corner br" />
            <div className="ff-mill-badge-title">Manufacturing</div>
            <div className="ff-mill-badge-sub">Fluid Fancy Fibre</div>
          </div>
        </div>

        <div className="ff-mill-copy" data-reveal="right">
          <div className="ff-kicker">03 — The factory</div>
          <h2 className="ff-heading">
            Built for quality.
            <br />
            Made for consistency.
          </h2>
          <p>
            At Fluid Fancy Fibre, quality starts inside the factory. Our production process, machinery and
            quality checks work together to make yarn that is consistent, reliable and ready for your
            production needs.
          </p>
          <p>
            From fibre preparation to spinning, winding and final checking, every stage is handled with
            care. We focus on stable production, clean yarn and consistent quality from one lot to the next.
          </p>

          <div className="ff-factory-panel blueprint">
            <i className="corner tl" />
            <i className="corner tr" />
            <i className="corner bl" />
            <i className="corner br" />
            {FACTORY_ADVANTAGES.map((adv) => (
              <div className="ff-factory-cell" key={adv.num}>
                <div className="ff-factory-cell-num">{adv.num}</div>
                <h3 className="ff-factory-cell-title">{adv.title}</h3>
                <p className="ff-factory-cell-desc">{adv.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
