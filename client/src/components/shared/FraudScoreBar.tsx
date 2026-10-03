/**
 * FraudScoreBar — Gradient bar showing fraud probability with threshold marker.
 */
export function FraudScoreBar({
  score,
  threshold = 0.65,
}: {
  score: number | null | undefined;
  threshold?: number;
}) {
  if (score == null) return <span className="fraud-score-na">—</span>;

  const pct = Math.round(score * 100);
  const color =
    score < 0.3 ? 'var(--color-success)' :
    score < 0.65 ? 'var(--color-warning)' :
    'var(--color-danger)';

  return (
    <div className="fraud-score-bar">
      <div className="fraud-score-bar__track">
        <div
          className="fraud-score-bar__fill"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
        <div
          className="fraud-score-bar__threshold"
          style={{ left: `${threshold * 100}%` }}
          title={`Threshold: ${(threshold * 100).toFixed(0)}%`}
        />
      </div>
      <span className="fraud-score-bar__label" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}
