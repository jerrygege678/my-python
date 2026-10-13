import type { ApiResult } from "../types";

const BASE = import.meta.env.VITE_API_BASE ?? "/api";

// ── 全局 401 拦截（PRD §5.3）──────────────────────────
// AuthContext 启动时注册回调；任何 api() 返回 UNAUTHORIZED 时触发清登录态 → 跳 /login
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(cb: UnauthorizedHandler): void {
  onUnauthorized = cb;
}

export async function api<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      credentials: "include", // ★ 必须，才能带上 Cookie
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      ...init,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const code: string = body?.error?.code ?? `HTTP_${res.status}`;
      const message: string = body?.error?.message ?? "请求失败";
      // 401 → 触发全局清登录态
      if (code === "UNAUTHORIZED" || res.status === 401) {
        onUnauthorized?.();
      }
      return { ok: false, error: { code, message } };
    }
    return { ok: true, data: body.data };
  } catch {
    return {
      ok: false,
      error: { code: "NETWORK_ERROR", message: "无法连接服务器" },
    };
  }
}
