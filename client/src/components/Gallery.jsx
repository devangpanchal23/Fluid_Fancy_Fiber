import { useEffect, useState } from "react";
import { images as bundledImages } from "../assets/images";
import { getApiBase, resolveUploadUrl } from "../apiBase";

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

export default function Gallery() {
  const { status, items, retry } = useConeLibrary();

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
            {items.map((g) => (
              <figure key={g._id} className="ff-gallery-figure" data-reveal="up">
                <div className="ff-gallery-frame">
                  <img src={resolveImage(g.image.url)} alt={g.image.alt || `${g.productName} yarn sample`} />
                </div>
                <figcaption className="ff-gallery-caption">
                  <span>{g.productName}</span>
                  <span>{g.productDetails}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
