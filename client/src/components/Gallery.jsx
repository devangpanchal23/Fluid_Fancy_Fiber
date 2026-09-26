import { useCallback, useEffect, useRef, useState } from "react";
import { images as bundledImages } from "../assets/images";
import { getApiBase, resolveUploadUrl } from "../apiBase";
import Parallax from "../motion/Parallax";

const API_URL = getApiBase();

function resolveImage(url) {
  return bundledImages[url] || resolveUploadUrl(url);
}

// The Cone library is managed in the admin panel: this renders exactly what
// GET /api/cone-library returns (already in the admin-chosen order). The
// request is never cached, so an add/edit/delete/reorder in the admin shows on
// the next page load.
function useConeLibrary() {
  const [state, setState] = useState({ status: "loading", items: [] });

  const load = (signal) => {
    setState({ status: "loading", items: [] });
    fetch(`${API_URL}/cone-library`, { cache: "no-store", signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json) => {
        const items = json?.data?.items;
        if (!Array.isArray(items)) throw new Error("Unexpected response");
        // Dev-only check that the admin's products reach the page, in order.
        if (import.meta.env.DEV) {
          console.info(`[cone-library] ${items.length} item(s) from ${API_URL}/cone-library`, items.map((g) => ({ name: g.productName, image: resolveImage(g.image.url) })));
        }
        setState({ status: "ready", items });
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setState({ status: "error", items: [] });
      });
  };

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, []);

  return { ...state, retry: () => load() };
}

function ChevronIcon({ dir }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

// Full-size viewer for one cone sheet: arrows / swipe to step through the
// library, Esc or a backdrop click to close.
function ConeLightbox({ items, index, onChange, onClose }) {
  const closeRef = useRef(null);
  const touchX = useRef(null);
  const count = items.length;
  const item = items[index];
  const step = useCallback((delta) => onChange((index + delta + count) % count), [index, count, onChange]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && count > 1) step(-1);
      else if (e.key === "ArrowRight" && count > 1) step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, count, onClose]);

  // Lock page scroll while open and start keyboard focus inside the viewer.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Warm the neighbours so stepping through feels instant.
  useEffect(() => {
    if (count < 2) return;
    [items[(index + 1) % count], items[(index - 1 + count) % count]].forEach((g) => {
      new Image().src = resolveImage(g.image.url);
    });
  }, [index, count, items]);

  function onTouchEnd(e) {
    if (touchX.current === null || count < 2) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${item.productName} — cone ${index + 1} of ${count}`}
      className="ff-lightbox"
      onClick={onClose}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={onTouchEnd}
    >
      <button ref={closeRef} type="button" aria-label="Close" className="ff-lightbox-btn ff-lightbox-close" onClick={onClose}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {count > 1 && (
        <button type="button" aria-label="Previous cone" className="ff-lightbox-btn ff-lightbox-nav ff-lightbox-prev" onClick={(e) => { e.stopPropagation(); step(-1); }}>
          <ChevronIcon dir="prev" />
        </button>
      )}

      <figure className="ff-lightbox-stage" onClick={(e) => e.stopPropagation()}>
        <img key={item._id} src={resolveImage(item.image.url)} alt={item.image.alt || `${item.productName} yarn sample`} />
        <figcaption className="ff-lightbox-caption">
          <span className="ff-lightbox-name">{item.productName}</span>
          <span className="ff-lightbox-details">{item.productDetails}</span>
          <span className="ff-lightbox-count">
            {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
          </span>
        </figcaption>
      </figure>

      {count > 1 && (
        <button type="button" aria-label="Next cone" className="ff-lightbox-btn ff-lightbox-nav ff-lightbox-next" onClick={(e) => { e.stopPropagation(); step(1); }}>
          <ChevronIcon dir="next" />
        </button>
      )}
    </div>
  );
}

export default function Gallery() {
  const { status, items, retry } = useConeLibrary();
  const [openIndex, setOpenIndex] = useState(null);
  const triggers = useRef([]);

  const close = useCallback(() => {
    setOpenIndex((i) => {
      // Hand focus back to the card that opened the viewer.
      if (i !== null) requestAnimationFrame(() => triggers.current[i]?.focus());
      return null;
    });
  }, []);

  return (
    <section id="gallery" className="ff-section ff-section--tight-top ff-gallery-section">
      <Parallax as="span" strength={24} className="ff-gallery-watermark" aria-hidden="true">
        FIBRE
      </Parallax>
      <div className="ff-container">
        <div className="ff-section-head" data-reveal="mask" style={{ paddingBottom: 18, borderBottom: "1px solid var(--ff-line)" }}>
          <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "clamp(22px, 2.2vw, 32px)", margin: 0, textTransform: "uppercase", letterSpacing: "0.02em" }}>
            Cone library
          </h3>
          <p className="ff-lede" style={{ maxWidth: "40ch" }}>
            Photographed under the same light and lens so a shade on screen behaves like the shade in the carton.
          </p>
        </div>

        {status === "error" && (
          <p className="ff-people-note">
            We couldn&apos;t load the cone library just now.{" "}
            <button type="button" className="ff-people-retry" onClick={retry}>
              Try again
            </button>
          </p>
        )}

        {status === "ready" && items.length === 0 && <p className="ff-people-note">Our cone library will be published here soon.</p>}

        {status === "ready" && items.length > 0 && (
          <div className="ff-gallery-grid">
            {items.map((g, i) => (
              <figure key={g._id} className="ff-gallery-figure" data-reveal="up">
                <button
                  type="button"
                  ref={(el) => (triggers.current[i] = el)}
                  className="ff-gallery-frame"
                  onClick={() => setOpenIndex(i)}
                  aria-label={`View ${g.productName} full size`}
                >
                  <img src={resolveImage(g.image.url)} alt={g.image.alt || `${g.productName} yarn sample`} loading="lazy" decoding="async" />
                  <span className="ff-gallery-view" aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                    View
                  </span>
                </button>
                <figcaption className="ff-gallery-caption">
                  <span>{g.productName}</span>
                  <span>{g.productDetails}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        {openIndex !== null && items[openIndex] && (
          <ConeLightbox items={items} index={openIndex} onChange={setOpenIndex} onClose={close} />
        )}
      </div>
    </section>
  );
}
