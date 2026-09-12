import { GALLERY } from "../data/content";
import { images } from "../assets/images";

export default function Gallery() {
  return (
    <section id="gallery" className="ff-section ff-section--tight-top">
      <div className="ff-container">
        <div className="ff-section-head" data-reveal="up" style={{ paddingBottom: 18, borderBottom: "1px solid var(--ff-line)" }}>
          <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "clamp(22px, 2.2vw, 32px)", margin: 0, textTransform: "uppercase", letterSpacing: "0.02em" }}>
            Cone library
          </h3>
          <p className="ff-lede" style={{ maxWidth: "40ch" }}>
            Photographed under the same light and lens so a shade on screen behaves like the shade in the carton.
          </p>
        </div>
        <div className="ff-gallery-grid">
          {GALLERY.map((g) => (
            <figure key={g.id} className="ff-gallery-figure" data-reveal="up">
              <div className="ff-gallery-frame">
                <img src={images[g.image]} alt={`${g.label} yarn sample`} />
              </div>
              <figcaption className="ff-gallery-caption">
                <span>{g.label}</span>
                <span>{g.ref}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
