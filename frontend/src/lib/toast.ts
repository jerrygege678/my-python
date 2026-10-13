// 极简 toast：模块级 pub-sub，Layout 里的 Toast 容器订阅渲染
export interface ToastItem {
  id: number;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

type Listener = (toasts: ToastItem[]) => void;

let seq = 0;
let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(toasts);
}

export function subscribeToast(l: Listener): () => void {
  listeners.add(l);
  l(toasts);
  return () => {
    listeners.delete(l);
  };
}

export function getToasts(): ToastItem[] {
  return toasts;
}

export function toast(
  message: string,
  type: ToastItem["type"] = "info",
  duration = 3000
): void {
  const id = ++seq;
  toasts = [...toasts, { id, message, type }];
  emit();
  window.setTimeout(() => dismissToast(id), duration);
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}
