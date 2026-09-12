export default function BackToTop({ visible }) {
  return (
    <button
      type="button"
      aria-label="Back to top"
      className={`ff-top-btn${visible ? " is-visible" : ""}`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#17140f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M6 11l6-6 6 6" />
      </svg>
    </button>
  );
}
