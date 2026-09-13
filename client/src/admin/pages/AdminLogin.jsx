import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import { ApiError } from "../api/client";

export default function AdminLogin() {
  const { admin, loading, login } = useAdminAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && admin) return <Navigate to="/admin/dashboard" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(form.email.trim(), form.password);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ff-admin-login">
      <form className="ff-admin-login-card blueprint" onSubmit={onSubmit} noValidate>
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
        <div className="ff-kicker">Fluid Fancy Fibre</div>
        <h1 className="ff-admin-login-title">Admin sign in</h1>

        <label className="ff-field">
          <span className="ff-field-label">Email</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </label>
        <label className="ff-field">
          <span className="ff-field-label">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
        </label>

        {error && <div className="ff-form-error-banner">{error}</div>}

        <button type="submit" className="ff-btn ff-btn-primary" disabled={submitting}>
          {submitting && <span className="ff-btn-spinner" />}
          <span>{submitting ? "Signing in" : "Sign in"}</span>
        </button>
      </form>
    </div>
  );
}
