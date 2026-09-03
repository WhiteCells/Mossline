import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Save, Send } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  MarkdownEditor,
  type AttachmentLibraryItem,
  type UploadedAttachment,
} from "../components/editor";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { useToast } from "../components/Toast";
import { apiClient } from "../lib/api";
import {
  apiDateTimeToLocalInput,
  localInputToApiDateTime,
} from "../lib/dateTime";
import {
  getFieldErrors,
  messageFromError,
  normalizePage,
} from "../lib/normalize";
import { slugify } from "../lib/format";
import { publicArticleUrl } from "../lib/publicSite";
import type {
  Attachment,
  Category,
  Post,
  PublishStatus,
  Tag,
} from "../types/content";
import { endpoints } from "../types/content";

interface PostForm {
  title: string;
  slug: string;
  desc: string;
  cover: string;
  category_id: string;
  tag_ids: string[];
  content: string;
  status: PublishStatus;
  is_top: boolean;
  published_at: string;
  seo_title: string;
  seo_description: string;
}
const initial: PostForm = {
  title: "",
  slug: "",
  desc: "",
  cover: "",
  category_id: "",
  tag_ids: [],
  content: "",
  status: "draft",
  is_top: false,
  published_at: "",
  seo_title: "",
  seo_description: "",
};

function postToForm(post: Post): PostForm {
  return {
    title: post.title,
    slug: post.slug,
    desc: post.desc ?? "",
    cover: post.cover ?? "",
    category_id:
      post.category && typeof post.category === "object"
        ? String(post.category.id)
        : "",
    tag_ids: (post.tags ?? []).flatMap((tag) =>
      tag && typeof tag === "object" ? [String(tag.id)] : [],
    ),
    content: post.content ?? "",
    status: post.status,
    is_top: post.is_top,
    published_at: apiDateTimeToLocalInput(post.published_at),
    seo_title: post.seo_title ?? "",
    seo_description: post.seo_description ?? "",
  };
}

export function PostEditorPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<PostForm>(initial);
  const [savedContent, setSavedContent] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [publishConfirm, setPublishConfirm] = useState(false);
  const relationKey = useMemo(() => crypto.randomUUID(), []);

  const post = useQuery({
    queryKey: ["post", id],
    enabled: editing,
    queryFn: ({ signal }) =>
      apiClient.get<Post>(`${endpoints.posts}/${id}`, { signal }),
  });
  const categories = useQuery({
    queryKey: ["categories", "options"],
    queryFn: async ({ signal }) =>
      normalizePage<Category>(
        await apiClient.get<unknown>(endpoints.categories, {
          query: { page: 1, size: 200, status: "active" },
          signal,
        }),
        ["items", "categories", "category"],
        { page: 1, size: 200 },
      ).items,
  });
  const tags = useQuery({
    queryKey: ["tags", "options"],
    queryFn: async ({ signal }) =>
      normalizePage<Tag>(
        await apiClient.get<unknown>(endpoints.tags, {
          query: { page: 1, size: 500, status: "active" },
          signal,
        }),
        ["items", "tags", "tag"],
        { page: 1, size: 500 },
      ).items,
  });
  const attachments = useQuery({
    queryKey: ["attachments", "editor"],
    queryFn: async ({ signal }) =>
      normalizePage<Attachment>(
        await apiClient.get<unknown>(endpoints.attachments, {
          query: { page: 1, size: 100, type: "image" },
          signal,
        }),
        ["items", "attachments", "files"],
        { page: 1, size: 100 },
      ).items,
  });

  useEffect(() => {
    if (!post.data) return;
    const next = postToForm(post.data);
    setForm(next);
    setSavedContent(next.content);
  }, [post.data]);

  const save = useMutation({
    mutationFn: (status?: PublishStatus) => {
      const payload = {
        ...form,
        status: status ?? form.status,
        published_at: localInputToApiDateTime(form.published_at),
        content_type: "markdown",
        attachment_relation_key: relationKey,
      };
      return editing
        ? apiClient.put<Post, typeof payload>(
            `${endpoints.posts}/${id}`,
            payload,
          )
        : apiClient.post<Post, typeof payload>(endpoints.posts, payload);
    },
    onSuccess: async (data) => {
      const next = postToForm(data);
      setForm(next);
      setSavedContent(next.content);
      setErrors({});
      queryClient.setQueryData<Post>(["post", String(data.id)], data);
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast({
        tone: "success",
        title: data.status === "published" ? "文章已发布" : "文章已保存",
      });
      if (!editing) navigate(`/posts/${data.id}/edit`, { replace: true });
    },
    onError: (error) => {
      setErrors(getFieldErrors(error));
      toast({
        tone: "error",
        title: "保存失败",
        description: messageFromError(error),
      });
    },
  });

  function validate(targetStatus: PublishStatus = form.status) {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = "请输入文章标题";
    if (!form.slug.trim()) next.slug = "请输入 Slug";
    else if (!/^[a-z0-9\u4e00-\u9fa5-]+$/.test(form.slug))
      next.slug = "Slug 只能包含字母、数字、中文和连字符";
    if (!form.content.trim()) next.content = "请输入正文";
    if (targetStatus === "scheduled" && !form.published_at)
      next.published_at = "定时发布需要选择时间";
    setErrors(next);
    return !Object.keys(next).length;
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!validate(form.status)) return;
    if (form.status === "published") {
      setPublishConfirm(true);
      return;
    }
    save.mutate(undefined);
  }
  function publish() {
    if (validate("published")) setPublishConfirm(true);
  }
  const library: AttachmentLibraryItem[] = (attachments.data ?? []).map(
    (item) => ({
      id: String(item.id),
      name: item.name,
      url: item.url,
      mimeType: item.mime_type,
      size: item.size,
      relationCount: item.references?.length,
    }),
  );

  if (post.isLoading) return <LoadingState label="正在加载文章…" />;
  if (post.isError)
    return (
      <ErrorState
        title="无法打开文章"
        description={messageFromError(post.error)}
        onRetry={() => void post.refetch()}
      />
    );
  return (
    <form onSubmit={submit} className="editor-page">
      <PageHeader
        title={editing ? "编辑文章" : "新建文章"}
        description="编辑 Markdown 正文、发布信息与检索展示信息。"
        breadcrumbs={[
          { label: "文章管理", href: "/admin/posts" },
          { label: editing ? "编辑" : "新建" },
        ]}
        actions={
          <>
            <Link
              className="ui-link-button ui-link-button--outline"
              to="/posts"
            >
              <ArrowLeft />
              返回列表
            </Link>
            {editing && form.status === "published" ? (
              <a
                className="ui-link-button ui-link-button--outline"
                href={publicArticleUrl(form.slug)}
                target="_blank"
                rel="noreferrer"
              >
                <Eye />
                前台查看
              </a>
            ) : editing ? (
              <Button
                variant="outline"
                disabled
                leftIcon={<Eye />}
                title="仅已发布文章可在前台查看"
              >
                前台不可见
              </Button>
            ) : null}
            <Button
              variant="outline"
              type="submit"
              loading={save.isPending}
              leftIcon={<Save />}
            >
              保存
            </Button>
            <Button
              loading={save.isPending}
              leftIcon={<Send />}
              onClick={publish}
            >
              发布
            </Button>
          </>
        }
      />
      <div className="editor-layout">
        <div className="editor-main form-stack">
          <section className="form-section">
            <div className="form-grid">
              <div className="field field--full">
                <label htmlFor="post-title">
                  标题<span className="required">*</span>
                  <small>{form.title.length}/120</small>
                </label>
                <input
                  id="post-title"
                  className="input input--title"
                  maxLength={120}
                  value={form.title}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      title: event.target.value,
                      slug: value.slug || slugify(event.target.value),
                    }))
                  }
                  aria-invalid={Boolean(errors.title)}
                />
                {errors.title && (
                  <span className="field-error">{errors.title}</span>
                )}
              </div>
              <div className="field field--full">
                <label htmlFor="post-desc">
                  摘要<small>{form.desc.length}/300</small>
                </label>
                <textarea
                  id="post-desc"
                  className="textarea"
                  maxLength={300}
                  value={form.desc}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, desc: event.target.value }))
                  }
                />
              </div>
            </div>
          </section>
          <MarkdownEditor
            value={form.content}
            savedValue={savedContent}
            onChange={(content) => setForm((value) => ({ ...value, content }))}
            required
            error={errors.content}
            owner={{ type: "article", id, relationKey }}
            attachmentLibrary={{
              items: library,
              loading: attachments.isLoading,
              error: attachments.isError
                ? messageFromError(attachments.error)
                : null,
              onRefresh: () => void attachments.refetch(),
            }}
            onAttachmentUploaded={(item: UploadedAttachment) => {
              void queryClient.invalidateQueries({ queryKey: ["attachments"] });
              toast({
                tone: "success",
                title: "图片已上传",
                description: item.name,
              });
            }}
            onUploadError={(error) =>
              toast({
                tone: "error",
                title: "图片上传失败",
                description: error.message,
              })
            }
          />
          <section className="form-section">
            <h2 className="form-section-title">SEO 与分享</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="seo-title">SEO 标题</label>
                <input
                  id="seo-title"
                  className="input"
                  value={form.seo_title}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      seo_title: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="cover">封面地址</label>
                <input
                  id="cover"
                  className="input"
                  type="url"
                  value={form.cover}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      cover: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="field field--full">
                <label htmlFor="seo-description">SEO 描述</label>
                <textarea
                  id="seo-description"
                  className="textarea"
                  value={form.seo_description}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      seo_description: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </section>
        </div>
        <aside className="editor-aside form-stack">
          <section className="form-section">
            <h2 className="form-section-title">发布设置</h2>
            <div className="form-stack">
              <div className="field">
                <label htmlFor="post-status">状态</label>
                <select
                  id="post-status"
                  className="select"
                  value={form.status}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      status: event.target.value as PublishStatus,
                    }))
                  }
                >
                  <option value="draft">草稿</option>
                  <option value="published">已发布</option>
                  <option value="scheduled">定时发布</option>
                  <option value="offline">已下架</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="publish-time">发布时间</label>
                <input
                  id="publish-time"
                  className="input"
                  type="datetime-local"
                  value={form.published_at}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      published_at: event.target.value,
                    }))
                  }
                  aria-invalid={Boolean(errors.published_at)}
                />
                {errors.published_at && (
                  <span className="field-error">{errors.published_at}</span>
                )}
              </div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.is_top}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      is_top: event.target.checked,
                    }))
                  }
                />
                在文章列表置顶
              </label>
            </div>
          </section>
          <section className="form-section">
            <h2 className="form-section-title">分类与标签</h2>
            <div className="form-stack">
              <div className="field">
                <label htmlFor="post-category">分类</label>
                <select
                  id="post-category"
                  className="select"
                  value={form.category_id}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      category_id: event.target.value,
                    }))
                  }
                >
                  <option value="">未分类</option>
                  {categories.data?.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <span className="field-label">标签</span>
                <div className="tag-options">
                  {tags.data?.map((tag) => (
                    <label className="checkbox" key={tag.id}>
                      <input
                        type="checkbox"
                        checked={form.tag_ids.includes(String(tag.id))}
                        onChange={(event) =>
                          setForm((value) => ({
                            ...value,
                            tag_ids: event.target.checked
                              ? [...value.tag_ids, String(tag.id)]
                              : value.tag_ids.filter(
                                  (item) => item !== String(tag.id),
                                ),
                          }))
                        }
                      />
                      {tag.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>
          <section className="form-section">
            <h2 className="form-section-title">固定链接</h2>
            <div className="field">
              <label htmlFor="slug">
                Slug<span className="required">*</span>
              </label>
              <input
                id="slug"
                className="input"
                value={form.slug}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    slug: slugify(event.target.value),
                  }))
                }
                aria-invalid={Boolean(errors.slug)}
              />
              {errors.slug && (
                <span className="field-error">{errors.slug}</span>
              )}
              <span className="field-hint">
                /articles/{form.slug || "your-slug"}
              </span>
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
      title="发布这篇文章？"
      description="发布后文章会按设定时间出现在前台，请确认标题、正文和可见信息已经检查。"
      confirmLabel="确认发布"
    />
  </form>
  );
}
