// Local video storage, entirely inside the same MongoDB database everything
// else already uses — via GridFS, MongoDB's own built-in mechanism for
// storing files larger than the 16MB single-document limit (see Media.js /
// imageStorage.js for why images are capped at 5MB and stored on a single
// document instead: video files are routinely far larger than that).
//
// GridFS spans a file across two collections, `videos.files` (one metadata
// doc) and `videos.chunks` (many binary chunks referencing it) — this is a
// stable, documented MongoDB wire format, not a third-party service.
//
// Uploads arrive over HTTP in small pieces (see videoUploadController.js)
// because Vercel serverless functions hard-cap request/response payloads at
// ~4.5MB — a whole video can never travel in one request. Rather than
// buffering every chunk in a temp collection and rewriting the bytes a
// second time into GridFS once the upload completes (double the I/O, and a
// slow synchronous re-write that could blow a serverless function's
// execution-time limit for a large file), each incoming chunk is written
// directly into `videos.chunks` in the exact shape GridFS itself would have
// written it. The `complete` step then only has to insert one small metadata
// document into `videos.files` — cheap regardless of file size. Every read
// afterwards goes through the driver's own GridFSBucket, which only cares
// that the two collections conform to its documented schema; it has no way
// to tell (and does not need to know) that the chunks arrived one HTTP
// request at a time instead of through its own upload stream.
import mongoose from "mongoose";

const BUCKET_NAME = "videos";
let indexesEnsured = false;

function db() {
  return mongoose.connection.db;
}

export function getBucket() {
  return new mongoose.mongo.GridFSBucket(db(), { bucketName: BUCKET_NAME });
}

function chunksCollection() {
  return db().collection(`${BUCKET_NAME}.chunks`);
}

function filesCollection() {
  return db().collection(`${BUCKET_NAME}.files`);
}

// GridFSBucket normally creates these itself the first time its own upload
// stream is used; since we write chunks directly we ensure them ourselves,
// once per server process. Safe to call repeatedly — createIndex is a no-op
// if the index already exists with the same spec.
export async function ensureVideoIndexes() {
  if (indexesEnsured) return;
  await chunksCollection().createIndex({ files_id: 1, n: 1 }, { unique: true });
  await filesCollection().createIndex({ uploadDate: 1 });
  indexesEnsured = true;
}

// Upserts so a client's retry of the same chunk (network blip, timeout) is
// idempotent instead of creating a duplicate chunk doc, which would corrupt
// the read stream (GridFSBucket expects exactly one chunk per (files_id, n)).
export async function writeChunk({ filesId, index, buffer }) {
  await chunksCollection().updateOne(
    { files_id: filesId, n: index },
    { $set: { files_id: filesId, n: index, data: buffer } },
    { upsert: true }
  );
}

export async function countChunks(filesId) {
  return chunksCollection().countDocuments({ files_id: filesId });
}

export async function sumChunkBytes(filesId) {
  const cursor = chunksCollection().aggregate([
    { $match: { files_id: filesId } },
    { $group: { _id: null, total: { $sum: { $binarySize: "$data" } } } }
  ]);
  const [row] = await cursor.toArray();
  return row?.total || 0;
}

export async function deleteChunks(filesId) {
  await chunksCollection().deleteMany({ files_id: filesId });
}

// Finalizes an upload by inserting the one `files` metadata document GridFS
// needs to recognize the chunks already written as a complete file.
export async function finalizeUpload({ filesId, length, chunkSize, filename }) {
  await ensureVideoIndexes();
  await filesCollection().insertOne({
    _id: filesId,
    length,
    chunkSize,
    uploadDate: new Date(),
    filename
  });
}

// GridFSBucket.delete() removes both the files doc and every chunk for it —
// correct regardless of how the chunks were written, which is what makes a
// deleted video's file guaranteed to leave no orphaned chunks behind.
export async function deleteVideoFile(filesId) {
  try {
    await getBucket().delete(filesId);
  } catch (err) {
    // Already gone (e.g. a previous delete partially succeeded) — not fatal.
    if (!/File not found/i.test(err?.message || "")) throw err;
  }
}

export async function getFileMeta(filesId) {
  return filesCollection().findOne({ _id: filesId });
}

// Best-effort sweep of abandoned upload sessions (admin picked a file, then
// closed the tab before finishing) — chunks with no matching `files` doc
// older than the cutoff are orphaned and safe to remove. There is no
// background job runner in this project, so this runs opportunistically
// whenever a new upload starts (see videoUploadController.startUpload).
export async function sweepAbandonedChunks({ olderThanMs = 24 * 60 * 60 * 1000 } = {}) {
  const cutoff = new mongoose.Types.ObjectId(Math.floor((Date.now() - olderThanMs) / 1000).toString(16) + "0000000000000000");
  const staleFilesIds = await chunksCollection().distinct("files_id", { files_id: { $lt: cutoff } });
  if (!staleFilesIds.length) return;
  const finalized = await filesCollection().distinct("_id", { _id: { $in: staleFilesIds } });
  const finalizedSet = new Set(finalized.map(String));
  const abandoned = staleFilesIds.filter((id) => !finalizedSet.has(String(id)));
  if (abandoned.length) {
    await chunksCollection().deleteMany({ files_id: { $in: abandoned } });
  }
}
