import { useState } from "react";
import { images } from "../assets/images";
import { NAV_ITEMS } from "../data/content";
import { useActiveSection } from "../hooks/useActiveSection";
import Corners from "./Corners";

const SECTION_IDS = ["top", ...NAV_ITEMS.map((n) => n.href.replace("#", ""))];

export default function Header({ shrink, onOpenModal }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const active = useActiveSection(SECTION_IDS, "top");

  const closeMenu = () => setMenuOpen(false);

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
          type="button"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className={`ff-burger${menuOpen ? " is-open" : ""}`}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="ff-burger-bar" />
          <span className="ff-burger-bar" />
          <span className="ff-burger-bar" />
        </button>
      </div>

      {menuOpen && (
        <div className="ff-mobile-menu">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} className="ff-mobile-link" onClick={closeMenu}>
              <span className="ff-mobile-link-num">{item.num}</span>
              <span>{item.label}</span>
            </a>
          ))}
          <button
            type="button"
            className="ff-mobile-cta"
            onClick={() => {
              closeMenu();
              onOpenModal("Request spec sheet");
            }}
          >
            Request spec sheet
          </button>
        </div>
      )}
    </header>
  );
}
