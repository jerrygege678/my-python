import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import type { AuthState, User, Credentials, ApiResult } from "../types";
import * as authApi from "../api/auth";
import { registerUnauthorizedHandler } from "../api/client";
import { toast } from "../lib/toast";

interface AuthContextValue extends AuthState {
  login: (c: Credentials) => Promise<ApiResult<User>>;
  register: (c: Credentials) => Promise<ApiResult<User>>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PROGRESS_KEY_PREFIX = "pylab.progress.";

function progressKeyFor(uid: number): string {
  return `${PROGRESS_KEY_PREFIX}${uid}.v2`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
  });
  const navigate = useNavigate();
  const navRef = useRef(navigate);
  navRef.current = navigate;

  // 全局 401 处理（PRD §5.3）：清登录态 + 清本地进度缓存 + 跳 /login + toast
  const handleUnauthorized = useCallback(() => {
    setState((prev) => {
      if (prev.user) {
        try {
          localStorage.removeItem(progressKeyFor(prev.user.id));
        } catch {
          /* ignore */
        }
      }
      return { status: "guest", user: null };
    });
    navRef.current("/login", { replace: true });
    toast("登录已过期，请重新登录", "warning", 3500);
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(handleUnauthorized);
  }, [handleUnauthorized]);

  // 应用启动恢复会话（PRD §4.3）
  useEffect(() => {
    let cancelled = false;
    authApi
      .me()
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setState({ status: "authed", user: res.data.user });
        } else {
          setState({ status: "guest", user: null });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: "guest", user: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (c: Credentials) => {
    const res = await authApi.login(c);
    if (res.ok) {
      setState({ status: "authed", user: res.data.user });
      return { ok: true, data: res.data.user } as const;
    }
    return { ok: false, error: res.error } as const;
  }, []);

  const register = useCallback(async (c: Credentials) => {
    const res = await authApi.register(c);
    if (res.ok) {
      setState({ status: "authed", user: res.data.user });
      return { ok: true, data: res.data.user } as const;
    }
    return { ok: false, error: res.error } as const;
  }, []);

  const logout = useCallback(async () => {
    const prevUser = state.user;
    await authApi.logout();
    // 登出必须清本地进度缓存（PRD §4.5）
    if (prevUser) {
      try {
        localStorage.removeItem(progressKeyFor(prevUser.id));
      } catch {
        /* ignore */
      }
    }
    setState({ status: "guest", user: null });
  }, [state.user]);

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { progressKeyFor };
