import { WHY_US } from "../data/content";
import Corners from "./Corners";

const ICONS = {
  consistency: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  trace: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h9a3.5 3.5 0 0 1 0 7H8a3.5 3.5 0 0 0 0 7h9" />
      <circle cx="4" cy="6" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="20" cy="20" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  ),
  sample: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  ),
  export: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h8l4 4v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M14 4v4h4" />
      <path d="M8.5 13.5h7M8.5 16.5h4.5" />
    </svg>
  )
};

export default function WhyUs() {
  return (
    <section id="why" className="ff-section ff-section--tight-top">
      <div className="ff-container">
        <div className="ff-section-head" data-reveal="up">
          <div>
            <div className="ff-kicker">Why mills choose us</div>
            <h2 className="ff-heading">Built to remove the variable</h2>
          </div>
          <p className="ff-lede">
            Four things every buyer asks us for before the first order — and every order after it.
          </p>
        </div>

        <div className="ff-why-grid">
          {WHY_US.map((item, i) => (
            <div
              key={item.id}
              className="ff-why-card blueprint"
              data-reveal="up"
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <Corners />
              <div className="ff-why-icon">{ICONS[item.id]}</div>
              <h3 className="ff-why-title">{item.title}</h3>
              <p className="ff-why-body">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
