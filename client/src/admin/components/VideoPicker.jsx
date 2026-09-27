import { useState } from 'react';
import VideoLibrary from '../pages/VideoLibrary';
import VideoPlayer from '../../components/VideoPlayer';
import VideoLinkInput from './VideoLinkInput';

export default function VideoPicker({ video, onChange, onUploadingChange, disabled }) {
  const [mode, setMode] = useState(video.videoMedia || !video.url ? 'library' : 'url');
  const [uploading, setUploading] = useState(false);
  function choose(media) { onChange({ url: media.url, publicId: ['drive', 'direct'].includes(media.provider) ? '' : media.publicId, videoMedia: media._id, sourceType: ['drive', 'direct'].includes(media.provider) ? media.provider : 'library', thumbnail: media.thumbnail || null, duration: media.duration ?? null }); }
  function editUrl(value) {
    // Keep typed text in the parent so Save/Enter always validates the latest
    // input and can never silently submit the previous selection.
    onChange({ url: value, publicId: '', videoMedia: null, sourceType: 'direct', thumbnail: null, duration: null });
  }
  return <div>
    <div className="ff-admin-toolbar" role="group" aria-label="Video source method">
      <button type="button" className={`ff-btn ${mode === 'library' ? 'ff-btn-primary' : 'ff-btn-ghost'}`} aria-pressed={mode === 'library'} disabled={disabled || uploading} onClick={() => { setMode('library'); }}>Choose from Video Library</button>
      <button type="button" className={`ff-btn ${mode === 'url' ? 'ff-btn-primary' : 'ff-btn-ghost'}`} aria-pressed={mode === 'url'} disabled={disabled || uploading} onClick={() => { setMode('url'); }}>Paste URL</button>
    </div>
    {mode === 'library' ? <VideoLibrary selectedId={video.videoMedia} disabled={disabled} onSelect={choose} onUploadingChange={(value) => { setUploading(value); onUploadingChange?.(value); }} /> : <VideoLinkInput initialUrl={video.videoMedia ? '' : video.url} disabled={disabled} onDraftChange={editUrl} onSelect={choose} onBusyChange={(value) => { setUploading(value); onUploadingChange?.(value); }} />}

    {video.url && <div style={{ maxWidth: 560, marginTop: 20 }}><p>Current video source: {video.videoMedia ? 'Video Library' : 'URL'}</p><VideoPlayer video={video} /><button type="button" className="ff-admin-link-btn" disabled={disabled || uploading} onClick={() => { onChange({ url: '', publicId: '', videoMedia: null, sourceType: 'direct', thumbnail: null, duration: null }); }}>Remove selection</button></div>}
  </div>;
}
