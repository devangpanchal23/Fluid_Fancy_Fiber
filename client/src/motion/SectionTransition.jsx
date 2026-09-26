// Minimal cross-section divider for Phase 2's scaffold — a purely visual,
// aria-hidden accent rule that fades content boundaries instead of a hard
// cut. Phase 5 (scroll storytelling) is where this gets a fuller treatment
// (a fiber strand crossing the viewport at hero->next-section, ambient
// light shifts between sections); this is the reusable placeholder every
// later section wires into rather than each inventing its own divider.
export default function SectionTransition({ className = "" }) {
  return <div className={`ff-section-transition ${className}`.trim()} aria-hidden="true" />;
}
