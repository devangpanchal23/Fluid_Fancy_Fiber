import { PEOPLE } from "../data/content";

export default function People() {
  return (
    <section id="people" className="ff-section ff-section--tight-top">
      <div className="ff-container">
        <div className="ff-section-head" data-reveal="up">
          <div>
            <div className="ff-kicker">04 — People</div>
            <h2 className="ff-heading">Who you&apos;ll actually deal with</h2>
          </div>
          <p className="ff-lede">Three names, three direct lines. No account-manager relay.</p>
        </div>

        <div className="ff-people-grid">
          {PEOPLE.map((p) => (
            <article key={p.id} className="ff-person" data-reveal="up">
              <i className="corner tl" />
              <i className="corner tr" />
              <i className="corner bl" />
              <i className="corner br" />
              <div className="ff-person-media">
                <span className="ff-person-initials">{p.initials}</span>
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
