import { useEffect } from "react";

// Applies a damped pointer-follow translate to [data-magnetic] elements,
// skipped for touch pointers and reduced-motion users. A MutationObserver
// picks up elements that appear after mount (mobile menu links, modal/CTA
// buttons rendered conditionally, etc.) — without it, only whatever was in
// the initial render tree ever got the effect.
export function useMagnetic(containerRef, deps = []) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const root = containerRef?.current || document;

    const seen = new WeakMap();

    function bind(el) {
      if (seen.has(el)) return;
      const onMove = (ev) => {
        if (ev.pointerType === "touch") return;
        const r = el.getBoundingClientRect();
        const dx = ev.clientX - (r.left + r.width / 2);
        const dy = ev.clientY - (r.top + r.height / 2);
        el.style.transition = "transform 110ms linear";
        el.style.transform = `translate(${(dx * 0.16).toFixed(2)}px, ${(dy * 0.26).toFixed(2)}px)`;
      };
      const onLeave = () => {
        el.style.transition = "transform 520ms cubic-bezier(0.2,1.25,0.35,1)";
        el.style.transform = "translate(0,0)";
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      seen.set(el, () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      });
    }

    function unbind(el) {
      seen.get(el)?.();
      seen.delete(el);
    }

    function bindTree(node) {
      if (node.nodeType !== 1) return;
      if (node.hasAttribute("data-magnetic")) bind(node);
      node.querySelectorAll?.("[data-magnetic]").forEach(bind);
    }

    function unbindTree(node) {
      if (node.nodeType !== 1) return;
      if (node.hasAttribute("data-magnetic")) unbind(node);
      node.querySelectorAll?.("[data-magnetic]").forEach(unbind);
    }

    root.querySelectorAll("[data-magnetic]").forEach(bind);

    const mo = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach(bindTree);
        m.removedNodes.forEach(unbindTree);
      });
    });
    mo.observe(root === document ? document.body : root, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      root.querySelectorAll("[data-magnetic]").forEach(unbind);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
