export type EditorMode = "edit" | "split" | "preview";

export type AttachmentOwnerType = "article" | "moment" | "about";

export interface AttachmentOwner {
  type: AttachmentOwnerType;
  /** The persisted content id, when one already exists. */
  id?: string;
  /**
   * A stable client-generated key used to associate uploads made before a new
   * content item has been persisted.
   */
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
