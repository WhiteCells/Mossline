import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  apiClient,
  apiPaths,
  authTokenStorage,
  onUnauthorized,
} from "../lib/api";
import { queryClient, queryKeys } from "../lib/query";
import type {
  AuthContextValue,
  AuthUser,
  LoginCredentials,
  LoginResponse,
} from "../types/api";

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
  loginPath?: string;
  logoutPath?: string;
  currentUserPath?: string;
}

function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== "object" || value === null || !("id" in value))
    return false;
  const id = value.id;
  return (
    (typeof id === "string" && Boolean(id.trim())) || typeof id === "number"
  );
}

function assertAuthUser(value: unknown): AuthUser {
  const candidate =
    typeof value === "object" && value !== null && "user" in value
      ? value.user
      : value;
  if (!isAuthUser(candidate)) {
    throw new TypeError("当前用户接口返回了无效的数据结构");
  }
  return candidate;
}

export function AuthProvider({
  children,
  loginPath = apiPaths.login,
  logoutPath = apiPaths.logout,
  currentUserPath = apiPaths.currentUser,
}: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loginPromiseRef = useRef<Promise<AuthUser> | null>(null);
  const logoutPromiseRef = useRef<Promise<void> | null>(null);

  const loadCurrentUser = useCallback(
    async (signal?: AbortSignal): Promise<AuthUser> => {
      const currentUser = assertAuthUser(
        await apiClient.get<unknown>(currentUserPath, { signal }),
      );
      setUser(currentUser);
      queryClient.setQueryData(queryKeys.currentUser, currentUser);
      return currentUser;
    },
    [currentUserPath],
  );

  const refreshUser = useCallback(
    async (signal?: AbortSignal): Promise<AuthUser> => {
      if (!authTokenStorage.get()) {
        setUser(null);
        throw new Error("当前没有登录会话");
      }
      return loadCurrentUser(signal);
    },
    [loadCurrentUser],
  );

  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      setUser(null);
      queryClient.removeQueries({ queryKey: queryKeys.currentUser });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const initialize = async () => {
      if (!authTokenStorage.get()) {
        if (active) setIsLoading(false);
        return;
      }

      try {
        await loadCurrentUser(controller.signal);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          authTokenStorage.clear();
          if (active) setUser(null);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void initialize();
    return () => {
      active = false;
      controller.abort();
    };
  }, [loadCurrentUser]);

  const login = useCallback(
    (credentials: LoginCredentials): Promise<AuthUser> => {
      if (loginPromiseRef.current) return loginPromiseRef.current;

      const operation = (async () => {
        setIsLoading(true);
        try {
          const response = await apiClient.post<
            LoginResponse,
            LoginCredentials
          >(loginPath, credentials);
          if (!response.token || typeof response.token !== "string") {
            throw new TypeError("登录接口未返回有效 token");
          }

          authTokenStorage.set(response.token);
          if (response.user !== undefined) {
            const authenticatedUser = assertAuthUser(response.user);
            setUser(authenticatedUser);
            queryClient.setQueryData(queryKeys.currentUser, authenticatedUser);
            return authenticatedUser;
          }

          return await loadCurrentUser();
        } catch (error) {
          authTokenStorage.clear();
          setUser(null);
          queryClient.removeQueries({ queryKey: queryKeys.currentUser });
          throw error;
        } finally {
          setIsLoading(false);
        }
      })();

      loginPromiseRef.current = operation;
      const release = () => {
        if (loginPromiseRef.current === operation)
          loginPromiseRef.current = null;
      };
      void operation.then(release, release);
      return operation;
    },
    [loadCurrentUser, loginPath],
  );

  const logout = useCallback((): Promise<void> => {
    if (logoutPromiseRef.current) return logoutPromiseRef.current;

    const token = authTokenStorage.get();
    const operation = (async () => {
      setIsLoading(true);
      try {
        if (token) {
          await apiClient.post<Record<string, never>, { token: string }>(
            logoutPath,
            { token },
          );
        }
      } finally {
        authTokenStorage.clear();
        setUser(null);
        queryClient.clear();
        setIsLoading(false);
      }
    })();

    logoutPromiseRef.current = operation;
    const release = () => {
      if (logoutPromiseRef.current === operation)
        logoutPromiseRef.current = null;
    };
    void operation.then(release, release);
    return operation;
  }, [logoutPath]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      logout,
      refreshUser,
    }),
    [isLoading, login, logout, refreshUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}
