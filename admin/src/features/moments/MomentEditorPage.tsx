import { FieldLabel } from "../../shared/ui/FieldLabel";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Send } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../shared/ui/Button";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import {
  MarkdownEditor,
  type AttachmentLibraryItem,
} from "../../shared/editor";
import { PageHeader } from "../../shared/ui/PageHeader";
import { ErrorState, LoadingState } from "../../shared/ui/States";
import { useToast } from "../../shared/ui/Toast";
import { apiClient } from "../../shared/api/api";
import { messageFromError, normalizePage } from "../../shared/utils/normalize";
import type {
  Attachment,
  Moment,
  PublishStatus,
} from "../../shared/types/content";
import { apiPaths } from "../../shared/api/paths";

export function MomentEditorPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState("");
  const [status, setStatus] = useState<PublishStatus>("draft");
  const [visibility, setVisibility] = useState<Moment["visibility"]>("public");
  const [publishedAt, setPublishedAt] = useState("");
  const [publishConfirm, setPublishConfirm] = useState(false);
  const [error, setError] = useState("");
  const relationKey = useMemo(() => crypto.randomUUID(), []);
  const detail = useQuery({
    queryKey: ["moment", id],
    enabled: editing,
    queryFn: ({ signal }) =>
      apiClient.get<Moment>(`${apiPaths.moments}/${id}`, { signal }),
  });
  const attachments = useQuery({
    queryKey: ["attachments", "editor"],
    queryFn: async ({ signal }) =>
      normalizePage<Attachment>(
        await apiClient.get<unknown>(apiPaths.attachments, {
          query: { page: 1, size: 100 },
          signal,
        }),
        ["items", "attachments", "files"],
        { page: 1, size: 100 },
      ).items,
  });
  useEffect(() => {
    if (!detail.data) return;
    setContent(detail.data.content);
    setSaved(detail.data.content);
    setStatus(detail.data.status);
    setVisibility(detail.data.visibility);
    setPublishedAt(detail.data.published_at?.slice(0, 16) ?? "");
  }, [detail.data]);
  const save = useMutation({
    mutationFn: (nextStatus?: PublishStatus) => {
      const payload = {
        content,
        status: nextStatus ?? status,
        visibility,
        published_at: publishedAt || null,
        attachment_relation_key: relationKey,
      };
      return editing
        ? apiClient.put<Moment, typeof payload>(
            `${apiPaths.moments}/${id}`,
            payload,
          )
        : apiClient.post<Moment, typeof payload>(apiPaths.moments, payload);
    },
    onSuccess: async (data) => {
      setSaved(content);
      await queryClient.invalidateQueries({ queryKey: ["moments"] });
      toast({
        tone: "success",
        title: data.status === "published" ? "动态已发布" : "动态已保存",
      });
      if (!editing) navigate(`/moments/${data.id}/edit`, { replace: true });
    },
    onError: (reason) =>
      toast({
        tone: "error",
        title: "保存失败",
        description: messageFromError(reason),
      }),
  });
  // 阻止空正文提交，可指定目标状态覆盖当前保存状态
  function persist(nextStatus?: PublishStatus) {
    if (!content.trim()) {
      setError("请输入动态正文");
      return;
    }
    setError("");
    save.mutate(nextStatus);
  }
  const library: AttachmentLibraryItem[] = (attachments.data ?? []).map(
    (item) => ({
      id: String(item.id),
      name: item.name,
      url: item.url,
      mimeType: item.mime_type,
      size: item.size,
    }),
  );
  if (detail.isLoading) return <LoadingState />;
  if (detail.isError)
    return (
      <ErrorState
        description={messageFromError(detail.error)}
        onRetry={() => void detail.refetch()}
      />
    );
  return (
    <>
      <PageHeader
        title={editing ? "编辑动态" : "新建动态"}
        description="记录较短的内容，并控制发布时间与可见性。"
        actions={
          <>
            <Link
              className="ui-link-button ui-link-button--outline"
              to="/moments"
            >
              <ArrowLeft />
              返回
            </Link>
            <Button
              variant="outline"
              loading={save.isPending}
              leftIcon={<Save />}
              onClick={() => persist("draft")}
            >
              保存草稿
            </Button>
            <Button
              loading={save.isPending}
              leftIcon={<Send />}
              onClick={() => {
                if (!content.trim()) {
                  setError("请输入动态正文");
                  return;
                }
                setPublishConfirm(true);
              }}
            >
              发布
            </Button>
          </>
        }
      />
      <div className="editor-layout">
        <div className="editor-main">
          <MarkdownEditor
            value={content}
            savedValue={saved}
            onChange={setContent}
            label="动态正文"
            error={error}
            minHeight={420}
            owner={{ type: "moment", id, relationKey }}
            attachmentLibrary={{
              items: library,
              loading: attachments.isLoading,
              error: attachments.isError
                ? messageFromError(attachments.error)
                : null,
              onRefresh: () => void attachments.refetch(),
            }}
          />
        </div>
        <aside className="editor-aside">
          <section className="form-section form-stack">
            <h2 className="form-section-title">发布设置</h2>
            <div className="field">
              <FieldLabel htmlFor="moment-status">状态</FieldLabel>
              <select
                id="moment-status"
                className="select"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as PublishStatus)
                }
              >
                <option value="draft">草稿</option>
                <option value="published">已发布</option>
                <option value="scheduled">定时发布</option>
                <option value="offline">已下架</option>
              </select>
            </div>
            <div className="field">
              <FieldLabel htmlFor="moment-visible">可见性</FieldLabel>
              <select
                id="moment-visible"
                className="select"
                value={visibility}
                onChange={(event) =>
                  setVisibility(event.target.value as Moment["visibility"])
                }
              >
                <option value="public">公开</option>
                <option value="unlisted">不公开列出</option>
                <option value="private">私密</option>
              </select>
            </div>
            <div className="field">
              <FieldLabel htmlFor="moment-time">发布时间</FieldLabel>
              <input
                id="moment-time"
                className="input"
                type="datetime-local"
                value={publishedAt}
                onChange={(event) => setPublishedAt(event.target.value)}
              />
            </div>
          </section>
        </aside>
      </div>
      <ConfirmDialog
        open={publishConfirm}
        onClose={() => !save.isPending && setPublishConfirm(false)}
        onConfirm={async () => {
          await save.mutateAsync("published");
          setPublishConfirm(false);
        }}
        loading={save.isPending}
        danger={false}
        title="发布这条动态？"
        description="发布后将按当前可见性设置出现在前台。"
        confirmLabel="确认发布"
      />
    </>
  );
}
