import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import type { ReactNode } from "react";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        <p className="text-slate-500 text-sm">正在加载…</p>
      </div>
    );
  }

  if (status === "guest") {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  return <>{children}</>;
}
