import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useToast } from "../context/ToastContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 10;

// Mirrors the server's rules so mistakes show up before a round trip; the
// server validates everything again and is the source of truth.
function passwordProblem(pw) {
  if (pw.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (new TextEncoder().encode(pw).length > 72) return "Use at most 72 characters.";
  if (!/[A-Za-z]/.test(pw)) return "Include at least one letter.";
  if (!/\d/.test(pw)) return "Include at least one number.";
  return "";
}

function Field({ label, error, children }) {
  return (
    <label className={`ff-field${error ? " has-error" : ""}`}>
      <span className="ff-field-label">{label}</span>
      {children}
      <span className="ff-field-error">{error || ""}</span>
    </label>
  );
}

function SaveButton({ saving, children, disabled }) {
  return (
    <div className="ff-admin-form-actions">
      <button type="submit" className="ff-btn ff-btn-primary" disabled={saving || disabled}>
        {saving && <span className="ff-btn-spinner" />}
        <span>{children}</span>
      </button>
    </div>
  );
}

function UsernameSection({ admin, refresh }) {
  const toast = useToast();
  const [name, setName] = useState(admin.name || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setName(admin.name || ""), [admin.name]);

  async function onSubmit(e) {
    e.preventDefault();
    const value = name.trim();
    if (value.length < 2 || value.length > 60) {
      setError("Username must be 2–60 characters.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await api.put("/admin/me/profile", { name: value });
      await refresh();
      toast.success("Username updated.");
    } catch (err) {
      setError(err.errors?.name || err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ff-admin-panel">
      <h2>Update username</h2>
      <form className="ff-admin-form" onSubmit={onSubmit} noValidate>
        <Field label="Username" error={error}>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="nickname" />
        </Field>
        <SaveButton saving={saving} disabled={name.trim() === (admin.name || "")}>
          Save username
        </SaveButton>
      </form>
    </section>
  );
}

function EmailSection({ admin, refresh }) {
  const toast = useToast();
  const [email, setEmail] = useState(admin.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => setEmail(admin.email), [admin.email]);

  const changed = email.trim().toLowerCase() !== admin.email;

  async function onSubmit(e) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    const found = {};
    if (!value || !EMAIL_RE.test(value)) found.email = "Enter a valid email address.";
    if (!currentPassword) found.currentPassword = "Enter your current password to change your email.";
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await api.put("/admin/me/profile", { email: value, currentPassword });
      setCurrentPassword("");
      await refresh();
      toast.success("Email updated. Use it the next time you log in.");
    } catch (err) {
      setErrors(err instanceof ApiError && Object.keys(err.errors).length ? err.errors : { email: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ff-admin-panel">
      <h2>Update email</h2>
      <form className="ff-admin-form" onSubmit={onSubmit} noValidate>
        <Field label="Email" error={errors.email}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        {changed && (
          <Field label="Current password" error={errors.currentPassword}>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
          </Field>
        )}
        <p className="ff-admin-hint">Your email is what you log in with, so changing it needs your current password.</p>
        <SaveButton saving={saving} disabled={!changed}>
          Save email
        </SaveButton>
      </form>
    </section>
  );
}

function PasswordSection() {
  const toast = useToast();
  const navigate = useNavigate();
  const { refresh } = useAdminAuth();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const found = {};
    if (!form.currentPassword) found.currentPassword = "Enter your current password.";
    const problem = passwordProblem(form.newPassword);
    if (problem) found.newPassword = problem;
    if (form.confirmPassword !== form.newPassword) found.confirmPassword = "Passwords do not match.";
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await api.post("/admin/me/change-password", form);
      // The server has ended this session; /me now answers 401, which clears
      // the signed-in admin and sends us back to the login screen.
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password changed. Please sign in again with your new password.");
      await refresh();
      navigate("/admin", { replace: true });
    } catch (err) {
      setErrors(err instanceof ApiError && Object.keys(err.errors).length ? err.errors : { currentPassword: err.message });
      setSaving(false);
    }
  }

  return (
    <section className="ff-admin-panel">
      <h2>Change password</h2>
      <form className="ff-admin-form" onSubmit={onSubmit} noValidate>
        <Field label="Current password" error={errors.currentPassword}>
          <input type="password" value={form.currentPassword} onChange={set("currentPassword")} autoComplete="current-password" />
        </Field>
        <Field label="New password" error={errors.newPassword}>
          <input type="password" value={form.newPassword} onChange={set("newPassword")} autoComplete="new-password" />
        </Field>
        <Field label="Confirm new password" error={errors.confirmPassword}>
          <input type="password" value={form.confirmPassword} onChange={set("confirmPassword")} autoComplete="new-password" />
        </Field>
        <p className="ff-admin-hint">At least {PASSWORD_MIN} characters, with a letter and a number. You'll be signed out and need to log in again.</p>
        <SaveButton saving={saving}>Change password</SaveButton>
      </form>
    </section>
  );
}

export default function Profile() {
  const { admin, refresh } = useAdminAuth();
  if (!admin) return null;

  return (
    <div className="ff-admin-panel-grid" style={{ gridTemplateColumns: "minmax(0, 560px)" }}>
      <UsernameSection admin={admin} refresh={refresh} />
      <EmailSection admin={admin} refresh={refresh} />
      <PasswordSection />
    </div>
  );
}
