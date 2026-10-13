import { useState } from "react";

export default function HintCard({ hint }: { hint: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="panel p-3">
      <button
        className="flex w-full items-center gap-2 text-sm font-medium text-primary"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{open ? "▼" : "▶"}</span>
        <span>提示</span>
      </button>
      {open && (
        <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{hint}</p>
      )}
    </div>
  );
}
