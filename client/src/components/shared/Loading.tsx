export function Loading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="loading">
      <div className="loading-spinner" />
      <span className="loading-text">{text}</span>
    </div>
  );
}

export function FullLoading({ text }: { text?: string }) {
  return (
    <div className="empty-state">
      <div className="loading-spinner" />
      {text && <p className="loading-text" style={{ marginTop: 12 }}>{text}</p>}
    </div>
  );
}
