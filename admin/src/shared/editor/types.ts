export type EditorMode = "edit" | "split" | "preview";

export type AttachmentOwnerType = "article" | "moment" | "about" | "site";

export interface AttachmentOwner {
  type: AttachmentOwnerType;
  /** 已保存内容的 ID，新建内容尚未保存时为空 */
  id?: string;
  /** 客户端生成的稳定关联键，用于将保存前的上传附件归属到当前编辑内容 */
  relationKey?: string;
}

export interface UploadedAttachment {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
  thumbnailUrl?: string;
}

export interface AttachmentLibraryItem extends UploadedAttachment {
  createdAt?: string;
  alt?: string;
  relationCount?: number;
}

export interface UploadAttachmentInput {
  file: File;
  owner?: AttachmentOwner;
  signal: AbortSignal;
  onProgress: (percentage: number) => void;
}

export type UploadAttachment = (
  input: UploadAttachmentInput,
) => Promise<UploadedAttachment>;

export interface AttachmentLibraryConfig {
  items: readonly AttachmentLibraryItem[];
  loading?: boolean;
  error?: string | null;
  onSearch?: (query: string) => void;
  onRefresh?: () => void;
}
