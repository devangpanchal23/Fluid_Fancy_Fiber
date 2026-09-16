import { useEffect, useState } from "react";
import { PEOPLE } from "../data/content";
import { images as bundledImages } from "../assets/images";
import { getApiBase } from "../apiBase";

const API_URL = getApiBase();

function resolveImage(url) {
  return bundledImages[url] || url;
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
    tag: p.designation,
    initials: initialsOf(p.name),
    image: p.image?.url || null,
    bio: p.bio || "",
    links: (p.links || []).length ? p.links : p.email ? [{ label: p.email, href: "#contact" }] : []
  };
}

// Public People section: tries the live people API first, but falls back to
// the site's built-in static roster if the API/database isn't reachable or
// returns nothing — matches the Catalogue component's resilience pattern.
function usePeople() {
  const [people, setPeople] = useState(PEOPLE);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/people?activeOnly=true`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => {
        if (cancelled) return;
        const items = json?.data?.items;
        if (Array.isArray(items) && items.length > 0) {
          setPeople(items.map(fromApiPerson));
        }
      })
      .catch(() => {
        // Keep the static fallback already in state.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return people;
}

export default function People() {
  const people = usePeople();
  return (
    <section id="people" className="ff-section ff-section--tight-top">
      <div className="ff-container">
        <div className="ff-section-head" data-reveal="up">
          <div>
            <div className="ff-kicker">04 — People</div>
            <h2 className="ff-heading">Who you&apos;ll actually deal with</h2>
          </div>
          {/* <p className="ff-lede">Three names, three direct lines. No account-manager relay.</p> */}
        </div>

        <div className="ff-people-grid">
          {people.map((p) => (
            <article key={p.id} className="ff-person" data-reveal="up">
              <i className="corner tl" />
              <i className="corner tr" />
              <i className="corner bl" />
              <i className="corner br" />
              <div className="ff-person-media">
                {p.image ? (
                  <img className="ff-person-photo" src={resolveImage(p.image)} alt={p.name} />
                ) : (
                  <span className="ff-person-initials">{p.initials}</span>
                )}
                <span className="ff-person-tag">{p.tag}</span>
              </div>
              <h3 className="ff-person-name">{p.name}</h3>
              <div className="ff-person-role">{p.role}</div>
              <p className="ff-person-bio">{p.bio}</p>
              <div className="ff-person-links">
                {p.links.map((lnk) => (
                  <a key={lnk.label} href={lnk.href} className="ff-person-link">
                    {lnk.label}
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
