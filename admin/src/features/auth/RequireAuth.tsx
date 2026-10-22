import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./AuthContext";

export interface RequireAuthProps {
  children?: ReactNode;
  loadingFallback?: ReactNode;
  redirectTo?: string;
}

/** 等待会话恢复后检查登录状态，跳转登录时保留原地址供登录成功后返回 */
export function RequireAuth({
  children,
  loadingFallback = null,
  redirectTo = "/login",
}: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <>{loadingFallback}</>;
  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{
          from: `${location.pathname}${location.search}${location.hash}`,
        }}
      />
    );
  }

  return children === undefined ? <Outlet /> : <>{children}</>;
}
