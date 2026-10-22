import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import { AuthProvider } from "./features/auth/AuthContext";
import { ToastProvider } from "./shared/ui/Toast";
import { queryClient } from "./shared/api/query";
import "./app/styles/index.css";

const root = document.getElementById("root");
if (!root) throw new Error("缺少 React 应用挂载节点 #root");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/admin">
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
