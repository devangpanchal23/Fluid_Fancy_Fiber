// Renders either a Cloudinary-hosted (or other direct-file) video with the
// browser's native controls, or an iframe embed (Google Drive links, which
// don't serve raw playable bytes from a share link — see admin/utils/
// videoEmbed.js) with Drive's own player chrome. Both cases fill their
// parent's box responsively; the parent is expected to size/aspect-ratio
// the wrapper (see .ff-video-frame / .ff-video-form-preview in CSS).
export default function VideoPlayer({ url, embedType = "native", poster, title, autoPlay = false, className = "" }) {
  if (!url) return null;

  if (embedType === "iframe") {
    const src = autoPlay ? `${url}${url.includes("?") ? "&" : "?"}autoplay=1` : url;
    return (
      <div className={`ff-video-embed ${className}`.trim()}>
        <iframe
          src={src}
          title={title || "Video"}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
          frameBorder="0"
        />
      </div>
    );
  }

  return (
    <video
      className={`ff-video-native ${className}`.trim()}
      src={url}
      poster={poster || undefined}
      controls
      playsInline
      preload="metadata"
      autoPlay={autoPlay}
    >
      Your browser doesn't support embedded video. <a href={url}>Download the video</a> instead.
    </video>
  );
}
