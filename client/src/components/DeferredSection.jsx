import { Suspense } from "react";
import { useNearViewport } from "../hooks/useNearViewport";

function SectionPlaceholder({ id, minHeight, label }) {
  return (
    <div id={id} className="ff-deferred-skeleton" style={{ minHeight }} aria-hidden="true" data-section-label={label}>
      <span />
      <span />
      <span />
    </div>
  );
}

export default function DeferredSection({ id, label, minHeight, children }) {
  const [regionRef, shouldLoad] = useNearViewport("1600px 0px");

  return (
    <div ref={regionRef} className="ff-deferred-region">
      {shouldLoad ? (
        <Suspense fallback={<SectionPlaceholder id={id} label={label} minHeight={minHeight} />}>
          {children}
        </Suspense>
      ) : (
        <SectionPlaceholder id={id} label={label} minHeight={minHeight} />
      )}
    </div>
  );
}
