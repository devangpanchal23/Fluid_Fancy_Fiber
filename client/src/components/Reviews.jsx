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

export default function Reviews() {
  const runs = [SHORT_REVIEWS, SHORT_REVIEWS];

  return (
    <section id="reviews" className="ff-section" style={{ overflow: "hidden" }}>
      <div className="ff-reviews-head" data-reveal="up">
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

      <div className="ff-reviews-marquee">
        <div className="ff-reviews-marquee-track">
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
    </section>
  );
}
