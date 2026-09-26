import { useEffect, useState } from "react";
import { useMediaQuery } from "../hooks/useMediaQuery";

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl2") || canvas.getContext("webgl")));
  } catch {
    return false;
  }
}

// Shared capability gate for every WebGL/R3F surface on the site (the hero
// fiber field, the material explorer): prefers-reduced-motion, actual WebGL
// support, and navigator.connection.saveData, checked once per mount rather
// than duplicated per-component. Also returns a desktop/tablet/phone quality
// tier from the project's own breakpoints (720/900) for scaling strand
// count, segment count and DPR.
export function useWebglGate() {
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
  return { enabled, quality, isPhone, isTablet, prefersReducedMotion };
}
