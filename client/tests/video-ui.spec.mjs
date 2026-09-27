// Run with PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node client/tests/video-ui.spec.mjs
// Starts an isolated Vite server. API/provider responses are mocked; no live data is modified.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), define: { 'import.meta.env.VITE_API_URL': JSON.stringify('/api') }, server: { host: '127.0.0.1', port: 5198, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
const page = await browser.newPage();
const errors = []; page.on('pageerror', (error) => errors.push(error.message));
let saved, failRegistration = true;
let registrations = 0, uploads = 0, failLink = false;
const links = [];
const media = { _id: '507f1f77bcf86cd799439011', publicId: 'clip', url: 'https://res.cloudinary.com/test/video/upload/clip.mp4', thumbnail: { url: 'https://res.cloudinary.com/test/video/upload/clip.jpg' }, originalName: 'mill.mp4', size: 1000, createdAt: '2026-09-28T00:00:00Z' };
const ok = (route, data) => route.fulfill({ json: { success: true, data } });
try {
  await page.route('https://res.cloudinary.com/**', (route) => route.fulfill({ status: 404 }));
  await page.route('https://drive.google.com/**', (route) => route.fulfill({ body: '<p>Drive player stub</p>', contentType: 'text/html' }));
  await page.route('https://api.cloudinary.com/**', async (route) => { uploads++; await route.fulfill({ json: { public_id: 'clip', resource_type: 'video' } }); });
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const req = route.request(), path = new URL(req.url()).pathname;
    if (path === '/api/admin/me') return ok(route, { admin: { _id: 'admin', name: 'Test Admin', email: 'test@example.com' } });
    if (path === '/api/video-media/config') return ok(route, { cloudName: 'test', uploadPreset: 'fff_videos_unsigned' });
    if (path === '/api/video-media' && req.method() === 'POST') {
      const body = req.postDataJSON();
      if (body.url && !body.publicId) {
        if (failLink) return route.fulfill({ status: 503, json: { success: false, message: 'Link save temporarily unavailable' } });
        const preview = body.url.replace('/view', '/preview');
        let linked = links.find((item) => item.url === preview);
        if (!linked) { linked = { _id: `507f1f77bcf86cd7994390${12 + links.length}`, provider: 'drive', url: preview, publicId: 'link:test', originalName: body.originalName || 'Drive video', createdAt: media.createdAt }; links.push(linked); }
        return ok(route, { media: linked });
      }
      registrations++;
      if (failRegistration) return route.fulfill({ status: 503, json: { success: false, message: 'Database temporarily unavailable' } });
      return ok(route, { media });
    }
    if (path === '/api/video-media') return ok(route, { items: [media, ...links], pages: 1, total: 1 + links.length });
    if (path === '/api/videos' && req.method() === 'POST') { saved = req.postDataJSON(); return ok(route, { video: { ...saved, _id: 'content' } }); }
    if (path === '/api/videos/content' && req.method() === 'PUT') { saved = req.postDataJSON(); return ok(route, { video: { ...saved, _id: 'content' } }); }
    if (path === '/api/videos/content') return ok(route, { video: { ...media, videoMedia: media._id, sourceType: 'library', title: 'Existing mill', status: 'draft' } });
    if (path === '/api/videos') return ok(route, { items: [], total: 0, pages: 1 });
    return ok(route, {});
  });
  await page.goto('http://127.0.0.1:5198/admin/videos/new');
  await page.getByRole('button', { name: 'Paste URL', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Mill video');
  await page.getByLabel('Video URL', { exact: true }).fill('https://example.com/not-video');
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.getByText('Use a direct .mp4', { exact: false }).first().waitFor(); assert.equal(saved, undefined);
  await page.getByLabel('Video URL', { exact: true }).fill('https://drive.google.com/file/d/abcdefghijk123/view');
  await page.getByLabel('Video URL', { exact: true }).press('Enter');
  assert.match(await page.locator('iframe').getAttribute('src'), /\/preview$/);
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.waitForURL('**/admin/videos'); assert.equal(saved.sourceType, 'drive'); assert.equal(saved.publicId, ''); assert.equal(saved.videoMedia, links[0]._id);

  await page.goto('http://127.0.0.1:5198/admin/videos/content/edit');
  await page.getByRole('button', { name: 'Paste URL', exact: true }).click();
  await page.getByLabel('Video URL', { exact: true }).fill('https://example.com/other.mp4');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.waitForURL('**/admin/videos'); assert.equal(saved.videoMedia, null); assert.equal(saved.thumbnail, null); assert.equal(saved.url, 'https://example.com/other.mp4');

  await page.goto('http://127.0.0.1:5198/admin/videos/new');
  await page.getByLabel('Title', { exact: true }).fill('Library video');
  await page.getByRole('button', { name: 'Choose video', exact: true }).first().click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.waitForURL('**/admin/videos'); assert.equal(saved.videoMedia, media._id);

  await page.goto('http://127.0.0.1:5198/admin/video-library');
  await page.getByText('Add a Google Drive or video URL', { exact: true }).click();
  await page.getByLabel('Video name (optional)', { exact: true }).fill('Weaving demonstration');
  await page.getByLabel('Video URL', { exact: true }).fill('https://drive.google.com/file/d/anotherdrive123/view');
  failLink = true;
  await page.getByRole('button', { name: 'Add link to Video Library', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Link save temporarily unavailable' }).waitFor();
  assert.equal(links.length, 1);
  failLink = false;
  await page.getByRole('button', { name: 'Add link to Video Library', exact: true }).click();
  await page.getByText('Video saved in Video Library.', { exact: true }).waitFor();
  await page.getByText('Weaving demonstration', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Add link to Video Library', exact: true }).click();
  await page.getByText('Video saved in Video Library.', { exact: true }).waitFor(); assert.equal(links.length, 2);
  await page.reload();
  await page.getByText('Weaving demonstration', { exact: true }).waitFor();
  const file = page.locator('input[type=file]');
  await file.setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('bad') });
  await page.getByRole('alert').filter({ hasText: 'Unsupported file type' }).waitFor(); assert.equal(uploads, 0);
  await file.setInputFiles({ name: 'mill.mp4', mimeType: 'video/mp4', buffer: Buffer.from('mock video') });
  await page.getByRole('button', { name: 'Retry library save' }).waitFor(); assert.equal(uploads, 1);
  failRegistration = false;
  await page.getByRole('button', { name: 'Retry library save' }).click();
  await page.getByRole('button', { name: '+ Upload video', exact: true }).waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.body.textContent.includes('Retry library save'));
  assert.equal(uploads, 1); assert.equal(registrations, 2);
  await page.goto('http://127.0.0.1:5198/admin/videos/new');
  await page.getByLabel('Title', { exact: true }).fill('Reuse Drive video');
  await page.locator('.ff-media-card').filter({ hasText: 'Weaving demonstration' }).getByRole('button', { name: 'Choose video', exact: true }).click();
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.waitForURL('**/admin/videos'); assert.equal(saved.videoMedia, links[1]._id); assert.equal(saved.sourceType, 'drive');
  await page.goto('http://127.0.0.1:5198/admin/video-library');
  await page.getByText('Weaving demonstration', { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'mobile page must not overflow');
  await page.screenshot({ path: '/tmp/fff-video-library-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: named Drive library creation, failed-save retry, duplicate reuse, persistence after refresh, selecting saved Drive link for content; invalid URL, Drive Enter/publish, editing switches, library selection, bad file, upload registration retry without re-upload, mobile layout, no JS exceptions. Provider/API responses mocked.');
} catch (error) { console.error('Browser errors:', errors); console.error('Page:', await page.locator('body').innerText()); throw error; } finally { await browser.close(); await server.close(); }
