import { Component, Suspense, lazy, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "../hooks/useMediaQuery";

const FiberScene = lazy(() => import("./FiberScene"));

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl2") || canvas.getContext("webgl")));
  } catch {
    return false;
  }
}

// Three.js/R3F can throw on driver quirks, context loss, or an exhausted
// GPU — this must never take the Hero (or the rest of the page) down with
// it, so any error inside the 3D subtree falls back to the ambient CSS glow.
class WebGLErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    if (import.meta.env.DEV) console.warn("Fiber hero 3D disabled after a WebGL error:", error);
  }
  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

// Tracks how far this section has scrolled through the viewport, normalized
// to roughly -1..1 — mirrors the same rAF-throttled bounding-rect approach
// Hero.jsx already uses for its photo-frame parallax, kept local rather than
// wired through a new global scroll store.
function useLocalScrollProgress(ref) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf = null;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const k = Math.max(-1, Math.min(1, (window.innerHeight - r.top) / (window.innerHeight + r.height)));
        setProgress(k);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [ref]);
  return progress;
}

// Gates the heavy Three.js/R3F bundle behind real capability checks so it is
// never even downloaded for reduced-motion users, no-WebGL browsers, or
// data-saver connections — code-splitting that actually skips the fetch,
// not just the render.
export default function HeroCanvas({ className = "" }) {
  const containerRef = useRef(null);
  const scrollProgress = useLocalScrollProgress(containerRef);

  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isTablet = useMediaQuery("(max-width: 899.98px)");
  const isPhone = useMediaQuery("(max-width: 720px)");

  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) {
      setEnabled(false);
      return;
    }
    const saveData = typeof navigator !== "undefined" && navigator.connection && navigator.connection.saveData;
    if (saveData) {
      setEnabled(false);
      return;
    }
    setEnabled(supportsWebGL());
  }, [prefersReducedMotion]);

  const quality = isPhone ? "low" : isTablet ? "medium" : "high";

  const fallback = <div className="ff-hero-canvas-fallback" aria-hidden="true" />;

  return (
    <div ref={containerRef} className={`ff-hero-canvas ${className}`.trim()} aria-hidden="true">
      {enabled ? (
        <WebGLErrorBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <FiberScene scrollProgress={scrollProgress} quality={quality} reducedInteraction={isPhone} />
          </Suspense>
        </WebGLErrorBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}
