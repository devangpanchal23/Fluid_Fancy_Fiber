import { useState } from "react";
import { images as bundledImages } from "../../assets/images";

function resolveSrc(url) {
  return bundledImages[url] || url;
}

export default function ProductImageUploader({ images, onChange }) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");

  function addImage() {
    const trimmed = url.trim();
    if (!trimmed) return;
    onChange([...images, { url: trimmed, alt: alt.trim() }]);
    setUrl("");
    setAlt("");
  }

  function removeAt(i) {
    onChange(images.filter((_, idx) => idx !== i));
  }

  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="ff-admin-image-uploader">
      {images.length > 0 && (
        <ul className="ff-admin-image-list">
          {images.map((img, i) => (
            <li key={`${img.url}-${i}`}>
              <img src={resolveSrc(img.url)} alt={img.alt || ""} />
              <div className="ff-admin-image-meta">
                <span>{img.alt || img.url}</span>
              </div>
              <div className="ff-admin-image-actions">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                  ↑
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label="Move down">
                  ↓
                </button>
                <button type="button" onClick={() => removeAt(i)} className="ff-admin-image-remove" aria-label="Remove image">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="ff-admin-image-add">
        <input
          type="text"
          placeholder="Image URL (https://…)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <input type="text" placeholder="Alt text" value={alt} onChange={(e) => setAlt(e.target.value)} />
        <button type="button" className="ff-btn ff-btn-ghost" onClick={addImage} disabled={!url.trim()}>
          Add image
        </button>
      </div>
      <p className="ff-admin-hint">Paste a hosted image URL. The first image is used as the primary photo.</p>
    </div>
  );
}
