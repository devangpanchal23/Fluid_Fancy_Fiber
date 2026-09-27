import mongoose from "mongoose";
import VideoAsset from "../models/VideoAsset.js";
import { getBucket, getFileMeta } from "../utils/videoStorage.js";

// Public — every locally-uploaded video on the live site streams through
// this route, keyed by the VideoAsset's gridFsId. Unlike serveImage
// (uploadController.js), which sends the whole image in one response,
// video playback needs HTTP Range support: without it, the browser can't
// seek/scrub (every seek would have to re-download the file from the
// start), and some browsers won't even start native <video> playback of a
// large file without a 206 response to their initial probing Range request.
export async function streamVideo(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).end();
    const filesId = new mongoose.Types.ObjectId(req.params.id);

    const [asset, fileMeta] = await Promise.all([
      VideoAsset.findOne({ gridFsId: filesId }).select("mimeType"),
      getFileMeta(filesId)
    ]);
    if (!asset || !fileMeta) return res.status(404).end();

    const totalSize = fileMeta.length;
    const contentType = asset.mimeType || "video/mp4";
    const range = req.headers.range;

    res.set("Accept-Ranges", "bytes");
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=31536000, immutable");

    if (!range) {
      res.set("Content-Length", String(totalSize));
      res.status(200);
      getBucket().openDownloadStream(filesId).on("error", () => res.end()).pipe(res);
      return;
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      res.set("Content-Range", `bytes */${totalSize}`);
      return res.status(416).end();
    }

    let start = match[1] ? parseInt(match[1], 10) : 0;
    let end = match[2] ? parseInt(match[2], 10) : totalSize - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= totalSize) {
      res.set("Content-Range", `bytes */${totalSize}`);
      return res.status(416).end();
    }
    end = Math.min(end, totalSize - 1);

    res.set("Content-Range", `bytes ${start}-${end}/${totalSize}`);
    res.set("Content-Length", String(end - start + 1));
    res.status(206);

    // GridFSBucket's `end` option is exclusive, unlike the HTTP Range
    // header's inclusive end byte — hence the +1.
    getBucket()
      .openDownloadStream(filesId, { start, end: end + 1 })
      .on("error", () => res.end())
      .pipe(res);
  } catch (err) {
    next(err);
  }
}
