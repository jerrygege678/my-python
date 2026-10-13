import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import FormField from "../components/FormField";
import Icon from "../components/Icon";

const ERRORS: Record<string, string> = {
  USERNAME_TAKEN: "用户名已存在",
  INVALID_USERNAME: "用户名需为 3-20 位字母/数字/下划线/中文",
  INVALID_PASSWORD: "密码需为 6-72 位且不能全为空白",
  TOO_MANY_REQUESTS: "操作过于频繁，请稍后再试",
};

export default function Register() {
  const { status, register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (status === "authed") return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    setLoading(true);
    const res = await register({ username: username.trim(), password });
    setLoading(false);
    if (res.ok) {
      navigate("/", { replace: true });
    } else {
      setError(ERRORS[res.error.code] ?? res.error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="card w-full max-w-[400px] p-6">
        <div className="text-center mb-6">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white mx-auto mb-3">
            <Icon name="logo" size={26} strokeWidth={2.25} />
          </span>
          <h1 className="text-xl font-bold text-ink">注册</h1>
          <p className="text-sm text-slate-500 mt-1">创建账号开始闯关</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="用户名" htmlFor="username">
            <input
              id="username"
              className="input h-10"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="3-20 位字母/数字/下划线/中文"
              autoComplete="username"
              required
            />
          </FormField>
          <FormField label="密码" htmlFor="password">
            <input
              id="password"
              type="password"
              className="input h-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6-72 位"
              autoComplete="new-password"
              required
            />
          </FormField>
          <FormField label="确认密码" htmlFor="confirm">
            <input
              id="confirm"
              type="password"
              className="input h-10"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="再次输入密码"
              autoComplete="new-password"
              required
            />
          </FormField>
          {error && <p className="text-xs text-danger">{error}</p>}
          <button
            type="submit"
            className="btn-primary w-full h-11"
            disabled={loading}
          >
            {loading ? "注册中…" : "注册并登录"}
          </button>
        </form>
        <p className="text-center text-sm text-slate-500 mt-4">
          已有账号？{" "}
          <Link to="/login" className="text-primary hover:underline">
            登录
          </Link>
        </p>
      </div>
    </div>
  );
}
