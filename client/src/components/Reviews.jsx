import { useRef } from "react";
import { REVIEWS, SHORT_REVIEWS } from "../data/content";

function Stars({ count }) {
  return (
    <div className="ff-review-stars">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={i < count ? "#8c7c5e" : "transparent"}
          stroke="#8c7c5e"
          strokeWidth="1.5"
          strokeLinejoin="round"
        >
          <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
        </svg>
      ))}
    </div>
  );
}

// PHASE 6 — "smooth carousel, horizontal drag where appropriate": the
// marquee's own ambient auto-scroll (CSS animation on .ff-reviews-marquee-
// track, unchanged) keeps running; dragging pauses it and applies a
// separate static offset on a wrapping element, so releasing resumes the
// ambient motion from wherever its own animation timeline already was
// rather than jumping. Direct DOM mutation (not React state) for the drag
// offset — this fires on every pointermove, and re-rendering per pixel of
// drag would be wasteful, same convention as useMagnetic/useTilt.
function useMarqueeDrag() {
  const containerRef = useRef(null); // outer masked viewport — pointer handlers, never transformed
  const offsetRef = useRef(null); // gets the static drag offset
  const trackRef = useRef(null); // keeps its own auto-scroll keyframe animation, paused while dragging
  const state = useRef({ dragging: false, startX: 0, base: 0, offset: 0 });

  const onPointerDown = (ev) => {
    if (ev.pointerType === "touch") return; // native touch scroll/swipe is fine as-is
    const s = state.current;
    s.dragging = true;
    s.startX = ev.clientX;
    s.base = s.offset;
    containerRef.current?.classList.add("is-dragging");
    if (trackRef.current) trackRef.current.style.animationPlayState = "paused";
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
  };
  const onPointerMove = (ev) => {
    const s = state.current;
    if (!s.dragging) return;
    s.offset = s.base + (ev.clientX - s.startX);
    if (offsetRef.current) offsetRef.current.style.transform = `translate3d(${s.offset}px, 0, 0)`;
  };
  const endDrag = () => {
    const s = state.current;
    if (!s.dragging) return;
    s.dragging = false;
    containerRef.current?.classList.remove("is-dragging");
    if (trackRef.current) trackRef.current.style.animationPlayState = "running";
  };

  return { containerRef, offsetRef, trackRef, onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerLeave: endDrag };
}

export default function Reviews() {
  const runs = [SHORT_REVIEWS, SHORT_REVIEWS];
  const drag = useMarqueeDrag();

  return (
    <section id="reviews" className="ff-section" style={{ overflow: "hidden" }}>
      <div className="ff-reviews-head" data-reveal="blur">
        <div className="ff-reviews-rule-row">
          <span className="ff-reviews-rule" />
          <span className="ff-kicker">05 — Kind words</span>
          <span className="ff-reviews-rule" />
        </div>
        <h2 className="ff-heading" style={{ fontSize: "clamp(32px, 4.4vw, 66px)" }}>
          What our clients say
        </h2>
        <p className="ff-reviews-lede">Unedited feedback from mills running our counts every month.</p>
      </div>

      <div className="ff-reviews-grid">
        {REVIEWS.map((r) => (
          <article key={r.name} className="ff-review-card" data-reveal="up">
            <i className="corner tl" />
            <i className="corner tr" />
            <i className="corner bl" />
            <i className="corner br" />
            <div className="ff-review-top">
              <Stars count={r.stars} />
              <span className="ff-review-quote-mark">&rdquo;</span>
            </div>
            <p className="ff-review-text">{r.text}</p>
            <div className="ff-review-footer">
              <span className="ff-review-initials">{r.initials}</span>
              <span>
                <span className="ff-review-name">{r.name}</span>
                <span className="ff-review-meta">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8c7c5e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M8.5 12.4l2.4 2.4 4.6-4.8" />
                  </svg>
                  <span>{r.meta}</span>
                </span>
              </span>
            </div>
          </article>
        ))}
      </div>

      <div
        ref={drag.containerRef}
        className="ff-reviews-marquee"
        onPointerDown={drag.onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onPointerLeave={drag.onPointerLeave}
      >
        <div ref={drag.offsetRef} className="ff-reviews-marquee-offset">
          <div ref={drag.trackRef} className="ff-reviews-marquee-track">
            {runs.map((run, i) => (
              <div className="ff-reviews-marquee-run" key={i}>
                {run.map((r, j) => (
                  <article className="ff-mini-review blueprint" key={`${r.name}-${j}`}>
                    <i className="corner tl" />
                    <i className="corner tr" />
                    <i className="corner bl" />
                    <i className="corner br" />
                    <Stars count={r.stars} />
                    <p className="ff-mini-review-text">&ldquo;{r.text}&rdquo;</p>
                    <div className="ff-mini-review-name">{r.name}</div>
                    <div className="ff-mini-review-meta">{r.meta}</div>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
