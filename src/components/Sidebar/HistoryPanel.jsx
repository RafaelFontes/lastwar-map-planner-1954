export function HistoryPanel({ history }) {
  if (history.length === 0) {
    return (
      <div className="max-h-[300px] overflow-y-auto mb-4">
        <p className="text-discord-text-muted italic text-sm">No changes yet</p>
      </div>
    );
  }

  return (
    <div className="max-h-[300px] overflow-y-auto mb-4">
      {history.map((item, index) => (
        <div key={index} className="p-3 mb-2 last:mb-0 bg-discord-light-gray rounded text-sm border-l-3 border-l-discord-blurple">
          <div className="text-discord-text-muted text-[11px] mb-1">{item.timestamp}</div>
          <div className="text-discord-text font-medium">{item.action}</div>
          <div className="text-discord-text-secondary mt-1 text-xs">{item.details}</div>
        </div>
      ))}
    </div>
  );
}
