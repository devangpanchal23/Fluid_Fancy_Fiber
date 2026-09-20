import { images } from "../assets/images";
import { FOOTER_COLUMNS } from "../data/content";

export default function Footer() {
  return (
    <footer className="ff-footer">
      <div className="ff-footer-grid">
        <div className="ff-footer-brand">
          <img src={images.logo} alt="Fluid Fancy Fibre LLP" />
          <p>Ring-spun mono, lino and specialty counts for mills that measure twice.</p>
        </div>
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title}>
            <div className="ff-footer-col-title">{col.title}</div>
            <div className="ff-footer-links">
              {col.links.map((l) => (
                <a key={l.label} href={l.href}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="ff-footer-bottom">
        <span>© {new Date().getFullYear()} Fluid Fancy Fibre LLP</span>
      </div>
    </footer>
  );
}
