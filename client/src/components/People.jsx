import { useCallback, useEffect, useState } from "react";
import { images as bundledImages } from "../assets/images";
import { getApiBase, resolveUploadUrl } from "../apiBase";

const API_URL = getApiBase();

const TYPE_LABELS = { "main-partner": "Main Partner", "co-partner": "Co-Partner" };

function resolveImage(url) {
  return bundledImages[url] || resolveUploadUrl(url);
}

function initialsOf(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function fromApiPerson(p) {
  return {
    id: p._id,
    name: p.name,
    role: p.designation,
    tag: TYPE_LABELS[p.type] || p.designation,
    initials: initialsOf(p.name),
    image: p.image?.url || null,
    bio: p.bio || "",
    links: (p.links || []).length ? p.links : p.email ? [{ label: p.email, href: "#contact" }] : []
  };
}

// The admin panel is the single source of truth: this section renders exactly
// what GET /api/people returns (active people, already in display order —
// main partner, co-partners, then the rest) and nothing else. There is no
// built-in fallback roster, so what visitors see can never disagree with what
// the admin manages. It refetches whenever the tab regains focus, so an edit
// made in the admin shows up without a manual hard refresh.
function usePeople() {
  const [state, setState] = useState({ status: "loading", people: [] });

  const load = useCallback((signal) => {
    fetch(`${API_URL}/people?activeOnly=true&limit=100`, { cache: "no-store", signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json) => {
        const items = json?.data?.items;
        if (!Array.isArray(items)) throw new Error("Unexpected response");
        setState({ status: "ready", people: items.map(fromApiPerson) });
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        // Keep whatever we already showed rather than blanking the section on
        // a transient failure; only surface the error if there's nothing yet.
        setState((s) => (s.status === "ready" ? s : { status: "error", people: [] }));
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);

    function onVisible() {
      if (document.visibilityState === "visible") load();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [load]);

  return { ...state, retry: () => load() };
}

function PersonPhoto({ person }) {
  const [broken, setBroken] = useState(false);
  if (!person.image || broken) {
    return <span className="ff-person-initials">{person.initials}</span>;
  }
  return <img className="ff-person-photo" src={resolveImage(person.image)} alt={person.name} onError={() => setBroken(true)} />;
}

export default function People() {
  const { status, people, retry } = usePeople();

  return (
    <section id="people" className="ff-section ff-section--tight-top">
      <div className="ff-container">
        <div className="ff-section-head" data-reveal="up">
          <div>
            <div className="ff-kicker">04 — People</div>
            <h2 className="ff-heading">Who you&apos;ll actually deal with</h2>
          </div>
        </div>

        {status === "loading" && (
          <div className="ff-people-grid" aria-busy="true" aria-label="Loading people">
            {[0, 1, 2].map((i) => (
              <div key={i} className="ff-person ff-person--skeleton">
                <div className="ff-person-media" />
              </div>
            ))}
          </div>
        )}

        {status === "error" && (
          <p className="ff-people-note">
            We couldn&apos;t load our team just now.{" "}
            <button type="button" className="ff-people-retry" onClick={retry}>
              Try again
            </button>
          </p>
        )}

        {status === "ready" && people.length === 0 && <p className="ff-people-note">Our team profiles will be published here soon.</p>}

        {status === "ready" && people.length > 0 && (
          <div className="ff-people-grid">
            {people.map((p) => (
              <article key={p.id} className="ff-person" data-reveal="up">
                <i className="corner tl" />
                <i className="corner tr" />
                <i className="corner bl" />
                <i className="corner br" />
                <div className="ff-person-media">
                  <PersonPhoto person={p} />
                  <span className="ff-person-tag">{p.tag}</span>
                </div>
                <h3 className="ff-person-name">{p.name}</h3>
                <div className="ff-person-role">{p.role}</div>
                {p.bio && <p className="ff-person-bio">{p.bio}</p>}
                <div className="ff-person-links">
                  {p.links.map((lnk, i) => (
                    <a key={`${lnk.label}-${i}`} href={lnk.href} className="ff-person-link">
                      {lnk.label}
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
