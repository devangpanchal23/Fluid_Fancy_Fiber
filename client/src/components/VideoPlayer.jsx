import { useEffect, useState } from "react";
import { resolveUploadUrl } from "../apiBase";

function DriveLink({ driveFileId }) {
  if (!driveFileId) return null;
  // Google's own /preview iframe renders its own error UI (e.g. "You need
  // permission") for a private/restricted file — that content is inside a
  // cross-origin iframe, so we have no way to detect it or replace it with
  // our own message (there is no error event for an HTTP-200 page Drive
  // chose to show instead of the video). This small, permanently-present
  // link is the mitigation: whatever Drive renders, the admin/visitor
  // always has a direct, working way out to the real file. Rendered below
  // the iframe (see .ff-video-drive-link), never on top of it — Drive's own
  // player chrome shows up in different corners in different states (a
  // bottom control bar during playback, a top progress/scrub bar in
  // others), so no overlay position is reliably clear of it.
  return (
    <a className="ff-video-drive-link" href={`https://drive.google.com/file/d/${driveFileId}/view`} target="_blank" rel="noreferrer">
      Open in Google Drive ↗
    </a>
  );
}

function VideoFallback({ driveFileId }) {
  return (
    <div className="ff-video-fallback">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="3" y="6" width="14" height="12" rx="1.4" />
        <path d="m17 10 4-2.5v9L17 14" />
        <path d="M4 4l16 16" />
      </svg>
      <p>This video couldn't be loaded.</p>
      {driveFileId && (
        <a className="ff-btn ff-btn-ghost" href={`https://drive.google.com/file/d/${driveFileId}/view`} target="_blank" rel="noreferrer">
          Open in Google Drive
        </a>
      )}
    </div>
  );
}

// Renders either a locally-uploaded video (native <video>, HTTP Range-served
// from GridFS — see server/src/controllers/videoStreamController.js) or a
// Google Drive embed (iframe, Drive's own player chrome) — the only two
// supported video sources. Both fill their parent's box responsively; the
// parent sizes/aspect-ratios the wrapper (see .ff-video-frame /
// .ff-video-form-preview in CSS).
export default function VideoPlayer({ url, embedType = "native", driveFileId, poster, title, autoPlay = false, className = "" }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [url, embedType]);

  if (!url) return null;
  if (errored) return <VideoFallback driveFileId={driveFileId} />;

  if (embedType === "iframe") {
    const src = autoPlay ? `${url}${url.includes("?") ? "&" : "?"}autoplay=1` : url;
    return (
      <div className={`ff-video-embed-wrap ${className}`.trim()}>
        <div className="ff-video-embed">
          {!loaded && <div className="ff-video-loading" aria-hidden="true" />}
          <iframe
            src={src}
            title={title || "Video"}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            loading="lazy"
            frameBorder="0"
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
          />
        </div>
        <DriveLink driveFileId={driveFileId} />
      </div>
    );
  }

  const resolvedUrl = resolveUploadUrl(url);
  const resolvedPoster = poster ? resolveUploadUrl(poster) : undefined;

  return (
    <div className={`ff-video-native-wrap ${className}`.trim()}>
      {!loaded && !resolvedPoster && <div className="ff-video-loading" aria-hidden="true" />}
      <video
        className="ff-video-native"
        src={resolvedUrl}
        poster={resolvedPoster}
        controls
        playsInline
        preload="metadata"
        autoPlay={autoPlay}
        onLoadedData={() => setLoaded(true)}
        onError={() => setErrored(true)}
      >
        Your browser doesn't support embedded video. <a href={resolvedUrl}>Download the video</a> instead.
      </video>
    </div>
  );
}
