import { useEffect, useState } from "react";
import { getApiBase } from "../apiBase";

const API_URL = getApiBase();

function usePublishedVideos() {
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/videos?status=published&sort=order`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => {
        if (cancelled) return;
        const items = json?.data?.items;
        if (Array.isArray(items)) setVideos(items);
      })
      .catch(() => {
        // No static fallback content exists for videos — section just stays empty.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return videos;
}

export default function VideoGallery() {
  const videos = usePublishedVideos();
  const [playingId, setPlayingId] = useState(null);

  if (videos.length === 0) return null;

  return (
    <section id="videos" className="ff-section ff-section--tight-top">
      <div className="ff-container">
        <div
          className="ff-section-head"
          data-reveal="up"
          style={{ paddingBottom: 18, borderBottom: "1px solid var(--ff-line)" }}
        >
          <h3
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "clamp(22px, 2.2vw, 32px)",
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.02em"
            }}
          >
            On the floor
          </h3>
          <p className="ff-lede" style={{ maxWidth: "40ch" }}>
            Short clips from the mill — spinning, winding, and lot inspection as it actually runs.
          </p>
        </div>

        <div className="ff-video-grid">
          {videos.map((v) => {
            const isPlaying = playingId === v._id;
            return (
              <figure key={v._id} className="ff-video-figure" data-reveal="up">
                <div className="ff-video-frame">
                  {isPlaying ? (
                    <video src={v.url} controls autoPlay className="ff-video-player" />
                  ) : (
                    <button type="button" className="ff-video-play" onClick={() => setPlayingId(v._id)} aria-label={`Play ${v.title}`}>
                      {v.thumbnail?.url && <img src={v.thumbnail.url} alt="" />}
                      <span className="ff-video-play-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7Z" />
                        </svg>
                      </span>
                    </button>
                  )}
                </div>
                <figcaption className="ff-video-caption">
                  <span className="ff-video-title">{v.title}</span>
                  {v.description && <span className="ff-video-desc">{v.description}</span>}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
