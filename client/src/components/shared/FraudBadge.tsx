/**
 * FraudBadge — Colored pill showing fraud decision.
 * Green = ACCEPT, Yellow = REVIEW, Red = DECLINE
 */
export function FraudBadge({ decision }: { decision: string | null | undefined }) {
  if (!decision) return null;

  const classes: Record<string, string> = {
    ACCEPT: 'fraud-badge fraud-badge--accept',
    REVIEW: 'fraud-badge fraud-badge--review',
    DECLINE: 'fraud-badge fraud-badge--decline',
  };

  return (
    <span className={classes[decision] || 'fraud-badge'}>
      {decision}
    </span>
  );
}
