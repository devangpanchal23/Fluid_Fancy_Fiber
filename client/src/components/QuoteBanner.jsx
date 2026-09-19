export default function QuoteBanner({ onOpenModal }) {
  return (
    <section id="quote-banner" className="ff-section ff-section--tight-bottom ff-quote-section">
      <div className="ff-container">
        <div className="ff-quote-banner" data-reveal="up">
          <i className="corner tl" />
          <i className="corner tr" />
          <i className="corner bl" />
          <i className="corner br" />
          <div className="ff-quote-banner-copy">
            <div className="ff-kicker">Next step</div>
            <h2 className="ff-heading">
              Ready to lock a count that doesn't drift?
            </h2>
            <p className="ff-lede">
              Send us the count, twist tolerance and volume — we'll confirm feasibility and quote against it within
              a working day.
            </p>
          </div>
          <div className="ff-quote-banner-actions">
            <button
              type="button"
              data-magnetic
              className="ff-btn ff-btn-primary blueprint"
              onClick={() => onOpenModal("Request a quote")}
            >
              <i className="corner tl" />
              <i className="corner tr" />
              <i className="corner bl" />
              <i className="corner br" />
              <span>Request a quote</span>
            </button>
            <a data-magnetic href="#contact" className="ff-btn ff-btn-ghost">
              Talk to export desk
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
