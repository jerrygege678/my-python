import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-6xl font-bold text-slate-200">404</p>
      <p className="text-slate-500">页面不存在</p>
      <Link to="/" className="btn-primary">
        返回首页
      </Link>
    </div>
  );
}
