export default function ProgressBar({
  value,
  max,
  showText = true,
}: {
  value: number;
  max: number;
  showText?: boolean;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showText && (
        <span className="text-xs text-slate-500 tabular-nums w-16 text-right">
          {value}/{max}
        </span>
      )}
    </div>
  );
}
