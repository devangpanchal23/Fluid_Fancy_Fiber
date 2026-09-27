import { useEffect, useState } from 'react';
import { normalizeVideoUrl } from '../utils/videoSource';
import { resolveUploadUrl } from '../apiBase';

export default function VideoPlayer({ video, autoPlay = false }) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setLoading(true); setFailed(false); }, [video.url]);
  let source;
  try { source = normalizeVideoUrl(video.url); }
  catch { return <p role="alert">This video URL is invalid.</p>; }
  const style = { width: '100%', aspectRatio: '16 / 9', display: 'block', border: 0, objectFit: 'contain', background: '#111' };
  return <div>
    {loading && <p role="status">Loading video…</p>}
    {source.sourceType === 'drive' ? <>
      <iframe key={source.url} src={source.url} title={video.title || 'Google Drive video'} allow="autoplay; fullscreen" allowFullScreen style={style} onLoad={() => setLoading(false)} />
      <p>Drive video unavailable? Check that sharing allows “Anyone with the link”. <a href={source.url} target="_blank" rel="noreferrer">Open in Google Drive</a></p>
    </> : <>
      <video key={source.url} src={source.url} poster={video.thumbnail?.url ? resolveUploadUrl(video.thumbnail.url) : undefined} controls playsInline preload="metadata" autoPlay={autoPlay} style={style}
        onLoadedMetadata={() => setLoading(false)} onCanPlay={() => setLoading(false)} onError={() => { setFailed(true); setLoading(false); }} />
      {failed && <p role="alert">Video could not play. Check the URL, access permissions and codec. <a href={source.url} target="_blank" rel="noreferrer">Open video</a></p>}
    </>}
  </div>;
}
