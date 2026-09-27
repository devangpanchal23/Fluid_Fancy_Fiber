// Controller contracts use isolated model/Cloudinary doubles. No production DB
// or cloud assets are read or mutated. Real-provider acceptance is documented.
import { test, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import Video from '../models/Video.js';
import VideoMedia from '../models/VideoMedia.js';
import { createVideo, updateVideo, deleteVideo, listVideos } from '../controllers/videoController.js';
import { createVideoMedia, deleteVideoMedia, videoConfig, listVideoMedia } from '../controllers/videoMediaController.js';
import videoMediaRoutes from '../routes/videoMediaRoutes.js';
import express from 'express';
import http from 'node:http';
afterEach(() => mock.restoreAll());
const id = new mongoose.Types.ObjectId();
const mediaId = new mongoose.Types.ObjectId();
const media = { _id: mediaId, publicId: 'library/clip', url: 'https://res.cloudinary.com/test/video/upload/clip.mp4', thumbnail: { url: 'https://example.com/poster.jpg' }, duration: 12 };
function cloud() { mock.method(cloudinary, 'config', () => {}); process.env.CLOUDINARY_CLOUD_NAME = 'test'; process.env.CLOUDINARY_API_KEY = 'test'; process.env.CLOUDINARY_API_SECRET = 'test'; }
async function call(fn, req = {}) {
  const result = { status: 200 };
  const res = { status(code) { result.status = code; return this; }, json(body) { result.body = body; return this; } };
  await fn({ body: {}, params: { id: String(id) }, query: {}, ...req }, res, (e) => { result.error = e; result.status = e.status || 500; });
  return result;
}
test('library endpoints all reject unauthenticated requests', async () => {
  const app = express(); app.use('/video-media', videoMediaRoutes);
  const server = http.createServer(app); await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    for (const [method, path] of [['GET', ''], ['GET', '/config'], ['POST', ''], ['DELETE', `/${id}`]]) {
      const res = await fetch(`http://127.0.0.1:${server.address().port}/video-media${path}`, { method }); assert.equal(res.status, 401);
    }
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
function mockLinkedMedia() {
  const find = mock.method(VideoMedia, 'findOne', async () => null);
  const claim = mock.method(VideoMedia, 'findOneAndUpdate', async (filter, update) => update.$setOnInsert ? { ...update.$setOnInsert, _id: new mongoose.Types.ObjectId() } : media);
  const release = mock.method(VideoMedia, 'updateOne', async () => ({}));
  return { find, claim, release };
}
test('Drive content saves normalized URL and a reusable library reference', async () => {
  mockLinkedMedia();
  mock.method(Video, 'countDocuments', async () => 0);
  mock.method(Video, 'create', async (data) => data);
  const result = await call(createVideo, { body: { title: 'Mill', url: 'https://drive.google.com/file/d/abcdefghijk123/view' } });
  assert.equal(result.status, 201); assert.equal(result.body.data.video.sourceType, 'drive'); assert.equal(result.body.data.video.publicId, ''); assert.match(result.body.data.video.url, /\/preview$/);
});
test('invalid URL and empty title cannot create content', async () => {
  const create = mock.method(Video, 'create', async () => { throw new Error('must not run'); });
  assert.equal((await call(createVideo, { body: { title: 'Mill', url: 'javascript:bad' } })).status, 400);
  assert.equal((await call(createVideo, { body: { title: '', url: media.url } })).status, 400); assert.equal(create.mock.callCount(), 0);
});
test('library content uses canonical server asset and claims it', async () => {
  mock.method(VideoMedia, 'findOne', async () => media);
  const claim = mock.method(VideoMedia, 'findOneAndUpdate', async () => media);
  mock.method(Video, 'countDocuments', async () => 0); mock.method(Video, 'create', async (data) => data);
  const result = await call(createVideo, { body: { title: 'Mill', videoMedia: mediaId, url: 'https://attacker.example/fake.mp4' } });
  assert.equal(result.status, 201); assert.equal(result.body.data.video.url, media.url); assert.equal(result.body.data.video.sourceType, 'library'); assert.equal(claim.mock.callCount(), 1);
});
test('missing library entry and deletion in progress block selection', async () => {
  const find = mock.method(VideoMedia, 'findOne', async () => null);
  assert.equal((await call(createVideo, { body: { title: 'Mill', videoMedia: mediaId } })).status, 400);
  find.mock.mockImplementation(async () => media); mock.method(VideoMedia, 'findOneAndUpdate', async () => null); mock.method(VideoMedia, 'updateOne', async () => ({}));
  assert.equal((await call(createVideo, { body: { title: 'Mill', videoMedia: mediaId } })).status, 409);
});
test('failed content creation releases its library claim', async () => {
  mock.method(VideoMedia, 'findOne', async () => media); mock.method(VideoMedia, 'findOneAndUpdate', async () => media);
  const release = mock.method(VideoMedia, 'updateOne', async () => ({})); mock.method(Video, 'countDocuments', async () => 0); mock.method(Video, 'create', async () => { throw new Error('database down'); });
  assert.equal((await call(createVideo, { body: { title: 'Mill', videoMedia: mediaId } })).status, 500); assert.equal(release.mock.callCount(), 1);
});
test('editing switches library → Drive → library and releases old reference', async () => {
  const { find, claim, release } = mockLinkedMedia();
  const video = { _id: id, title: 'Mill', url: media.url, videoMedia: mediaId, publicId: media.publicId, thumbnail: media.thumbnail, async save() {}, toObject() { return { ...this }; } };
  mock.method(Video, 'findById', async () => video);
  const first = await call(updateVideo, { body: { url: 'https://drive.google.com/open?id=abcdefghijk123', thumbnail: null } });
  assert.equal(first.status, 200); assert.ok(video.videoMedia); assert.notEqual(String(video.videoMedia), String(mediaId)); assert.equal(video.publicId, ''); assert.equal(video.thumbnail, null); assert.equal(release.mock.callCount(), 1);
  find.mock.mockImplementation(async () => media); claim.mock.mockImplementation(async () => media);
  assert.equal((await call(updateVideo, { body: { videoMedia: mediaId } })).status, 200); assert.equal(video.url, media.url);
  assert.equal((await call(updateVideo, { body: { url: 'garbage', videoMedia: null } })).status, 400); assert.equal(video.url, media.url);
});
test('deleting content leaves Cloudinary asset intact and releases reference', async () => {
  mock.method(Video, 'findById', async () => ({ _id: id, videoMedia: mediaId, async deleteOne() {} }));
  const release = mock.method(VideoMedia, 'updateOne', async () => ({})); const destroy = mock.method(cloudinary.uploader, 'destroy', async () => { throw new Error('must not run'); });
  assert.equal((await call(deleteVideo)).status, 200); assert.equal(release.mock.callCount(), 1); assert.equal(destroy.mock.callCount(), 0);
});
test('registration verifies Cloudinary metadata, generates MP4 and is idempotent', async () => {
  cloud(); const resource = mock.method(cloudinary.api, 'resource', async () => ({ public_id: media.publicId, resource_type: 'video', format: 'mov', width: 640, height: 360, bytes: 1234, duration: 12, version: 1 }));
  const save = mock.method(VideoMedia, 'findOneAndUpdate', async (filter, update) => ({ ...update.$setOnInsert, _id: mediaId }));
  const result = await call(createVideoMedia, { body: { publicId: media.publicId, originalName: 'mill.mov', url: 'bad', size: 0 } });
  assert.equal(result.status, 201); assert.equal(result.body.data.media.size, 1234); assert.match(result.body.data.media.url, /ac_aac,vc_h264/); assert.match(new URL(result.body.data.media.url).pathname, /\.mp4$/); assert.deepEqual(resource.mock.calls[0].arguments[1], { resource_type: 'video', type: 'upload' }); assert.ok(save.mock.calls[0].arguments[1].$setOnInsert);
});
test('registration rejects bad formats, audio-only and oversized assets', async () => {
  cloud(); const resource = mock.method(cloudinary.api, 'resource', async () => ({}));
  for (const fields of [{ format: 'avi' }, { width: 0 }, { bytes: 104857601 }, { resource_type: 'image' }]) {
    resource.mock.mockImplementation(async () => ({ public_id: 'clip', resource_type: 'video', format: 'mp4', width: 640, height: 360, bytes: 123, ...fields }));
    assert.equal((await call(createVideoMedia, { body: { publicId: 'clip', originalName: 'clip.mp4' } })).status, 400);
  }
});
test('library deletion refuses in-use files and retains record on provider failure', async () => {
  cloud(); const remove = mock.fn(async () => {}); mock.method(VideoMedia, 'findById', async () => ({ ...media, deleteOne: remove }));
  const usage = mock.method(Video, 'exists', async () => ({ _id: id }));
  const destroy = mock.method(cloudinary.uploader, 'destroy', async () => { throw new Error('provider down'); });
  assert.equal((await call(deleteVideoMedia)).status, 409); assert.equal(destroy.mock.callCount(), 0);
  usage.mock.mockImplementation(async () => null); mock.method(VideoMedia, 'findOneAndUpdate', async () => media); const unlock = mock.method(VideoMedia, 'updateOne', async () => ({}));
  assert.equal((await call(deleteVideoMedia)).status, 500); assert.equal(remove.mock.callCount(), 0); assert.equal(unlock.mock.callCount(), 1);
  destroy.mock.mockImplementation(async () => ({ result: 'ok' })); assert.equal((await call(deleteVideoMedia)).status, 200); assert.equal(remove.mock.callCount(), 1);
});
test('config exposes public fields only and rejects missing server credentials', async () => {
  cloud(); process.env.CLOUDINARY_VIDEO_UPLOAD_PRESET = 'fff_videos_unsigned';
  assert.deepEqual((await call(videoConfig)).body.data, { cloudName: 'test', uploadPreset: 'fff_videos_unsigned' });
  delete process.env.CLOUDINARY_API_SECRET; assert.equal((await call(videoConfig)).status, 503);
});
test('library search escapes regex and clamps pagination; public content excludes drafts', async () => {
  let filter, limit;
  mock.method(VideoMedia, 'find', (f) => { filter = f; return { sort() { return this; }, skip() { return this; }, limit(n) { limit = n; return []; } }; }); mock.method(VideoMedia, 'countDocuments', async () => 0);
  assert.equal((await call(listVideoMedia, { query: { q: '[clip].mp4', page: -2, limit: 999 } })).status, 200); assert.equal(limit, 100); assert.ok(filter.originalName.test('[clip].mp4')); assert.ok(!filter.originalName.test('cXmp4'));
  mock.method(Video, 'find', (f) => { filter = f; return { sort() { return this; }, skip() { return this; }, limit() { return []; } }; }); mock.method(Video, 'countDocuments', async () => 0);
  await call(listVideos, { query: { status: 'draft' } }); assert.equal(filter.status, 'published');
});
test('real MongoDB video library and content lifecycle (Cloudinary boundary mocked)', async (t) => {
  const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/fluid_fibers_test';
  try { await mongoose.connect(uri, { serverSelectionTimeoutMS: 1500 }); }
  catch { t.skip('No local MongoDB reachable'); return; }
  const createdIds = [];
  const publicId = `test-video-${new mongoose.Types.ObjectId()}`;
  const driveId = `test_drive_${new mongoose.Types.ObjectId()}`;
  let linkedId;
  cloud();
  mock.method(cloudinary.api, 'resource', async () => ({ public_id: publicId, resource_type: 'video', format: 'mp4', width: 640, height: 360, bytes: 1234, duration: 12, version: 1 }));
  mock.method(cloudinary.uploader, 'destroy', async () => ({ result: 'ok' }));
  try {
    await VideoMedia.init();
    const uploaded = await call(createVideoMedia, { body: { publicId, originalName: `${publicId}.mp4` } });
    assert.equal(uploaded.status, 201, uploaded.error?.message);
    const libraryId = uploaded.body.data.media._id;
    const retry = await call(createVideoMedia, { body: { publicId, originalName: `${publicId}.mp4` } });
    assert.equal(String(retry.body.data.media._id), String(libraryId));
    for (let i = 0; i < 2; i++) {
      const created = await call(createVideo, { body: { title: `Test video ${i}`, videoMedia: String(libraryId), status: i ? 'published' : 'draft' } });
      assert.equal(created.status, 201, created.error?.message); createdIds.push(created.body.data.video._id);
    }
    assert.equal((await VideoMedia.findById(libraryId)).references.length, 2);
    assert.equal((await call(deleteVideoMedia, { params: { id: String(libraryId) } })).status, 409);
    const edited = await call(updateVideo, { params: { id: String(createdIds[0]) }, body: { url: `https://drive.google.com/open?id=${driveId}`, videoMedia: null, thumbnail: null } });
    assert.equal(edited.status, 200, edited.error?.message);
    const persisted = await Video.findById(createdIds[0]);
    assert.equal(persisted.sourceType, 'drive'); assert.equal(persisted.publicId, ''); assert.ok(persisted.videoMedia); linkedId = persisted.videoMedia;
    assert.equal((await VideoMedia.findById(linkedId)).provider, 'drive');
    // Different share-link formats resolve to the same persistent entry.
    const duplicate = await call(createVideoMedia, { body: { url: `https://drive.google.com/file/d/${driveId}/view`, originalName: 'Drive clip' } });
    assert.equal(duplicate.status, 201); assert.equal(String(duplicate.body.data.media._id), String(linkedId));
    const listed = await call(listVideoMedia, { query: { q: 'Test video 0' } });
    assert.ok(listed.body.data.items.some((item) => String(item._id) === String(linkedId)));
    assert.equal((await call(deleteVideoMedia, { params: { id: String(linkedId) } })).status, 409);
    assert.equal((await VideoMedia.findById(libraryId)).references.length, 1);
    await call(deleteVideo, { params: { id: String(createdIds[1]) } });
    assert.equal((await VideoMedia.findById(libraryId)).references.length, 0);
    assert.equal((await call(deleteVideoMedia, { params: { id: String(libraryId) } })).status, 200);
    assert.equal(await VideoMedia.findById(libraryId), null);
    assert.equal((await Video.findById(createdIds[0])).sourceType, 'drive');
    await call(deleteVideo, { params: { id: String(createdIds[0]) } });
    delete process.env.CLOUDINARY_API_SECRET;
    assert.equal((await call(deleteVideoMedia, { params: { id: String(linkedId) } })).status, 200);
    assert.equal(await VideoMedia.findById(linkedId), null);
  } finally {
    await Video.deleteMany({ _id: { $in: createdIds } });
    await VideoMedia.deleteMany({ $or: [{ publicId }, { url: `https://drive.google.com/file/d/${driveId}/preview` }] });
    await mongoose.disconnect();
  }
});
test('linked video creation works without Cloudinary credentials and never calls provider', async () => {
  delete process.env.CLOUDINARY_API_SECRET;
  mockLinkedMedia();
  const resource = mock.method(cloudinary.api, 'resource', async () => { throw new Error('must not call'); });
  const created = await call(createVideoMedia, { body: { url: 'https://drive.google.com/file/d/abcdefghijk123/view', originalName: 'Spinning machine' } });
  assert.equal(created.status, 201); assert.equal(created.body.data.media.provider, 'drive'); assert.equal(created.body.data.media.originalName, 'Spinning machine');
  assert.match(created.body.data.media.publicId, /^link:/); assert.equal(resource.mock.callCount(), 0);
  assert.equal((await call(createVideoMedia, { body: { url: 'https://drive.google.com/drive/folders/abc' } })).status, 400);
  assert.equal((await call(createVideoMedia, { body: { url: 'https://example.com/video.mp4', originalName: 'a'.repeat(256) } })).status, 400);
});
test('linked video deletion does not touch Google Drive or Cloudinary', async () => {
  delete process.env.CLOUDINARY_API_SECRET;
  const remove = mock.fn(async () => {});
  mock.method(VideoMedia, 'findById', async () => ({ ...media, provider: 'drive', publicId: 'link:test', deleteOne: remove }));
  mock.method(Video, 'exists', async () => null); mock.method(VideoMedia, 'findOneAndUpdate', async () => media);
  const destroy = mock.method(cloudinary.uploader, 'destroy', async () => { throw new Error('must not call'); });
  assert.equal((await call(deleteVideoMedia)).status, 200); assert.equal(remove.mock.callCount(), 1); assert.equal(destroy.mock.callCount(), 0);
});
