import { CASE_METRICS } from "../data/content";
import { images } from "../assets/images";

export default function Proof() {
  return (
    <section id="proof" className="ff-section ff-section--alt">
      <div className="ff-container">
        <div className="ff-kicker" data-reveal="up">
          05 — Proof
        </div>
        <div className="ff-proof-grid">
          <div data-reveal="up">
            <h2 className="ff-heading" style={{ margin: 0 }}>
              A 40-tonne shirting programme, zero shade rejections
            </h2>
            <p style={{ margin: "20px 0 0", maxWidth: "48ch", fontSize: 15, lineHeight: 1.74, color: "var(--ff-body)" }}>
              A European shirting mill was losing weaving hours to count variation across suppliers. We took the
              programme onto four dedicated lines, fixed the clearer settings per lot and shipped against a single
              reference cone.
            </p>
            <div className="ff-proof-metrics">
              {CASE_METRICS.map((m) => (
                <div key={m.k}>
                  <div className="ff-proof-metric-value">{m.v}</div>
                  <div className="ff-proof-metric-label">{m.k}</div>
                </div>
              ))}
            </div>
          </div>

          <div data-reveal="up">
            <figure className="ff-proof-figure">
              <i className="corner tl" />
              <i className="corner tr" />
              <i className="corner bl" />
              <i className="corner br" />
              <img src={images.mill} alt="Shirting programme warp beam" />
            </figure>
            <div className="ff-proof-caption">
              <span>Dedicated lines 03–06</span>
              <span>Fig. 07</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
