import { useEffect, useRef } from "react";

// Desktop-only (fine pointer, no touch) custom cursor: a small dot that
// follows the raw pointer 1:1, and a lagging ring that eases toward it
// (lerp, not spring physics — cheap, no library). State classes come from
// the hovered element's nearest match against a fixed selector list, via
// event delegation on pointerover/pointerout rather than per-element
// listeners, so it costs nothing as more interactive elements are added in
// later phases.
const STATE_SELECTORS = [
  ["product", "[data-cursor='product'], .ff-preview-frame, .ff-line-mobile-preview"],
  ["image", "img, .ff-gallery-frame, .ff-video-frame, .ff-mill-frame, .ff-person-media"],
  ["3d", "[data-cursor='3d'], .ff-hero-canvas, .ff-material-explorer"],
  ["button", "button, [role='button'], .ff-btn"],
  ["link", "a"]
];

function stateFor(el) {
  for (const [state, selector] of STATE_SELECTORS) {
    if (el.closest(selector)) return state;
  }
  return null;
}

export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canHover || reducedMotion) return undefined;

    document.body.classList.add("ff-cursor-active");

    const dot = dotRef.current;
    const ring = ringRef.current;
    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { ...pointer };
    let raf = null;
    let visible = false;

    const onMove = (ev) => {
      pointer.x = ev.clientX;
      pointer.y = ev.clientY;
      if (!visible) {
        visible = true;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
      }
      dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;

      const state = stateFor(ev.target);
      ring.dataset.state = state || "";
    };

    const onLeaveWindow = () => {
      visible = false;
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };

    const tick = () => {
      ringPos.x += (pointer.x - ringPos.x) * 0.18;
      ringPos.y += (pointer.y - ringPos.y) * 0.18;
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeaveWindow);
    raf = requestAnimationFrame(tick);

    return () => {
      document.body.classList.remove("ff-cursor-active");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseleave", onLeaveWindow);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden="true">
      <div ref={dotRef} className="ff-cursor-dot" />
      <div ref={ringRef} className="ff-cursor-ring" />
    </div>
  );
}
