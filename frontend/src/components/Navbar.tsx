import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { useProgress } from "../store/ProgressContext";
import { toast } from "../lib/toast";
import ConfirmDialog from "./ConfirmDialog";
import Icon from "./Icon";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { syncStatus, retrySync } = useProgress();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = async () => {
    setConfirmLogout(false);
    await logout();
    toast("已退出登录", "info");
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
      {syncStatus === "offline" && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-sm text-amber-800">
          <span className="flex items-center gap-1.5">
            <Icon name="alert" size={15} strokeWidth={2} />
            进度同步暂不可用，你的进度会先保存在本地
          </span>
          <button className="btn-ghost text-amber-800" onClick={retrySync}>
            重试
          </button>
        </div>
      )}
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-ink">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white">
            <Icon name="logo" size={16} strokeWidth={2.25} />
          </span>
          <span>Python 闯关实验室</span>
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink to="/online">在线验证</NavLink>
          <NavLink to="/offline">外部实操</NavLink>
          <NavLink to="/progress">我的进度</NavLink>
        </nav>
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-sm"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <Icon name="user" size={14} strokeWidth={2} />
              </span>
              <span className="font-medium text-slate-700">{user.username}</span>
              <Icon
                name="chevronDown"
                size={15}
                className={`text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}
              />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-44 card py-1 shadow-lg">
                <Link
                  to="/progress"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon name="trendingUp" size={15} className="text-slate-400" />
                  我的进度
                </Link>
                <button
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-slate-50"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmLogout(true);
                  }}
                >
                  <Icon name="logOut" size={15} />
                  退出登录
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={confirmLogout}
        title="确认退出登录？"
        message="退出后需要重新登录才能继续学习。"
        confirmText="退出"
        danger
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </header>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 hover:text-primary transition-colors"
    >
      {children}
    </Link>
  );
}
