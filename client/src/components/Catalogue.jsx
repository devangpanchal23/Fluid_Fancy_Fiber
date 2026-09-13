import { useEffect, useState } from "react";
import { LINES } from "../data/content";
import { images } from "../assets/images";
import Corners from "./Corners";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function resolveImage(url) {
  return images[url] || url;
}

function fromApiProduct(p) {
  return {
    id: p._id,
    name: p.name,
    tag: p.tag || "",
    body: p.description || p.shortDescription || "",
    specs: (p.specs || []).map((s) => [s.key, s.value]),
    image: p.images?.[0]?.url || "mill"
  };
}

// Public catalogue: tries the live product API first, but falls back to the
// site's built-in static lines if the API/database isn't reachable (e.g. no
// MONGODB_URI configured yet) or returns nothing — the public page must
// never break because of backend/database availability.
function useCatalogueLines() {
  const [lines, setLines] = useState(LINES);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/products?status=active&limit=50&sort=-featured`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => {
        if (cancelled) return;
        const items = json?.data?.items;
        if (Array.isArray(items) && items.length > 0) {
          setLines(items.map(fromApiProduct));
        }
      })
      .catch(() => {
        // Keep the static fallback already in state.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return lines;
}

export default function Catalogue({ onOpenModal }) {
  const lines = useCatalogueLines();
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(-1);

  const activeIndex = Math.min(active, lines.length - 1);

  return (
    <section id="catalogue" className="ff-section">
      <div className="ff-container">
        <div className="ff-section-head" data-reveal="up">
          <div>
            <div className="ff-kicker">01 — Catalogue</div>
            <h2 className="ff-heading">The index</h2>
          </div>
          <p className="ff-lede">Hover a line to see the cone; open it for the full specification.</p>
        </div>

        <div className="ff-catalogue-grid" data-reveal="up">
          <div className="ff-lines">
            {lines.map((line, i) => {
              const isOpen = open === i;
              const isActive = activeIndex === i;
              return (
                <div key={line.id} className={`ff-line${isOpen ? " is-open" : ""}${isActive ? " is-active" : ""}`}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    className="ff-line-head"
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                  >
                    <span className="ff-line-num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="ff-line-name-wrap">
                      <span className="ff-line-name">{line.name}</span>
                      <span className="ff-line-tag">{line.tag}</span>
                    </span>
                    <span className="ff-line-icon">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#17140f" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </button>
                  <div className="ff-line-panel">
                    <div className="ff-line-panel-inner">
                      <div className="ff-line-panel-content">
                        <p>{line.body}</p>
                        <div>
                          {line.specs.map(([k, v]) => (
                            <div className="ff-spec-row" key={k}>
                              <span className="ff-spec-key">{k}</span>
                              <span className="ff-spec-value">{v}</span>
                            </div>
                          ))}
                          <button
                            type="button"
                            className="ff-line-request"
                            onClick={() => onOpenModal(`${line.name} spec sheet`, line.name)}
                          >
                            Request this spec
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="ff-preview">
            <figure className="ff-preview-frame">
              <Corners />
              {lines.map((line, i) => (
                <div key={line.id} className={`ff-preview-slot${activeIndex === i ? " is-active" : ""}`}>
                  <img src={resolveImage(line.image)} alt={`${line.name} sample`} />
                </div>
              ))}
            </figure>
            <div className="ff-preview-caption">
              <span>{lines[activeIndex]?.name}</span>
              <span>Fig. {String(activeIndex + 2).padStart(2, "0")}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
