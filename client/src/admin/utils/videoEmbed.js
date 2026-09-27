// Pure logic for turning a pasted Google Drive share link into something
// playable, kept separate from the (JSX) picker so it can be unit-tested
// directly. Google Drive is the only supported "paste a link" source (the
// other supported source is a local upload, handled entirely separately —
// see localVideoUpload.js) — this deliberately rejects anything else rather
// than accepting an arbitrary URL, since we can't guarantee an arbitrary
// host actually serves playable, CORS/embeddable video bytes.
//
// Drive share links (drive.google.com/file/d/<ID>/view, .../open?id=,
// .../uc?id=, etc.) do NOT point at raw, directly-playable video bytes —
// Drive serves an HTML viewer page instead, which breaks a native <video>
// tag. The one link shape Drive reliably serves as embeddable content for
// any file (regardless of size or exact sharing settings, as long as it's
// shared "Anyone with the link") is its own /preview iframe embed, so any
// recognized Drive link is converted to that form — the client then renders
// it in an <iframe>, with Drive's own player chrome (play/pause/seek/
// volume/fullscreen), instead of a native <video> tag.
const DRIVE_HOSTS = new Set(["drive.google.com", "docs.google.com"]);

const DRIVE_ID_PATTERNS = [
  /\/file\/d\/([a-zA-Z0-9_-]{10,})/, // .../file/d/<ID>/view
  /[?&]id=([a-zA-Z0-9_-]{10,})/ // .../open?id=<ID>, .../uc?id=<ID>
];

function extractDriveFileId(href) {
  for (const pattern of DRIVE_ID_PATTERNS) {
    const match = href.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Returns either { url, embedType: "iframe", driveFileId } or { error }.
export function parseVideoUrl(raw) {
  const input = String(raw || "").trim();
  if (!input) return { error: "Paste a Google Drive share link." };

  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    return { error: "That doesn't look like a valid URL — make sure it starts with http:// or https://." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: "The URL must start with http:// or https://." };
  }

  if (!DRIVE_HOSTS.has(parsed.hostname)) {
    return {
      error: "Only Google Drive share links are supported here. Paste a link like drive.google.com/file/d/FILE_ID/view, or use the Video Library tab to upload a file instead."
    };
  }

  const fileId = extractDriveFileId(parsed.href);
  if (!fileId) {
    return {
      error:
        "Couldn't find a file ID in that Google Drive link. Open the file in Drive, choose Share -> Get link, and paste the resulting link (it should look like drive.google.com/file/d/FILE_ID/view)."
    };
  }
  return { url: `https://drive.google.com/file/d/${fileId}/preview`, embedType: "iframe", driveFileId: fileId };
}
