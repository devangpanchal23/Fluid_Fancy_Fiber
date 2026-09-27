import { useRef, useState } from 'react';
import { api } from '../api/client';
import { normalizeVideoUrl } from '../../utils/videoSource';

export default function VideoLinkInput({ initialUrl = '', onSelect, onDraftChange, onBusyChange, disabled = false }) {
  const [url, setUrl] = useState(initialUrl);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const busy = useRef(false);
  async function add() {
    if (busy.current || disabled) return;
    setError(''); setMessage('');
    let source;
    try { source = normalizeVideoUrl(url); }
    catch (e) { setError(e.message); return; }
    busy.current = true; setSaving(true); onBusyChange?.(true);
    try {
      const { media } = await api.post('/video-media', { url: source.url, originalName: name.trim() });
      setUrl(media.url); setMessage('Video saved in Video Library.'); onSelect?.(media);
    } catch (e) { setError(e.message); }
    finally { busy.current = false; setSaving(false); onBusyChange?.(false); }
  }
  function enter(e) { if (e.key === 'Enter') { e.preventDefault(); add(); } }
  return <fieldset disabled={disabled || saving} style={{ border: 0, margin: 0, padding: 0 }}>
    <label className="ff-field"><span className="ff-field-label">Video name (optional)</span><input value={name} maxLength={255} onChange={(e) => setName(e.target.value)} onKeyDown={enter} /></label>
    <label className="ff-field"><span className="ff-field-label">Video URL</span><input type="url" value={url} placeholder="https://drive.google.com/file/d/…/view" onChange={(e) => { setUrl(e.target.value); setError(''); setMessage(''); onDraftChange?.(e.target.value); }} onKeyDown={enter} /></label>
    <button type="button" className="ff-btn ff-btn-ghost" onClick={add}>{saving ? 'Saving to library…' : 'Add link to Video Library'}</button>
    <p>Paste a Google Drive video shared with “Anyone with the link”, or a direct MP4/WEBM/MOV URL. The link is saved for reuse; the file stays with its host.</p>
    {error && <p className="ff-field-error" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
  </fieldset>;
}
