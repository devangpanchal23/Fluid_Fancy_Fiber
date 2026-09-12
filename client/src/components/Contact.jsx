import { useState } from "react";
import { CONTACTS } from "../data/content";
import { submitEnquiry } from "../api/enquiries";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const initialForm = { name: "", company: "", email: "", message: "" };

export default function Contact() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState("");

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  });

  async function onSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "We need a name to address the reply.";
    if (!form.company.trim()) errs.company = "Which mill or buying house?";
    if (!EMAIL_RE.test(form.email.trim())) errs.email = "Enter a valid work email.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setServerError("");
    setSubmitting(true);
    try {
      await submitEnquiry(form);
      setSent(true);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setForm(initialForm);
    setErrors({});
    setSent(false);
  }

  return (
    <section id="contact" className="ff-section ff-section--dark">
      <div className="ff-contact-grid">
        <div data-reveal="left">
          <div className="ff-kicker ff-kicker--dark">08 — Enquiries</div>
          <h2 className="ff-heading">Send the count, we&apos;ll send the cone</h2>
          <div className="ff-contact-copy">
            <p>
              Tell us the count, volume and delivery window. You&apos;ll get a quote and a physical sample — no
              discovery call required.
            </p>
          </div>
          <div className="ff-contact-details">
            {CONTACTS.map((d) => (
              <div className="ff-contact-row" key={d.label}>
                <span className="ff-contact-dot" />
                <div>
                  <div className="ff-contact-label">{d.label}</div>
                  <div className="ff-contact-value">{d.value}</div>
                  <div className="ff-contact-sub">{d.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ff-contact-panel blueprint" data-reveal="right">
          <i className="corner tl" />
          <i className="corner tr" />
          <i className="corner bl" />
          <i className="corner br" />

          {sent ? (
            <div className="ff-form-success">
              <span className="ff-form-success-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b9a684" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "clamp(24px, 2.4vw, 34px)", margin: 0, textTransform: "uppercase" }}>
                Enquiry logged
              </h3>
              <p style={{ margin: 0, maxWidth: "40ch", fontSize: 14.5, lineHeight: 1.7, color: "rgba(244,240,232,0.68)" }}>
                Our technical desk replies within one working day, with a sample dispatched against your count.
              </p>
              <button type="button" className="ff-btn ff-btn-ghost ff-btn-ghost--dark" onClick={resetForm}>
                Send another
              </button>
            </div>
          ) : (
            <form className="ff-form" onSubmit={onSubmit} noValidate>
              <label className={`ff-field${errors.name ? " has-error" : ""}`}>
                <span className="ff-field-label">Full name</span>
                <input type="text" placeholder="Jane Doe" {...field("name")} />
                <span className="ff-field-error">{errors.name || ""}</span>
              </label>
              <label className={`ff-field${errors.company ? " has-error" : ""}`}>
                <span className="ff-field-label">Company</span>
                <input type="text" placeholder="Northern Mills Ltd." {...field("company")} />
                <span className="ff-field-error">{errors.company || ""}</span>
              </label>
              <label className={`ff-field${errors.email ? " has-error" : ""}`}>
                <span className="ff-field-label">Work email</span>
                <input type="email" placeholder="jane@mill.com" {...field("email")} />
                <span className="ff-field-error">{errors.email || ""}</span>
              </label>
              <label className="ff-field">
                <span className="ff-field-label">Requirement</span>
                <textarea rows="4" placeholder="Counts, volume, shades, delivery window" {...field("message")} />
              </label>

              {serverError && <div className="ff-form-error-banner">{serverError}</div>}

              <button type="submit" className="ff-btn ff-btn-accent" disabled={submitting}>
                {submitting && <span className="ff-btn-spinner" />}
                <span>{submitting ? "Sending" : "Send enquiry"}</span>
              </button>
              <p className="ff-form-note">We reply from a named technician, never a sales queue.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
