import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeVideoUrl, validateVideoFile, MAX_VIDEO_SIZE, videoUploadConfig } from './videoSource.js';
const id = 'abcdefghijk_123456789';
for (const path of [`file/d/${id}/view?usp=sharing`, `file/d/${id}/preview`, `open?id=${id}`, `uc?export=download&id=${id}`]) {
  test(`Drive conversion: ${path}`, () => assert.deepEqual(normalizeVideoUrl(`https://drive.google.com/${path}`), { sourceType: 'drive', url: `https://drive.google.com/file/d/${id}/preview` }));
}
test('Drive resource keys are preserved', () => assert.match(normalizeVideoUrl(`https://drive.google.com/file/d/${id}/view?resourcekey=abc`).url, /resourcekey=abc$/));
test('direct URLs preserve signed query strings', () => assert.equal(normalizeVideoUrl(' https://cdn.example.com/movie.MP4?token=abc ').url, 'https://cdn.example.com/movie.MP4?token=abc'));
for (const url of ['', 'not a url', 'javascript:alert(1)', 'http://example.com/a.mp4', 'https://user:pass@example.com/a.mp4', 'https://example.com:8443/a.mp4', 'https://youtube.com/watch?v=abc', 'https://drive.google.com/drive/folders/abc', 'https://drive.google.com/open?id=bad', 'https://drive.google.com.evil.com/file/d/abc/view']) {
  test(`rejects invalid/unsupported source ${url}`, () => assert.throws(() => normalizeVideoUrl(url)));
}
test('file types, empty files and exact size boundary', () => {
  for (const [name, type] of [['a.MP4', 'video/mp4'], ['a.webm', 'video/webm'], ['a.mov', 'video/quicktime'], ['a.mov', '']]) assert.equal(validateVideoFile({ name, type, size: MAX_VIDEO_SIZE }), null);
  assert.match(validateVideoFile({ name: 'a.mp4', type: 'video/mp4', size: MAX_VIDEO_SIZE + 1 }), /too large/);
  assert.match(validateVideoFile({ name: 'a.mp4', type: 'video/mp4', size: 0 }), /empty/);
  assert.match(validateVideoFile({ name: 'a.txt', type: 'text/plain', size: 1 }), /Unsupported/);
  assert.match(validateVideoFile({ name: 'a.mp4', type: 'image/png', size: 1 }), /Unsupported/);
});
test('video preset precedence, legacy config, trimming and runtime fallback', () => {
  assert.deepEqual(videoUploadConfig({ VITE_CLOUDINARY_CLOUD_NAME: ' cloud ', VITE_CLOUDINARY_UPLOAD_PRESET: 'old', VITE_CLOUDINARY_VIDEO_UPLOAD_PRESET: ' video ' }), { cloudName: 'cloud', uploadPreset: 'video' });
  assert.equal(videoUploadConfig({ VITE_CLOUDINARY_CLOUD_NAME: 'cloud', VITE_CLOUDINARY_UPLOAD_PRESET: 'old' }).uploadPreset, 'old');
  assert.deepEqual(videoUploadConfig({}, { cloudName: 'cloud', uploadPreset: 'video' }), { cloudName: 'cloud', uploadPreset: 'video' });
  assert.throws(() => videoUploadConfig({}), /configuration/);
  assert.throws(() => videoUploadConfig({ VITE_CLOUDINARY_CLOUD_NAME: 'your-cloud-name', VITE_CLOUDINARY_UPLOAD_PRESET: 'preset' }), /configuration/);
});
