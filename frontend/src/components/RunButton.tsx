export default function RunButton({
  onClick,
  loading,
  disabled,
  loadingLabel,
}: {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  loadingLabel?: string;
}) {
  return (
    <button
      className="btn-primary"
      onClick={onClick}
      disabled={loading || disabled}
    >
      {loading && (
        <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
      )}
      {loading ? (loadingLabel ?? "运行中…") : "▶ 运行"}
    </button>
  );
}
