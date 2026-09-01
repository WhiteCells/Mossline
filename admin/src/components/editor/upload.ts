import type {
  UploadAttachment,
  UploadAttachmentInput,
  UploadedAttachment,
} from "./types";
import { apiClient, apiPaths } from "../../lib/api";

export interface AttachmentUploaderOptions {
  endpoint?: string;
  fieldName?: string;
  headers?: Readonly<Record<string, string>>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number") return String(value);
  return undefined;
};

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const unwrapAttachment = (payload: unknown): Record<string, unknown> => {
  if (!isRecord(payload)) throw new Error("附件接口返回了无法识别的数据");

  let value: Record<string, unknown> = payload;
  if (isRecord(value.data)) value = value.data;
  if (isRecord(value.attachment)) value = value.attachment;
  return value;
};

const parseAttachment = (
  payload: unknown,
  fallbackName: string,
): UploadedAttachment => {
  const value = unwrapAttachment(payload);
  const url =
    asString(value.url) ??
    asString(value.src) ??
    asString(value.path) ??
    asString(value.downloadUrl);

  if (!url) throw new Error("附件上传成功，但响应中缺少可访问地址");

  return {
    id: asString(value.id) ?? url,
    name:
      asString(value.name) ??
      asString(value.filename) ??
      asString(value.fileName) ??
      fallbackName,
    url,
    mimeType:
      asString(value.mimeType) ??
      asString(value.mime_type) ??
      asString(value.contentType),
    size: asNumber(value.size),
    thumbnailUrl: asString(value.thumbnailUrl) ?? asString(value.thumbnail_url),
  };
};

/**
 * Creates the default same-origin uploader used by MarkdownEditor.
 *
 * Expected contract: POST multipart/form-data to /api/attachment with
 * `file`, `filename`, and optional relation_type/relation_id/relation_key.
 * The response may contain the attachment directly or under data/attachment.
 */
export const createAttachmentUploader = (
  options: AttachmentUploaderOptions = {},
): UploadAttachment => {
  const {
    endpoint = apiPaths.attachments,
    fieldName = "file",
    headers,
  } = options;

  return async ({ file, owner, signal, onProgress }: UploadAttachmentInput) => {
    const metadata: Record<string, string> = { filename: file.name };
    if (owner) metadata.relation_type = owner.type;
    if (owner?.id) metadata.relation_id = owner.id;
    if (owner?.relationKey) metadata.relation_key = owner.relationKey;

    const payload = await apiClient.upload<unknown>(endpoint, file, {
      fieldName,
      fileName: file.name,
      headers,
      signal,
      metadata,
      onProgress: ({ percent }) => onProgress(percent ?? 0),
    });
    onProgress(100);
    return parseAttachment(payload, file.name);
  };
};

const splitFileName = (name: string): { base: string; extension: string } => {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) {
    return { base: name, extension: "" };
  }
  return { base: name.slice(0, dot), extension: name.slice(dot) };
};

/** Produces a readable, collision-resistant filename without changing bytes. */
export const createUniqueUploadFile = (file: File): File => {
  const { base, extension } = splitFileName(file.name || "image");
  const safeBase =
    base
      .normalize("NFKC")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\p{L}\p{N}._-]+/gu, "-")
      .replace(/-+/g, "-")
      .replace(/^[-_.]+|[-_.]+$/g, "") || "image";
  const nonce = crypto.randomUUID().slice(0, 8);
  const timestamp = Date.now().toString(36);
  return new File([file], `${safeBase}-${timestamp}-${nonce}${extension}`, {
    type: file.type,
    lastModified: file.lastModified,
  });
};

export const renameFile = (file: File, name: string): File =>
  new File([file], name.trim(), {
    type: file.type,
    lastModified: file.lastModified,
  });
