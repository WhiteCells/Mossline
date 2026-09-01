import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Save, Send } from "lucide-react";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  MarkdownEditor,
  MarkdownPreview,
  type AttachmentLibraryItem,
} from "../components/editor";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { useToast } from "../components/Toast";
import { apiClient } from "../lib/api";
import { messageFromError, normalizePage } from "../lib/normalize";
import type {
  AboutPage as AboutData,
  Attachment,
  PublishStatus,
} from "../types/content";
import { endpoints } from "../types/content";
import { ApiRequirement } from "./common/ApiRequirement";

export function AboutPage() {
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState("");
  const [status, setStatus] = useState<PublishStatus>("draft");
  const [preview, setPreview] = useState(false);
  const [publishConfirm, setPublishConfirm] = useState(false);
  const relationKey = useMemo(() => crypto.randomUUID(), []);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const page = useQuery({
    queryKey: ["about"],
    queryFn: ({ signal }) =>
      apiClient.get<AboutData>(endpoints.about, { signal }),
  });
  const attachments = useQuery({
    queryKey: ["attachments", "editor"],
    queryFn: async ({ signal }) =>
      normalizePage<Attachment>(
        await apiClient.get<unknown>(endpoints.attachments, {
          query: { page: 1, size: 100 },
          signal,
        }),
        ["items", "attachments", "files"],
        { page: 1, size: 100 },
      ).items,
  });
  useEffect(() => {
    if (page.data) {
      setContent(page.data.content);
      setSaved(page.data.content);
      setStatus(page.data.status);
    }
  }, [page.data]);
  const save = useMutation({
    mutationFn: (nextStatus?: PublishStatus) =>
      apiClient.put<
        AboutData,
        {
          content: string;
          status: PublishStatus;
          attachment_relation_key: string;
        }
      >(endpoints.about, {
        content,
        status: nextStatus ?? status,
        attachment_relation_key: relationKey,
      }),
    onSuccess: async (data) => {
      setSaved(content);
      setStatus(data.status);
      await queryClient.invalidateQueries({ queryKey: ["about"] });
      toast({
        tone: "success",
        title:
          data.status === "published" ? "关于页面已发布" : "关于页面已保存",
      });
    },
    onError: (error) =>
      toast({
        tone: "error",
        title: "保存失败",
        description: messageFromError(error),
      }),
  });
  const library: AttachmentLibraryItem[] = (attachments.data ?? []).map(
    (item) => ({
      id: String(item.id),
      name: item.name,
      url: item.url,
      mimeType: item.mime_type,
      size: item.size,
    }),
  );
  if (page.isLoading) return <LoadingState />;
  if (page.isError)
    return (
      <>
        <PageHeader title="关于页面" description="编辑站点的长期介绍内容。" />
        <ErrorState
          title="关于页面接口不可用"
          description={`${messageFromError(page.error)} 需要实现 GET/PUT ${endpoints.about}。`}
          onRetry={() => void page.refetch()}
        />
      </>
    );
  return (
    <>
      <PageHeader
        title="关于页面"
        description="使用与文章一致的 Markdown 能力编辑、预览和发布。"
        actions={
          <>
            <Button
              variant="outline"
              leftIcon={<Eye />}
              onClick={() => setPreview(true)}
            >
              页面预览
            </Button>
            <Button
              variant="outline"
              loading={save.isPending}
              leftIcon={<Save />}
              onClick={() => save.mutate("draft")}
            >
              保存草稿
            </Button>
            <Button
              loading={save.isPending}
              leftIcon={<Send />}
              onClick={() => setPublishConfirm(true)}
            >
              发布
            </Button>
          </>
        }
      />
      <ApiRequirement>
        版本历史与草稿恢复需要后端提供版本列表、版本详情和恢复接口；当前仅接入单一草稿/发布状态，不在前端伪造版本。
      </ApiRequirement>
      <div className="about-editor">
        <MarkdownEditor
          value={content}
          savedValue={saved}
          onChange={setContent}
          owner={{
            type: "about",
            id: page.data?.id ? String(page.data.id) : undefined,
            relationKey,
          }}
          attachmentLibrary={{
            items: library,
            loading: attachments.isLoading,
            error: attachments.isError
              ? messageFromError(attachments.error)
              : null,
            onRefresh: () => void attachments.refetch(),
          }}
        />
        <aside className="about-meta form-section">
          <h2 className="form-section-title">页面状态</h2>
          <select
            className="select"
            value={status}
            onChange={(event) => setStatus(event.target.value as PublishStatus)}
          >
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
          </select>
          <p className="field-hint">
            最后更新：{page.data?.updated_at || "服务端未提供"}
          </p>
          <p className="field-hint">
            版本：{page.data?.version ?? "未启用版本管理"}
          </p>
        </aside>
      </div>
      <Modal
        open={preview}
        onClose={() => setPreview(false)}
        title="关于页面预览"
        size="xl"
      >
        <div className="about-preview">
          <MarkdownPreview value={content} />
        </div>
      </Modal>
      <ConfirmDialog
        open={publishConfirm}
        onClose={() => !save.isPending && setPublishConfirm(false)}
        onConfirm={async () => {
          await save.mutateAsync("published");
          setPublishConfirm(false);
        }}
        loading={save.isPending}
        danger={false}
        title="发布关于页面？"
        description="发布后将替换前台当前的关于页面内容。"
        confirmLabel="确认发布"
      />
    </>
  );
}
