import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import ConfirmDialog from "../components/ConfirmDialog";
import EnquiryDetails, { STATUS_OPTIONS } from "../components/EnquiryDetails";

export default function EnquiryList() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get("/enquiries", { q, status, type, page, limit: 15 })
      .then((d) => {
        if (cancelled) return;
        setItems(d.items);
        setTotal(d.total);
        setPages(d.pages);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [q, status, type, page]);

  async function onStatusChange(enquiry, newStatus) {
    try {
      const { enquiry: updated } = await api.put(`/enquiries/${enquiry._id}`, { status: newStatus });
      setItems((it) => it.map((e) => (e._id === updated._id ? updated : e)));
      setSelected(updated);
      toast.success("Status updated.");
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function confirmDelete() {
    const enquiry = pendingDelete;
    setPendingDelete(null);
    setSelected(null);
    try {
      await api.delete(`/enquiries/${enquiry._id}`);
      setItems((it) => it.filter((e) => e._id !== enquiry._id));
      toast.success("Enquiry deleted.");
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <div className="ff-admin-toolbar">
        <input
          type="search"
          placeholder="Search enquiries…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className="ff-admin-search"
        />
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">All types</option>
          <option value="contact">Contact</option>
          <option value="spec">Spec sheet</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="ff-admin-error-state">{error}</div>}
      {loading ? (
        <div className="ff-admin-loading-state">Loading enquiries…</div>
      ) : items.length === 0 ? (
        <div className="ff-admin-empty-state">No enquiries match these filters.</div>
      ) : (
        <div className="ff-admin-table-wrap">
          <table className="ff-admin-table">
            <thead>
              <tr>
                <th>From</th>
                <th>Type</th>
                <th>Received</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e._id}>
                  <td>
                    <button type="button" className="ff-admin-table-title ff-admin-link-btn" onClick={() => setSelected(e)}>
                      {e.name || e.email}
                    </button>
                  </td>
                  <td>{e.type === "spec" ? "Spec sheet" : "Contact"}</td>
                  <td>{new Date(e.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span className={`ff-admin-badge ff-admin-badge--${e.status}`}>{e.status.replace("_", " ")}</span>
                  </td>
                  <td className="ff-admin-table-actions">
                    <button type="button" onClick={() => setSelected(e)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="ff-admin-pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {pages} · {total} total
          </span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}

      <EnquiryDetails
        enquiry={selected}
        onClose={() => setSelected(null)}
        onStatusChange={onStatusChange}
        onDelete={(e) => setPendingDelete(e)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this enquiry?"
        message="This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
