import { useState } from "react";
import { FAQS } from "../data/content";

export default function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="ff-section">
      <div className="ff-faq-grid">
        <div className="ff-faq-sticky" data-reveal="left">
          <div className="ff-kicker">06 — Before you ask</div>
          <h2 className="ff-heading">The questions buyers open with</h2>
          <p className="ff-lede" style={{ maxWidth: "34ch", marginTop: 18 }}>
            If yours isn&apos;t here, our technical desk answers within one working day.
          </p>
        </div>
        <div className="ff-faq-list" data-reveal="right">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className={`ff-faq-item${isOpen ? " is-open" : ""}`}>
                <button type="button" aria-expanded={isOpen} className="ff-faq-question" onClick={() => setOpen(isOpen ? -1 : i)}>
                  <span className="ff-faq-question-text">{f.q}</span>
                  <span className="ff-faq-icon" />
                </button>
                <div className="ff-faq-panel">
                  <div className="ff-faq-panel-inner">
                    <p>{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
