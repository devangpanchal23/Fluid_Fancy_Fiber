export const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
export const VIDEO_ACCEPT = '.mp4,.webm,.mov,video/mp4,video/webm,video/quicktime';
export function validateVideoFile(file) {
  const ext = file.name?.split('.').pop()?.toLowerCase();
  const types = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
  if (!types[ext] || (file.type && file.type !== types[ext] && file.type !== 'application/octet-stream')) return 'Unsupported file type. Choose an MP4, WEBM or MOV video.';
  if (!file.size) return 'The video file is empty.';
  if (file.size > MAX_VIDEO_SIZE) return 'Video is too large. Maximum size is 100 MiB (104,857,600 bytes).';
  return null;
}
export function normalizeVideoUrl(value) {
  let url;
  try { url = new URL(String(value || '').trim()); } catch { throw new Error('Enter a valid HTTPS video URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.href.length > 2000) throw new Error('Use a public HTTPS video URL without credentials or a custom port.');
  if (url.hostname === 'drive.google.com') {
    const match = url.pathname.match(/^\/file\/d\/([\w-]+)\/(?:view|preview|edit)\/?$/);
    const id = match?.[1] || (['/open', '/uc'].includes(url.pathname) ? url.searchParams.get('id') : null);
    if (!id || !/^[\w-]{10,}$/.test(id)) throw new Error('Use a Google Drive file share link, such as https://drive.google.com/file/d/FILE_ID/view. Folder links are not videos.');
    const preview = new URL(`https://drive.google.com/file/d/${id}/preview`);
    const key = url.searchParams.get('resourcekey');
    if (key) preview.searchParams.set('resourcekey', key);
    return { url: preview.href, sourceType: 'drive' };
  }
  if (!/\.(mp4|webm|mov)$/i.test(url.pathname)) throw new Error('Use a direct .mp4, .webm or .mov URL, or a Google Drive file share link. Web pages are not playable video files.');
  return { url: url.href, sourceType: 'direct' };
}
export function videoUploadConfig(env = {}, fallback = {}) {
  const clean = (v) => typeof v === 'string' ? v.trim() : '';
  const cloudName = clean(env.VITE_CLOUDINARY_CLOUD_NAME) || clean(fallback.cloudName);
  const uploadPreset = clean(env.VITE_CLOUDINARY_VIDEO_UPLOAD_PRESET) || clean(env.VITE_CLOUDINARY_UPLOAD_PRESET) || clean(fallback.uploadPreset);
  if (!cloudName || !uploadPreset || /your-|replace-/i.test(`${cloudName} ${uploadPreset}`)) throw new Error('Video uploads need Cloudinary configuration. Set the cloud name and video upload preset in client/.env (restart/rebuild Vite), or configure the server fallback. See docs/video-library.md.');
  if (!/^[a-zA-Z0-9_-]+$/.test(cloudName)) throw new Error('Invalid Cloudinary cloud name.');
  return { cloudName, uploadPreset };
}
