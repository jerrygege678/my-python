import { useEffect, useState } from "react";
import { subscribeToast, dismissToast, type ToastItem } from "../lib/toast";

const styles: Record<ToastItem["type"], string> = {
  info: "bg-slate-800 text-white",
  success: "bg-success text-white",
  error: "bg-danger text-white",
  warning: "bg-amber-500 text-white",
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  useEffect(() => subscribeToast(setToasts), []);

  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${styles[t.type]} px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-3 max-w-sm`}
        >
          <span>{t.message}</span>
          <button
            onClick={() => dismissToast(t.id)}
            className="text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
