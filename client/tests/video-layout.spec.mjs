// Isolated public VideoGallery layout test; no production data or credentials.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), define: { 'import.meta.env.VITE_API_URL': JSON.stringify('/api') }, server: { host: '127.0.0.1', port: 5199, strictPort: true } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  const page = await browser.newPage(); const errors = []; page.on('pageerror', (e) => { errors.push(e.message); console.error(e.message); });
  let count = 6;
  await page.route(/^https?:\/\/[^/]+\/api\/(?!videos)/, (route) => route.fulfill({ json: { success: true, data: { items: [] } } }));
  await page.route(/^https?:\/\/[^/]+\/api\/videos(?:\?|$)/, (route) => route.fulfill({ json: { data: { items: Array.from({ length: count }, (_, i) => ({ _id: String(i), title: `Clip ${i}`, description: 'Mill video', url: i === 1 ? 'https://drive.google.com/file/d/abcdefghijk123/preview' : 'https://video.example/clip.mp4' })) } } }));
  await page.route('https://video.example/**', (route) => route.fulfill({ status: 404 }));
  await page.route('https://drive.google.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<p>Embedded player test</p>' }));
  for (count of [1, 6]) {
    for (const width of [320, 390, 768, 1024, 1440, 1920, 2560, 3840]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('http://127.0.0.1:5199/');
      await page.locator('.ff-video-figure').last().waitFor({ state: 'attached', timeout: 10000 }).catch(async (e) => { console.error('PAGE', (await page.locator('body').innerText()).slice(0, 1000)); throw e; });
      // Reveal animation is normally activated by the homepage hook.
      await page.addStyleTag({ content: '[data-reveal] { opacity: 1 !important; transform: none !important; }' });
      const cards = await page.locator('.ff-video-figure').evaluateAll((nodes) => nodes.map((n) => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width }; }));
      assert.equal(cards.length, count);
      assert.ok(cards.every((r) => r.width <= 448.5 && r.x >= 0 && r.x + r.width <= width + 1), `cards contained at ${width}`);
      assert.ok(cards.every((r) => Math.abs(r.width - cards[0].width) < 1), 'equal card widths');
      if (count > 1 && width >= 1024) assert.equal(cards[0].y, cards[1].y, 'multiple columns on desktop');
      await page.getByRole('button', { name: 'Play Clip 0', exact: true }).click();
      const native = await page.locator('.ff-video-frame video').evaluate((video) => { const r = video.getBoundingClientRect(); return { width: r.width, height: r.height, controls: video.controls, fit: getComputedStyle(video).objectFit, contained: r.bottom <= video.closest('.ff-video-frame').getBoundingClientRect().bottom + 1 }; });
      assert.ok(native.controls); assert.ok(native.contained, 'native controls must not be clipped by the frame'); assert.equal(native.fit, 'contain'); assert.ok(Math.abs(native.width / native.height - 16 / 9) < 0.02);
      if (count > 1) {
        await page.getByRole('button', { name: 'Play Clip 1', exact: true }).click();
        const embedded = await page.locator('.ff-video-frame iframe').evaluate((frame) => { const r = frame.getBoundingClientRect(); return { width: r.width, height: r.height, fullscreen: frame.allowFullscreen }; });
        assert.ok(embedded.fullscreen); assert.ok(Math.abs(embedded.width / embedded.height - 16 / 9) < 0.02);
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no overflow at ${width}`);
      if (count === 6 && width === 1440) await page.screenshot({ path: '/tmp/fff-video-layout-desktop.png', fullPage: true });
    }
  }
  assert.deepEqual(errors, []);
  console.log('PASS: 1 and 6 videos at 320, 390, 768, 1024, 1440, 1920, 2560 and 3840px; bounded equal cards, multi-column layout, 16:9 native/Drive players, controls attributes and no overflow. Provider playback mocked.');
} finally { await browser?.close(); await server.close(); }
