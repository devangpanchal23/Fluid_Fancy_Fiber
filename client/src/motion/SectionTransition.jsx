// Cross-section divider. Two variants:
// - "line" (default): a minimal fading accent rule.
// - "fiber": an animated strand that draws itself in as it scrolls into
//   view (stroke-dashoffset, triggered by the existing [data-reveal] system
//   rather than a second observer) — the CSS-only nod to "a fiber strand
//   travels through the viewport" between major sections, used at the
//   hero's own exit so it doesn't simply disappear. Deliberately not a
//   second WebGL canvas: this is a one-off decorative beat between two
//   sections, not a focal interactive surface like the hero or the
//   material explorer.
export default function SectionTransition({ className = "", variant = "line" }) {
  if (variant === "fiber") {
    return (
      <div className={`ff-section-transition ff-section-transition--fiber ${className}`.trim()} data-reveal="fade" aria-hidden="true">
        <svg viewBox="0 0 600 40" preserveAspectRatio="none" className="ff-fiber-transition-svg">
          <path
            className="ff-fiber-transition-path"
            d="M0 20 C 80 4, 150 36, 230 20 S 380 4, 460 20 S 560 30, 600 18"
            fill="none"
          />
        </svg>
      </div>
    );
  }

  return <div className={`ff-section-transition ${className}`.trim()} aria-hidden="true" />;
}
