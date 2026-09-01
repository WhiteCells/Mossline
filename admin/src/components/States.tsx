import type { ReactNode } from "react";
import { AlertCircle, Inbox, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

export interface LoadingStateProps {
  label?: string;
  compact?: boolean;
}

export function LoadingState({
  label = "正在加载数据…",
  compact = false,
}: LoadingStateProps) {
  return (
    <div
      className={`ui-state ${compact ? "ui-state--compact" : ""}`}
      role="status"
      aria-live="polite"
    >
      <LoaderCircle className="ui-state__icon ui-spin" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({
  title = "暂无数据",
  description = "当前条件下没有可显示的内容。",
  icon = <Inbox aria-hidden="true" />,
  action,
}: EmptyStateProps) {
  return (
    <div className="ui-state">
      <span className="ui-state__visual">{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <div className="ui-state__action">{action}</div>}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
}

export function ErrorState({
  title = "加载失败",
  description = "请求没有成功，请检查网络后重试。",
  onRetry,
  retryLabel = "重新加载",
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      className={`ui-state ui-state--error ${compact ? "ui-state--compact" : ""}`}
      role="alert"
    >
      <span className="ui-state__visual">
        <AlertCircle aria-hidden="true" />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {onRetry && (
        <div className="ui-state__action">
          <Button
            variant="outline"
            leftIcon={<RefreshCw aria-hidden="true" />}
            onClick={onRetry}
          >
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export function Skeleton({
  width,
  height = 16,
}: {
  width?: number | string;
  height?: number | string;
}) {
  return (
    <span
      className="ui-skeleton"
      aria-hidden="true"
      style={{ width, height }}
    />
  );
}
