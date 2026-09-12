import { useState } from "react";
import { TICKER_WORDS } from "../data/content";

export default function Ticker() {
  const [paused, setPaused] = useState(false);
  const runs = [TICKER_WORDS, TICKER_WORDS];

  return (
    <div className="ff-ticker">
      <div
        className={`ff-ticker-track${paused ? " is-paused" : ""}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {runs.map((run, i) => (
          <div className="ff-ticker-run" key={i}>
            {run.map((word, j) => (
              <span className="ff-ticker-word" key={`${word}-${j}`}>
                <span>{word}</span>
                <span className="ff-ticker-dot" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
