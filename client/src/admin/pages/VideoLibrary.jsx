import { useEffect, useState } from 'react';
import { api } from '../api/client';
import VideoLinkInput from '../components/VideoLinkInput';
import VideoUploader from '../components/VideoUploader';
import ConfirmDialog from '../components/ConfirmDialog';
import VideoPlayer from '../../components/VideoPlayer';

export default function VideoLibrary({ onSelect, selectedId, disabled = false, onUploadingChange }) {
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    api.get('/video-media', { q, page, limit: 12 }).then((data) => {
      if (!active) return;
      if (page > data.pages) { setPage(data.pages); return; }
      setItems(data.items); setPages(data.pages);
    }).catch((e) => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [q, page, revision]);
  async function remove() {
    if (deleting || !pendingDelete) return;
    const id = pendingDelete._id;
    setPendingDelete(null); setDeleting(true); setError('');
    try { await api.delete(`/video-media/${id}`); setRevision((v) => v + 1); }
    catch (e) { setError(e.message); }
    finally { setDeleting(false); }
  }
  function added(media) { setQ(''); setPage(1); setRevision((v) => v + 1); onSelect?.(media); }
  return <div>
    <fieldset disabled={disabled} style={{ border: 0, padding: 0, margin: 0 }}>
      <fieldset disabled={adding} style={{ border: 0, padding: 0 }}><VideoUploader onUploadingChange={(value) => { setUploading(value); onUploadingChange?.(value); }} onChange={added} /></fieldset>
      {!onSelect && <details><summary>Add a Google Drive or video URL</summary><VideoLinkInput disabled={uploading} onBusyChange={setAdding} onSelect={added} /></details>}
      <div className="ff-admin-toolbar"><input type="search" className="ff-admin-search" aria-label="Search videos by filename" placeholder="Search by filename…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
      {error && <div className="ff-admin-error-state" role="alert">{error} <button type="button" className="ff-admin-link-btn" onClick={() => setRevision((v) => v + 1)}>Refresh library</button></div>}
      {loading ? <p className="ff-admin-loading-state">Loading videos…</p> : <>
        {!items.length && !error && <p className="ff-admin-empty-state">{q ? 'No videos match your search.' : 'No videos uploaded yet.'}</p>}
        <ul className="ff-media-grid ff-media-grid--library">{items.map((media) => <li key={media._id} className="ff-media-card">
          <VideoPlayer video={{ ...media, title: media.originalName }} />
          <div className="ff-media-card-body">
            <p className="ff-media-card-filename" title={media.originalName}>{media.originalName}</p>
            <p className="ff-media-card-meta">{new Date(media.createdAt).toLocaleDateString()} · {media.provider === 'drive' ? 'Google Drive' : media.provider === 'direct' ? 'Video URL' : `${(media.size / 1024 / 1024).toFixed(1)} MiB`}</p>
            {onSelect ? <button type="button" className="ff-btn ff-btn-ghost" aria-pressed={String(selectedId) === String(media._id)} onClick={() => onSelect(media)}>{String(selectedId) === String(media._id) ? 'Selected' : 'Choose video'}</button> : <button type="button" disabled={deleting} className="ff-admin-link-btn" onClick={() => setPendingDelete(media)}>Delete</button>}
          </div>
        </li>)}</ul>
      </>}
      {pages > 1 && <div className="ff-admin-pagination"><button type="button" disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>Previous</button><span>Page {page} of {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage((v) => v + 1)}>Next</button></div>}
    </fieldset>
    <ConfirmDialog open={Boolean(pendingDelete)} title="Delete this library video?" message={`“${pendingDelete?.originalName || ''}” ${pendingDelete?.provider === "drive" || pendingDelete?.provider === "direct" ? "will be removed from this library only. The original file stays with its host." : "will be permanently removed from Cloudinary."} Videos used by content cannot be deleted.`} confirmLabel="Delete" danger onConfirm={remove} onCancel={() => setPendingDelete(null)} />
  </div>;
}
