// Pure-CSS lift-on-hover/focus wrapper (see .ff-hover-lift in index.css).
// No JS animation loop needed for something this simple; reduced-motion is
// already handled globally (index.css zeroes all transition-durations under
// prefers-reduced-motion), so nothing extra is required here.
export default function HoverLift({ as: As = "div", className = "", children, ...rest }) {
  return (
    <As className={`ff-hover-lift ${className}`.trim()} {...rest}>
      {children}
    </As>
  );
}
