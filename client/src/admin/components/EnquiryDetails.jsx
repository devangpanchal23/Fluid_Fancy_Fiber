const STATUS_OPTIONS = [
  ["new", "New"],
  ["in_progress", "In Progress"],
  ["contacted", "Contacted"],
  ["closed", "Closed"],
  ["archived", "Archived"]
];

export default function EnquiryDetails({ enquiry, onClose, onStatusChange, onDelete }) {
  if (!enquiry) return null;

  return (
    <div className="ff-admin-dialog-overlay" role="presentation" onMouseDown={onClose}>
      <div className="ff-admin-panel-drawer" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="ff-admin-drawer-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="ff-kicker">{enquiry.type === "spec" ? "Spec sheet request" : "Contact enquiry"}</div>
        <h2>{enquiry.name || enquiry.email}</h2>

        <dl className="ff-admin-detail-list">
          {enquiry.company && (
            <>
              <dt>Company</dt>
              <dd>{enquiry.company}</dd>
            </>
          )}
          <dt>Email</dt>
          <dd>
            <a href={`mailto:${enquiry.email}`}>{enquiry.email}</a>
          </dd>
          {enquiry.lineName && (
            <>
              <dt>Product line</dt>
              <dd>{enquiry.lineName}</dd>
            </>
          )}
          {enquiry.message && (
            <>
              <dt>Message</dt>
              <dd>{enquiry.message}</dd>
            </>
          )}
          <dt>Received</dt>
          <dd>{new Date(enquiry.createdAt).toLocaleString()}</dd>
        </dl>

        <label className="ff-field">
          <span className="ff-field-label">Status</span>
          <select value={enquiry.status} onChange={(e) => onStatusChange(enquiry, e.target.value)}>
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="ff-admin-form-actions">
          <button type="button" className="ff-btn ff-btn-danger" onClick={() => onDelete(enquiry)}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export { STATUS_OPTIONS };
