import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import OnlineList from "./pages/OnlineList";
import OnlineDetail from "./pages/OnlineDetail";
import OfflineList from "./pages/OfflineList";
import OfflineDetail from "./pages/OfflineDetail";
import ProgressPage from "./pages/ProgressPage";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/online" element={<OnlineList />} />
        <Route path="/online/:kpId" element={<OnlineDetail />} />
        <Route path="/offline" element={<OfflineList />} />
        <Route path="/offline/:kpId" element={<OfflineDetail />} />
        <Route path="/progress" element={<ProgressPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
