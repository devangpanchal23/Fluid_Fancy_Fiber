import { useEffect, useState } from "react";
import { LINES } from "../data/content";
import { images } from "../assets/images";
import { getApiBase, resolveUploadUrl } from "../apiBase";
import { DEFAULT_IMAGE, resolveGallery } from "../utils/catalogueImage";
import Corners from "./Corners";

const API_URL = getApiBase();

function resolveImage(url) {
  return images[url] || resolveUploadUrl(url);
}

// Renders one <img>, remounting (via the `key` the caller passes, keyed to
// the source) whenever the source changes so a previous load failure never
// lingers, and swapping to the guaranteed-good default if this particular
// URL 404s or otherwise fails to load.
function CatalogueImage({ src, alt }) {
  const [failed, setFailed] = useState(false);
  const finalSrc = failed ? resolveImage(DEFAULT_IMAGE) : resolveImage(src);
  return <img src={finalSrc} alt={alt} onError={() => setFailed(true)} />;
}

function fromApiVariant(v) {
  return {
    id: v._id,
    name: v.name,
    specs: (v.specs || []).map((s) => [s.key, s.value]),
    images: (v.images || []).map((img) => img.url)
  };
}

function fromApiProduct(p) {
  return {
    id: p._id,
    name: p.name,
    tag: p.tag || "",
    body: p.description || p.shortDescription || "",
    categoryId: p.category?._id || p.category || null,
    images: (p.images || []).map((img) => img.url),
    variants: [],
    isDynamic: true
  };
}

function useCategories() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/categories?activeOnly=true`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => {
        if (cancelled) return;
        const items = json?.data?.categories;
        if (Array.isArray(items)) setCategories(items);
      })
      .catch(() => {
        // No category filter if the API/database isn't reachable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return categories;
}

// Public catalogue: Category -> Type -> Variant -> specs. Tries the live
// Type + Variant APIs first, but falls back to the site's built-in static
// (flat) lines if the API/database isn't reachable or returns nothing — the
// public page must never break because of backend/database availability.
function useCatalogueLines() {
  const [lines, setLines] = useState(LINES);
  const [dynamic, setDynamic] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch(`${API_URL}/products?status=active&limit=50&sort=order`);
      if (!res.ok) throw new Error("products fetch failed");
      const json = await res.json();
      const items = json?.data?.items;
      if (!Array.isArray(items) || items.length === 0) return;

      const types = items.map(fromApiProduct);
      await Promise.all(
        types.map(async (type) => {
          try {
            const vRes = await fetch(`${API_URL}/variants?product=${type.id}&sort=order`);
            if (!vRes.ok) return;
            const vJson = await vRes.json();
            const vItems = vJson?.data?.items;
            if (Array.isArray(vItems)) type.variants = vItems.map(fromApiVariant);
          } catch {
            // Leave this type with zero variants rather than failing the whole catalogue.
          }
        })
      );

      if (cancelled) return;
      setLines(types);
      setDynamic(true);
    }

    load().catch(() => {
      // Keep the static fallback already in state.
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { lines, dynamic };
}

export default function Catalogue({ onOpenModal }) {
  const { lines: allLines, dynamic } = useCatalogueLines();
  const categories = useCategories();
  const [categoryFilter, setCategoryFilter] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(-1);
  const [openVariant, setOpenVariant] = useState(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const lines = categoryFilter ? allLines.filter((l) => l.categoryId === categoryFilter) : allLines;
  const activeIndex = Math.min(active, Math.max(0, lines.length - 1));
  const activeLine = lines[activeIndex];

  function categoryFor(line) {
    return categories.find((c) => c._id === line?.categoryId) || null;
  }

  // Deliberately does NOT default to the first variant when none is
  // explicitly selected (openVariant === null) — clicking the main
  // category/Type must show that Type's own image, not silently fall
  // through to a subcategory/Variant's image just because one exists.
  // Only an explicit variant click should switch the preview to a
  // variant's image.
  const activeVariant = dynamic ? activeLine?.variants?.find((v) => v.id === openVariant) || null : null;
  const gallery = dynamic
    ? resolveGallery(activeVariant, activeLine, categoryFor(activeLine))
    : activeLine?.gallery?.length
      ? activeLine.gallery
      : activeLine
        ? [activeLine.image]
        : [];
  const activeGalleryImage = gallery[Math.min(galleryIndex, gallery.length - 1)] || (dynamic ? DEFAULT_IMAGE : activeLine?.image);

  function selectCategory(id) {
    setCategoryFilter(id);
    setActive(0);
    setOpen(-1);
    setOpenVariant(null);
    setGalleryIndex(0);
  }

  function selectType(i) {
    setActive(i);
    setOpenVariant(null);
    setGalleryIndex(0);
  }

  function selectVariant(lineIndex, v) {
    setActive(lineIndex);
    setOpenVariant(v.id);
    setGalleryIndex(0);
  }

  // Same gallery-resolution rules as the desktop side panel (utils/catalogueImage),
  // but per-line so each accordion row's inline mobile image tracks whichever
  // variant is open within THAT row — independent of which line is "active".
  function galleryFor(line, isActiveLine) {
    const variant = isActiveLine ? activeVariant : null;
    const g = dynamic
      ? resolveGallery(variant, line, categoryFor(line))
      : line.gallery?.length
        ? line.gallery
        : [line.image];
    return g.length ? g : [dynamic ? DEFAULT_IMAGE : line.image];
  }

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

        {categories.length > 0 && (
          <div className="ff-catalogue-filters" data-reveal="up">
            <button type="button" className={`ff-filter-chip${categoryFilter === "" ? " is-active" : ""}`} onClick={() => selectCategory("")}>
              All
            </button>
            {categories.map((c) => (
              <button
                key={c._id}
                type="button"
                className={`ff-filter-chip${categoryFilter === c._id ? " is-active" : ""}`}
                onClick={() => selectCategory(c._id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        <div className="ff-catalogue-grid" data-reveal="up">
          <div className="ff-lines">
            {lines.map((line, i) => {
              const isOpen = open === i;
              const isActive = activeIndex === i;
              const lineGallery = galleryFor(line, isActive);
              const lineGalleryIndex = isActive ? Math.min(galleryIndex, lineGallery.length - 1) : 0;
              const lineImage = lineGallery[lineGalleryIndex] || (dynamic ? DEFAULT_IMAGE : line.image);
              return (
                <div key={line.id} className={`ff-line${isOpen ? " is-open" : ""}${isActive ? " is-active" : ""}`}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    className="ff-line-head"
                    onClick={() => {
                      selectType(i);
                      setOpen(isOpen ? -1 : i);
                    }}
                    onMouseEnter={() => selectType(i)}
                    onFocus={() => selectType(i)}
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
                        {/* Mobile/tablet only (hidden ≥900px, where the sticky side
                            panel already shows this) — the desktop preview is a
                            hover target, but touch has no hover, so each row carries
                            its own image inline instead and reveals it, with a
                            fade/slide, when the accordion opens (tap-to-expand). */}
                        <figure className="ff-line-mobile-preview">
                          <CatalogueImage key={lineImage} src={lineImage} alt={`${line.name} sample`} />
                          {isActive && lineGallery.length > 1 && (
                            <div className="ff-line-mobile-dots">
                              {lineGallery.map((img, gi) => (
                                <button
                                  key={`${img}-${gi}`}
                                  type="button"
                                  className={`ff-preview-dot${galleryIndex === gi ? " is-active" : ""}`}
                                  aria-label={`View image ${gi + 1}`}
                                  onClick={() => setGalleryIndex(gi)}
                                />
                              ))}
                            </div>
                          )}
                        </figure>
                        <p>{line.body}</p>

                        {dynamic ? (
                          line.variants.length === 0 ? (
                            <p className="ff-admin-hint">No variants published yet.</p>
                          ) : (
                            <div className="ff-variant-list">
                              {line.variants.map((v) => {
                                const isVariantOpen = isActive && openVariant === v.id;
                                return (
                                  <div key={v.id} className={`ff-variant-row${isVariantOpen ? " is-open" : ""}`}>
                                    <button
                                      type="button"
                                      className="ff-variant-head"
                                      aria-expanded={isVariantOpen}
                                      onClick={() => selectVariant(i, v)}
                                      onMouseEnter={() => selectVariant(i, v)}
                                      onFocus={() => selectVariant(i, v)}
                                    >
                                      <span>{v.name}</span>
                                      <span className="ff-line-icon">
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#17140f" strokeWidth="1.5" strokeLinecap="round">
                                          <path d="M12 5v14M5 12h14" />
                                        </svg>
                                      </span>
                                    </button>
                                    {isVariantOpen && (
                                      <div className="ff-variant-panel">
                                        {v.specs.map(([k, val]) => (
                                          <div className="ff-spec-row" key={k}>
                                            <span className="ff-spec-key">{k}</span>
                                            <span className="ff-spec-value">{val}</span>
                                          </div>
                                        ))}
                                        <button
                                          type="button"
                                          className="ff-line-request"
                                          onClick={() => onOpenModal(`${line.name} — ${v.name} spec sheet`, `${line.name} — ${v.name}`)}
                                        >
                                          Request this spec
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )
                        ) : (
                          <div className="ff-line-static-specs">
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
                        )}
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
              {lines.map((line, i) => {
                const isActiveSlot = activeIndex === i;
                const slotImage = isActiveSlot
                  ? activeGalleryImage
                  : dynamic
                    ? resolveGallery(null, line, categoryFor(line))[0]
                    : line.image;
                return (
                  <div key={line.id} className={`ff-preview-slot${isActiveSlot ? " is-active" : ""}`}>
                    <CatalogueImage key={slotImage} src={slotImage} alt={`${line.name} sample`} />
                  </div>
                );
              })}
            </figure>
            {gallery.length > 1 && (
              <div className="ff-preview-dots">
                {gallery.map((img, i) => (
                  <button
                    key={`${img}-${i}`}
                    type="button"
                    className={`ff-preview-dot${galleryIndex === i ? " is-active" : ""}`}
                    aria-label={`View image ${i + 1}`}
                    onClick={() => setGalleryIndex(i)}
                  />
                ))}
              </div>
            )}
            <div className="ff-preview-caption">
              <span>{dynamic && activeVariant ? `${activeLine?.name} — ${activeVariant.name}` : activeLine?.name}</span>
              <span>Fig. {String(activeIndex + 2).padStart(2, "0")}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
