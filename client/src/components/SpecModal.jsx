import { useEffect, useState } from "react";
import { submitSpecRequest } from "../api/enquiries";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function SpecModal({ isOpen, title, lineName, onClose }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    setEmail("");
    setError("");
    setBusy(false);
    setSent(false);

    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  async function onSubmit(e) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid work email.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await submitSpecRequest({ email: email.trim(), lineName });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Request a spec sheet"
      className="ff-modal-backdrop"
      onClick={onClose}
    >
      <div className="ff-modal" onClick={(e) => e.stopPropagation()}>
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
        <button type="button" aria-label="Close" className="ff-modal-close" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#17140f" strokeWidth="1.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="ff-kicker">Technical desk</div>
        <h3>{title}</h3>
        <p className="ff-modal-lede">
          Leave a work email and we&apos;ll send the full specification sheet, including count range, twist
          tolerance and packing detail.
        </p>

        {sent ? (
          <div className="ff-modal-success">Sent. Check your inbox in the next few minutes.</div>
        ) : (
          <form className="ff-modal-form" onSubmit={onSubmit} noValidate>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@mill.com"
              className={error ? "has-error" : ""}
            />
            {error && <span className="ff-modal-error">{error}</span>}
            <button type="submit" className="ff-btn ff-btn-primary" disabled={busy}>
              {busy && <span className="ff-btn-spinner" />}
              <span>{busy ? "Sending" : "Send it over"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
