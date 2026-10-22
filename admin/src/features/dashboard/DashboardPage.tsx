import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  FileImage,
  FileText,
  FolderTree,
  HardDrive,
  Tags,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../shared/ui/PageHeader";
import { ErrorState, LoadingState } from "../../shared/ui/States";
import { apiClient } from "../../shared/api/api";
import { formatBytes, formatDate } from "../../shared/utils/format";
import { messageFromError } from "../../shared/utils/normalize";
import type { DashboardData } from "../../shared/types/content";
import { apiPaths } from "../../shared/api/paths";
import { PageCard } from "../../shared/ui/PageCard";
import { StatusBadge } from "../../shared/content/status";

const statItems = [
  { key: "users", label: "用户", icon: Users, href: "/users", tone: "sage" },
  { key: "posts", label: "文章", icon: FileText, href: "/posts", tone: "rose" },
  {
    key: "categories",
    label: "分类",
    icon: FolderTree,
    href: "/categories",
    tone: "amber",
  },
  { key: "tags", label: "标签", icon: Tags, href: "/tags", tone: "blue" },
  {
    key: "moments",
    label: "动态",
    icon: Zap,
    href: "/moments",
    tone: "violet",
  },
  {
    key: "attachments",
    label: "附件",
    icon: FileImage,
    href: "/attachments",
    tone: "cyan",
  },
] as const;

export function DashboardPage() {
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: ({ signal }) =>
      apiClient.get<DashboardData>(apiPaths.dashboard, { signal }),
    refetchInterval: 60_000,
  });

  return (
    <>
      <PageHeader
        eyebrow="OVERVIEW"
        title="控制台"
        description="内容、存储与服务运行状况一览。"
        actions={
          <Link className="ui-link-button" to="/posts/new">
            <FileText />
            写文章
          </Link>
        }
      />
      {query.isLoading ? (
        <LoadingState label="正在汇总站点数据…" />
      ) : query.isError ? (
        <ErrorState
          title="控制台暂时无法加载"
          description={`${messageFromError(query.error)} 需要实现 GET ${apiPaths.dashboard}。`}
          onRetry={() => void query.refetch()}
        />
      ) : query.data ? (
        <div className="dashboard-grid">
          <section className="stats-grid">
            {statItems.map(({ key, label, icon: Icon, href, tone }) => (
              <Link
                className={`stat-card stat-card--${tone}`}
                to={href}
                key={key}
              >
                <span className="stat-card__icon">
                  <Icon />
                </span>
                <div>
                  <strong>{query.data.stats[key].toLocaleString()}</strong>
                  <span>{label}</span>
                </div>
                <small>查看管理 →</small>
              </Link>
            ))}
          </section>
          <PageCard className="dashboard-recent">
            <div className="card-heading">
              <div>
                <h2>近期文章</h2>
                <p>最近创建或更新的内容</p>
              </div>
              <Link to="/posts">查看全部</Link>
            </div>
            {query.data.recent_posts.length ? (
              <div className="recent-list">
                {query.data.recent_posts.slice(0, 6).map((post) => (
                  <Link to={`/posts/${post.id}/edit`} key={post.id}>
                    <div>
                      <strong>{post.title}</strong>
                      <small>
                        {typeof post.category === "string"
                          ? post.category
                          : post.category?.name || "未分类"}{" "}
                        · {formatDate(post.updated_at)}
                      </small>
                    </div>
                    <StatusBadge status={post.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="compact-empty">还没有文章。</p>
            )}
          </PageCard>
          <PageCard>
            <div className="card-heading">
              <div>
                <h2>系统运行</h2>
                <p>最近一次服务端探测结果</p>
              </div>
              <Activity />
            </div>
            <dl className="system-list">
              <div>
                <dt>API 服务</dt>
                <dd>
                  <StatusBadge
                    status={
                      query.data.system?.api === "healthy"
                        ? "active"
                        : "offline"
                    }
                  />
                </dd>
              </div>
              <div>
                <dt>数据库</dt>
                <dd>{query.data.system?.database || "未报告"}</dd>
              </div>
              <div>
                <dt>缓存</dt>
                <dd>{query.data.system?.cache || "未报告"}</dd>
              </div>
              <div>
                <dt>运行时长</dt>
                <dd>
                  {query.data.system?.uptime
                    ? `${Math.floor(query.data.system.uptime / 3600)} 小时`
                    : "未报告"}
                </dd>
              </div>
            </dl>
          </PageCard>
          <PageCard>
            <div className="card-heading">
              <div>
                <h2>存储空间</h2>
                <p>附件存储使用情况</p>
              </div>
              <HardDrive />
            </div>
            {query.data.storage ? (
              <div className="storage-meter">
                <div>
                  <strong>{formatBytes(query.data.storage.used)}</strong>
                  <span>/ {formatBytes(query.data.storage.total)}</span>
                </div>
                <progress
                  max={query.data.storage.total || 1}
                  value={query.data.storage.used}
                />
                <small>
                  已使用{" "}
                  {Math.round(
                    (query.data.storage.used /
                      Math.max(query.data.storage.total, 1)) *
                      100,
                  )}
                  %
                </small>
              </div>
            ) : (
              <p className="compact-empty">服务端未提供存储统计。</p>
            )}
          </PageCard>
          <PageCard className="dashboard-activity">
            <div className="card-heading">
              <div>
                <h2>最近操作</h2>
                <p>需要服务端审计日志支持</p>
              </div>
            </div>
            {query.data.recent_operations?.length ? (
              <div className="activity-list">
                {query.data.recent_operations.map((item) => (
                  <div key={item.id}>
                    <i />
                    <div>
                      <strong>{item.action}</strong>
                      <small>
                        {item.operator || "系统"} ·{" "}
                        {formatDate(item.created_at)}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="compact-empty">暂无审计记录。</p>
            )}
          </PageCard>
        </div>
      ) : null}
    </>
  );
}
