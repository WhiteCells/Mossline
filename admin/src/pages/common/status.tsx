import { Badge, type BadgeTone } from "../../components/Badge";

const labels: Record<string, string> = {
  active: "启用",
  disabled: "禁用",
  draft: "草稿",
  published: "已发布",
  scheduled: "定时发布",
  offline: "已下架",
  public: "公开",
  private: "私密",
  unlisted: "不公开列出",
};

const tones: Record<string, BadgeTone> = {
  active: "success",
  published: "success",
  disabled: "neutral",
  draft: "warning",
  scheduled: "info",
  offline: "danger",
  public: "success",
  private: "warning",
  unlisted: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge dot tone={tones[status] ?? "neutral"}>
      {labels[status] ?? status}
    </Badge>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function displayName(
  value: string | { name?: string; nickname?: string } | null | undefined,
): string {
  if (!value) return "—";
  if (typeof value === "string") return value;
  return value.nickname || value.name || "—";
}
