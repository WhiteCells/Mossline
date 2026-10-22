import { useQueries } from "@tanstack/react-query";
import { CheckCircle2, RefreshCw, Server, XCircle } from "lucide-react";
import { Button } from "../../shared/ui/Button";
import { PageHeader } from "../../shared/ui/PageHeader";
import { apiClient } from "../../shared/api/api";
import { apiPaths } from "../../shared/api/paths";
import { messageFromError } from "../../shared/utils/normalize";

const checks = [
  ["当前用户", apiPaths.currentUser],
  ["控制台统计", apiPaths.dashboard],
  ["用户管理", apiPaths.users],
  ["文章管理", apiPaths.posts],
  ["分类管理", apiPaths.categories],
  ["标签管理", apiPaths.tags],
  ["动态管理", apiPaths.moments],
  ["友链管理", apiPaths.friends],
  ["附件管理", apiPaths.attachments],
  ["关于页面", apiPaths.about],
] as const;

export function ApiStatusPage() {
  const results = useQueries({
    queries: checks.map(([, path]) => ({
      queryKey: ["capability", path],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        apiClient.get<unknown>(path, {
          query:
            path === apiPaths.currentUser ||
            path === apiPaths.about ||
            path === apiPaths.dashboard
              ? undefined
              : { page: 1, size: 1 },
          signal,
        }),
      retry: false,
      staleTime: 30_000,
    })),
  });
  const refresh = () => results.forEach((result) => void result.refetch());
  return (
    <>
      <PageHeader
        title="API 能力状态"
        description="直接探测管理端依赖的真实接口，不使用模拟数据。"
        actions={
          <Button variant="outline" leftIcon={<RefreshCw />} onClick={refresh}>
            重新探测
          </Button>
        }
      />
      <section className="capability-grid">
        {checks.map(([label, path], index) => {
          const result = results[index];
          const loading = result?.isLoading || result?.isFetching;
          const ok = result?.isSuccess;
          return (
            <article className="capability-card" key={path}>
              <span
                className={loading ? "is-loading" : ok ? "is-ok" : "is-error"}
              >
                {loading ? <RefreshCw /> : ok ? <CheckCircle2 /> : <XCircle />}
              </span>
              <div>
                <h2>{label}</h2>
                <code>GET {path}</code>
                <p>
                  {loading
                    ? "正在探测…"
                    : ok
                      ? "接口可用"
                      : messageFromError(result?.error, "接口不可用")}
                </p>
              </div>
            </article>
          );
        })}
      </section>
      <section className="api-contract">
        <Server />
        <div>
          <h2>仍需后端落实的统一约定</h2>
          <ul>
            <li>登录返回 token 后，提供 GET /api/me 返回当前用户。</li>
            <li>所有写接口统一 Bearer 鉴权、权限校验与字段错误结构。</li>
            <li>所有列表统一 page、size、total、total_pages 和 items。</li>
            <li>批量操作与附件关联删除必须事务化处理。</li>
          </ul>
        </div>
      </section>
    </>
  );
}
