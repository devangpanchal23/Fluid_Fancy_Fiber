import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function NotFound({ admin = false }) {
  useEffect(() => {
    const previousTitle = document.title;
    const robots = document.querySelector('meta[name="robots"]');
    const previousRobots = robots?.content;
    document.title = "Page not found | Fluid Fancy Fibre LLP";
    if (robots) robots.content = "noindex, nofollow";
    else {
      const meta = document.createElement("meta");
      meta.name = "robots";
      meta.content = "noindex, nofollow";
      document.head.append(meta);
    }
    return () => {
      document.title = previousTitle;
      if (robots) robots.content = previousRobots;
      else document.querySelector('meta[name="robots"]')?.remove();
    };
  }, []);

  return (
    <main className="ff-section" style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
      <div className="ff-container" style={{ maxWidth: 680, textAlign: "center" }}>
        <div className="ff-kicker">Fluid Fancy Fibre</div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(48px, 8vw, 88px)", margin: "12px 0" }}>Page not found</h1>
        <p className="ff-modal-lede">This page may have moved. Head back to a familiar place.</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
          {admin ? <Link className="ff-btn ff-btn-primary" to="/admin">Admin sign in</Link> : <Link className="ff-btn ff-btn-primary" to="/">Back to home</Link>}
          {!admin && <a className="ff-btn ff-btn-ghost" href="/#contact">Contact us</a>}
        </div>
      </div>
    </main>
  );
}
