import { Component, Suspense, lazy } from "react";
import { useWebglGate } from "./useWebglGate";

const MaterialExplorerScene = lazy(() => import("./MaterialExplorerScene"));

class WebGLErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    if (import.meta.env.DEV) console.warn("Material explorer 3D disabled after a WebGL error:", error);
  }
  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

// The second WebGL surface on the site, reusing the hero's own fiber
// geometry/shader/gating (useWebglGate, FiberStrand) rather than building a
// second engine — see PHASE 7 in the redesign brief ("prefer reusable
// geometry/material/shaders/renderer where practical"). Same fallback
// contract as the hero: reduced-motion/no-WebGL/data-saver users get a
// static card instead, never a blank space or a crash.
export default function MaterialExplorerCanvas() {
  const { enabled, quality } = useWebglGate();

  const fallback = (
    <div className="ff-material-explorer-fallback" aria-hidden="true">
      <span>Fibre preview unavailable on this device</span>
    </div>
  );

  return (
    <div className="ff-material-explorer" data-cursor="3d">
      {enabled ? (
        <WebGLErrorBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <MaterialExplorerScene quality={quality} />
          </Suspense>
        </WebGLErrorBoundary>
      ) : (
        fallback
      )}
      <span className="ff-material-explorer-hint" aria-hidden="true">
        Drag to rotate
      </span>
    </div>
  );
}
