import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { VIDEO_ACCEPT, validateVideoFile, videoUploadConfig } from '../../utils/videoSource';

export default function VideoUploader({ onChange, onUploadingChange }) {
  const input = useRef(null);
  const xhrRef = useRef(null);
  const mounted = useRef(true);
  const busy = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; xhrRef.current?.abort(); }; }, []);
  useEffect(() => {
    function warn(event) { if (uploading || pending) { event.preventDefault(); event.returnValue = ''; } }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [uploading, pending]);
  function state(value) { busy.current = value; if (mounted.current) { setUploading(value); onUploadingChange?.(value); } }
  async function register(record) {
    const { media } = await api.post('/video-media', record);
    if (mounted.current) { setPending(null); onChange?.(media); }
  }
  async function retry() {
    if (busy.current) return;
    state(true); setError('');
    try { await register(pending); } catch (e) { if (mounted.current) setError(`Video uploaded, but library save failed: ${e.message} Retry saving below; do not upload again.`); }
    finally { state(false); }
  }
  async function upload(file) {
    if (busy.current) return;
    const invalid = validateVideoFile(file);
    setError(invalid || '');
    if (invalid) return;
    state(true); setProgress(0);
    try {
      // Verify server credentials before sending a large file, and use runtime
      // config when the production bundle was built without VITE_* values.
      const fallback = await api.get('/video-media/config');
      const config = videoUploadConfig(import.meta.env, fallback);
      if (config.cloudName !== fallback.cloudName) throw new Error('Client and server Cloudinary cloud names must match. Update environment configuration and rebuild.');
      if (!mounted.current) return;
      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest(); xhrRef.current = xhr;
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${config.cloudName}/video/upload`);
        xhr.timeout = 15 * 60 * 1000;
        xhr.upload.onprogress = (event) => { if (mounted.current && event.lengthComputable) setProgress(Math.round(event.loaded / event.total * 100)); };
        xhr.onload = () => {
          let body; try { body = JSON.parse(xhr.responseText); } catch { /* handled below */ }
          if (xhr.status >= 200 && xhr.status < 300 && body?.public_id && body.resource_type === 'video') resolve(body);
          else reject(new Error(body?.error?.message || 'Cloudinary upload failed. Please retry.'));
        };
        xhr.onerror = () => reject(new Error('Upload failed. Check your connection and retry.'));
        xhr.ontimeout = () => reject(new Error('Upload timed out after 15 minutes. Retry on a faster connection.'));
        xhr.onabort = () => reject(new Error('Upload cancelled.'));
        const form = new FormData(); form.append('file', file); form.append('upload_preset', config.uploadPreset);
        xhr.send(form);
      });
      xhrRef.current = null;
      const record = { publicId: data.public_id, originalName: file.name };
      if (mounted.current) setPending(record);
      try { await register(record); }
      catch (e) { throw new Error(`Video uploaded, but library save failed: ${e.message} Retry saving below; do not upload again.`); }
    } catch (e) { if (mounted.current) setError(e.message); }
    finally { xhrRef.current = null; state(false); }
  }
  return <div className="ff-admin-uploader">
    <button type="button" className="ff-btn ff-btn-primary" disabled={uploading || Boolean(pending)} onClick={() => input.current?.click()}>+ Upload video</button>
    <input ref={input} type="file" accept={VIDEO_ACCEPT} hidden onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) upload(file); }} />
    <p>MP4, WEBM or MOV · Maximum 100 MiB</p>
    {uploading && <><p role="status">{progress === 100 ? 'Upload received. Processing and saving to library…' : `Uploading… ${progress}%`}</p><progress value={progress} max="100" aria-label="Video upload progress" style={{ width: '100%', accentColor: 'var(--ff-accent)' }} />{xhrRef.current && <button type="button" className="ff-btn ff-btn-ghost" onClick={() => xhrRef.current?.abort()}>Cancel upload</button>}</>}
    {error && <p className="ff-field-error" role="alert">{error}</p>}
    {pending && !uploading && <button type="button" className="ff-btn ff-btn-ghost" onClick={retry}>Retry library save</button>}
  </div>;
}
