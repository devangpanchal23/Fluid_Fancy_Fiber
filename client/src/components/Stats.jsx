import { STATS } from "../data/content";
import { useCountUp } from "../hooks/useCountUp";

export default function Stats() {
  const targets = STATS.map((s) => s.target);
  const [ref, counts] = useCountUp(targets, { duration: 1000 });

  return (
    <div ref={ref} className="ff-stats">
      <div className="ff-stats-grid">
        {STATS.map((s, i) => (
          <div key={s.label} className="ff-stat" data-reveal="up">
            <div className="ff-stat-value">
              {counts[i]}
              <span>{s.suffix}</span>
            </div>
            <div className="ff-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
