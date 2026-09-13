import { useState } from "react";
import { api } from "../api/client";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useToast } from "../context/ToastContext";

export default function Settings() {
  const { admin } = useAdminAuth();
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 10) {
      setError("New password must be at least 10 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      await api.put("/admin/me/password", { currentPassword, newPassword });
      toast.success("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ff-admin-panel-grid">
      <section className="ff-admin-panel">
        <h2>Account</h2>
        <dl className="ff-admin-detail-list">
          <dt>Email</dt>
          <dd>{admin?.email}</dd>
          <dt>Name</dt>
          <dd>{admin?.name || "—"}</dd>
          <dt>Last login</dt>
          <dd>{admin?.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : "—"}</dd>
        </dl>
      </section>

      <section className="ff-admin-panel">
        <h2>Change password</h2>
        <form className="ff-admin-form" onSubmit={onSubmit}>
          <label className="ff-field">
            <span className="ff-field-label">Current password</span>
            <input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </label>
          <label className="ff-field">
            <span className="ff-field-label">New password</span>
            <input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={10} />
          </label>
          <label className="ff-field">
            <span className="ff-field-label">Confirm new password</span>
            <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={10} />
          </label>
          {error && <div className="ff-form-error-banner">{error}</div>}
          <div className="ff-admin-form-actions">
            <button type="submit" className="ff-btn ff-btn-primary" disabled={saving}>
              {saving && <span className="ff-btn-spinner" />}
              <span>Update password</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
