import { FieldLabel } from "../../shared/ui/FieldLabel";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Leaf,
  LockKeyhole,
  Moon,
  Sun,
  UserRound,
} from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAdminTheme } from "../../shared/hooks/useAdminTheme";
import { useAuth } from "./AuthContext";
import { Button } from "../../shared/ui/Button";
import { messageFromError } from "../../shared/utils/normalize";

export function LoginPage() {
  const { theme, toggleTheme } = useAdminTheme();
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const from = (location.state as { from?: string } | null)?.from || "/";

  useEffect(() => setError(""), [password, username]);

  if (!isLoading && isAuthenticated) return <Navigate to={from} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError("请输入用户名和密码。");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await login({ username: username.trim(), password });
      navigate(from, { replace: true });
    } catch (reason) {
      setError(messageFromError(reason, "登录失败，请检查账号和密码。"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-toolbar">
        <a href="/">
          <ArrowLeft aria-hidden="true" /> 返回首页
        </a>
        <Button
          variant="ghost"
          size="icon"
          aria-label={theme === "dark" ? "切换至浅色主题" : "切换至深色主题"}
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>
      </div>
      <section className="login-story" aria-hidden="true">
        <div className="login-brand">
          <span>
            <Leaf />
          </span>
          Mossline
        </div>
        <div className="login-quote">
          <p>
            把每一段被认真记录的时间，
            <br />
            安静地留在这里。
          </p>
          <small>MOSSLINE · CONTENT STUDIO</small>
        </div>
        <div className="login-landscape">
          <i />
          <i />
          <i />
        </div>
      </section>
      <section className="login-panel">
        <form className="login-form" onSubmit={submit} noValidate>
          <div className="login-mobile-brand">
            <Leaf /> Mossline
          </div>
          <p className="page-header__eyebrow">WELCOME BACK</p>
          <h1>登录管理端</h1>
          <p className="login-intro">管理文章、动态与站点内容。</p>
          <div className="field">
            <FieldLabel htmlFor="username">用户名</FieldLabel>
            <div className="input-with-icon">
              <UserRound />
              <input
                id="username"
                className="input"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
                autoFocus
              />
            </div>
          </div>
          <div className="field">
            <FieldLabel htmlFor="password">密码</FieldLabel>
            <div className="input-with-icon">
              <LockKeyhole />
              <input
                id="password"
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
              />
            </div>
          </div>
          {error && (
            <div id="login-error" className="login-error" role="alert">
              {error}
            </div>
          )}
          <Button
            type="submit"
            size="lg"
            loading={submitting}
            rightIcon={<ArrowRight />}
            disabled={!username.trim() || !password}
          >
            登录
          </Button>
          <small className="login-help">循着时间的纹理，继续今天的书写。</small>
        </form>
      </section>
    </main>
  );
}
