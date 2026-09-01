import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Leaf, LockKeyhole, UserRound } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { messageFromError } from "../lib/normalize";

export function LoginPage() {
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
            <label htmlFor="username">用户名</label>
            <div className="input-with-icon">
              <UserRound />
              <input
                id="username"
                className="input"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                aria-invalid={Boolean(error)}
                autoFocus
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="password">密码</label>
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
              />
            </div>
          </div>
          {error && (
            <div className="login-error" role="alert">
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
          <small className="login-help">
            登录接口：POST /api/login。首次使用前请先在后端创建管理员账号。
          </small>
        </form>
      </section>
    </main>
  );
}
