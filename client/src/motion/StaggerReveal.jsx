import { Children, cloneElement, isValidElement } from "react";

// Groups children as DOM siblings and tags each with [data-reveal] (unless a
// child already sets its own variant) — the existing global reveal observer
// staggers same-parent [data-reveal] siblings by DOM order automatically, so
// this component's only job is making that grouping explicit and saving
// callers from wrapping every child in <Reveal> individually.
export default function StaggerReveal({ as: As = "div", variant = "up", className = "", children, ...rest }) {
  return (
    <As className={className} {...rest}>
      {Children.map(children, (child) =>
        isValidElement(child)
          ? cloneElement(child, { "data-reveal": child.props["data-reveal"] || variant })
          : child
      )}
    </As>
  );
}
