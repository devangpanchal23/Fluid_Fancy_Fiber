import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import { configureVideoCloud } from '../controllers/videoMediaController.js';

test('server .env loads independently of cwd and preserves injected environment', () => {
  const root = mkdtempSync(join(tmpdir(), 'fff-env-test-'));
  try {
    mkdirSync(join(root, 'server/src/config'), { recursive: true });
    writeFileSync(join(root, 'package.json'), '{"type":"module"}');
    copyFileSync(fileURLToPath(new URL('../config/env.js', import.meta.url)), join(root, 'server/src/config/env.js'));
    symlinkSync(fileURLToPath(new URL('../../node_modules', import.meta.url)), join(root, 'server/node_modules'));
    writeFileSync(join(root, 'server/.env'), 'CLOUDINARY_CLOUD_NAME=test-cloud\nCLOUDINARY_API_KEY=test-key\nCLOUDINARY_API_SECRET=test-secret\n');
    const env = { ...process.env }; for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) delete env[key];
    const script = `await import(${JSON.stringify(join(root, 'server/src/config/env.js'))}); console.log(JSON.stringify([process.env.CLOUDINARY_CLOUD_NAME, process.env.CLOUDINARY_API_KEY, process.env.CLOUDINARY_API_SECRET]));`;
    for (const cwd of [root, join(root, 'server'), tmpdir()]) {
      const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd, env, encoding: 'utf8' });
      assert.deepEqual(JSON.parse(output), ['test-cloud', 'test-key', 'test-secret']);
    }
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd: root, env: { ...env, CLOUDINARY_CLOUD_NAME: 'deployment-cloud' }, encoding: 'utf8' });
    assert.equal(JSON.parse(output)[0], 'deployment-cloud');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('video SDK configuration rejects missing/placeholders and trims real settings', (t) => {
  const keys = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const previous = keys.map((key) => process.env[key]);
  t.after(() => { keys.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; }); t.mock.restoreAll(); });
  const config = t.mock.method(cloudinary, 'config', () => {});
  for (const key of keys) {
    keys.forEach((k) => { process.env[k] = 'test-value'; });
    for (const value of ['', '   ', 'your-api-key', 'YOUR_API_SECRET']) { process.env[key] = value; assert.throws(configureVideoCloud, { status: 503 }); }
  }
  keys.forEach((key, i) => { process.env[key] = ` value-${i} `; });
  assert.equal(configureVideoCloud(), 'value-0');
  assert.deepEqual(config.mock.calls.at(-1).arguments[0], { cloud_name: 'value-0', api_key: 'value-1', api_secret: 'value-2' });
});
