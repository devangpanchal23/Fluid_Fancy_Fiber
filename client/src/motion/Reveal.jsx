// Thin declarative wrapper around the existing [data-reveal] system
// (see hooks/useReveal.js, already running document-wide from App.jsx with
// a MutationObserver) — renders the attribute, the global observer does the
// rest, including its built-in per-sibling stagger. No component-local
// IntersectionObserver here on purpose: one observer for the whole page.
export default function Reveal({ as: As = "div", variant = "up", className = "", children, ...rest }) {
  return (
    <As data-reveal={variant} className={className} {...rest}>
      {children}
    </As>
  );
}
