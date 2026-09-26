import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { images } from "../assets/images";
import { NAV_ITEMS } from "../data/content";
import { useActiveSection } from "../hooks/useActiveSection";
import Corners from "./Corners";

const SECTION_IDS = ["top", ...NAV_ITEMS.map((n) => n.href.replace("#", ""))];

export default function Header({ shrink, onOpenModal }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const active = useActiveSection(SECTION_IDS, "top");
  const burgerRef = useRef(null);
  const menuRef = useRef(null);

  const closeMenu = () => setMenuOpen(false);

  // Scroll lock + Escape-to-close + focus management while the mobile menu
  // is open. Focus moves into the panel on open and returns to the burger
  // button on close, so keyboard users never lose their place.
  useEffect(() => {
    if (!menuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const firstLink = menuRef.current?.querySelector("a,button");
    firstLink?.focus();

    const onKeyDown = (ev) => {
      if (ev.key === "Escape") {
        closeMenu();
        burgerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className={`ff-header${shrink ? " is-shrunk" : ""}`}>
      <div className="ff-header-row">
        <a href="#top" className="ff-brand">
          <img src={images.logo} alt="Fluid Fancy Fibre LLP" />
        </a>

        <nav className="ff-nav ff-nav-desktop" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const id = item.href.replace("#", "");
            const isActive = active === id;
            return (
              <a key={item.href} href={item.href} className={`ff-nav-link${isActive ? " is-active" : ""}`}>
                <span>{item.label}</span>
                <span className="ff-nav-link-bar" />
              </a>
            );
          })}
        </nav>

        <button
          type="button"
          data-magnetic
          className="ff-btn ff-btn-primary ff-cta-desktop blueprint"
          onClick={() => onOpenModal("Request spec sheet")}
        >
          <Corners />
          <span>Request spec sheet</span>
        </button>

        <button
          ref={burgerRef}
          type="button"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="ff-mobile-menu"
          className={`ff-burger${menuOpen ? " is-open" : ""}`}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="ff-burger-bar" />
          <span className="ff-burger-bar" />
          <span className="ff-burger-bar" />
        </button>
      </div>

      {/* Portaled to document.body rather than nested in <header>: .ff-header
          carries a backdrop-filter for its glass effect, and an ancestor
          with backdrop-filter/filter establishes a new containing block for
          position:fixed descendants in this browser — inset:0 on the menu
          was resolving against the ~header-sized box instead of the
          viewport. The portal sidesteps that entirely. */}
      {createPortal(
        <div
          id="ff-mobile-menu"
          ref={menuRef}
          className={`ff-mobile-menu${menuOpen ? " is-open" : ""}`}
          inert={!menuOpen}
        >
          <nav aria-label="Mobile">
            {NAV_ITEMS.map((item, i) => (
              <a
                key={item.href}
                href={item.href}
                className="ff-mobile-link"
                style={{ transitionDelay: `${60 + i * 55}ms` }}
                onClick={closeMenu}
              >
                <span className="ff-mobile-link-num">{item.num}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
          <button
            type="button"
            className="ff-mobile-cta"
            style={{ transitionDelay: `${60 + NAV_ITEMS.length * 55}ms` }}
            onClick={() => {
              closeMenu();
              onOpenModal("Request spec sheet");
            }}
          >
            Request spec sheet
          </button>
        </div>,
        document.body
      )}
    </header>
  );
}
