import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./store/AuthContext";
import { ProgressProvider } from "./store/ProgressContext";
import ToastContainer from "./components/Toast";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ProgressProvider>
          <App />
          <ToastContainer />
        </ProgressProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
