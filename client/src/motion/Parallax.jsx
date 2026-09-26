import { useParallax } from "../hooks/useParallax";

// Declarative wrapper over useParallax for the common case — drift an
// element vertically as it crosses the viewport. `strength` is the max
// translate in px in either direction. No-ops under reduced-motion (the
// hook itself skips attaching the scroll listener in that case).
export default function Parallax({ as: As = "div", strength = 40, className = "", style, children, ...rest }) {
  const ref = useParallax((k) => {
    const el = ref.current;
    if (el) el.style.transform = `translate3d(0, ${(k * -strength).toFixed(1)}px, 0)`;
  });

  return (
    <As ref={ref} className={className} style={{ willChange: "transform", ...style }} {...rest}>
      {children}
    </As>
  );
}
