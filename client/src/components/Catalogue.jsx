import { useState } from "react";
import { LINES } from "../data/content";
import { images } from "../assets/images";
import Corners from "./Corners";

export default function Catalogue({ onOpenModal }) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(-1);

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
            {LINES.map((line, i) => {
              const isOpen = open === i;
              const isActive = active === i;
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
              {LINES.map((line, i) => (
                <div key={line.id} className={`ff-preview-slot${active === i ? " is-active" : ""}`}>
                  <img src={images[line.image]} alt={`${line.name} sample`} />
                </div>
              ))}
            </figure>
            <div className="ff-preview-caption">
              <span>{LINES[active].name}</span>
              <span>Fig. {String(active + 2).padStart(2, "0")}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
