export type EntityId = string | number;
export type PublishStatus =
  "draft" | "published" | "scheduled" | "offline" | "disabled" | "active";

export interface UserSummary {
  id: EntityId;
  username?: string;
  nickname: string;
  email: string;
  avatar?: string;
  role: string;
  status: "active" | "disabled";
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: EntityId;
  name: string;
  slug?: string;
  parent_id?: EntityId | null;
  sort?: number;
  activate: boolean;
  post_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Tag {
  id: EntityId;
  name: string;
  slug?: string;
  activate: boolean;
  post_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Post {
  id: EntityId;
  title: string;
  slug: string;
  desc: string;
  cover?: string;
  status: PublishStatus;
  is_top: boolean;
  author?: UserSummary | string;
  category?: Category | string;
  tags: Array<Tag | string>;
  content?: string;
  content_type?: "markdown";
  seo_title?: string;
  seo_description?: string;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Moment {
  id: EntityId;
  content: string;
  status: PublishStatus;
  visibility: "public" | "private" | "unlisted";
  attachments?: Attachment[];
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FriendLink {
  id: EntityId;
  name: string;
  uri: string;
  logo?: string;
  desc?: string;
  group?: string;
  sort?: number;
  activate: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AttachmentReference {
  id: EntityId;
  type: "post" | "moment" | "user" | "friend" | "about" | string;
  title: string;
  url?: string;
}

export interface Attachment {
  id: EntityId;
  name: string;
  url: string;
  mime_type: string;
  size: number;
  uploader?: UserSummary | string;
  references?: AttachmentReference[];
  created_at?: string;
  updated_at?: string;
}

export interface AboutPage {
  id?: EntityId;
  content: string;
  status: PublishStatus;
  published_at?: string | null;
  updated_at?: string;
  version?: number;
}

export interface PaginationMeta {
  page: number;
  size: number;
  total: number;
  total_pages: number;
  has_more?: boolean;
}

export interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface DashboardStats {
  users: number;
  posts: number;
  categories: number;
  tags: number;
  moments: number;
  attachments: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recent_posts: Post[];
  recent_operations?: Array<{
    id: EntityId;
    action: string;
    operator?: string;
    created_at: string;
  }>;
  storage?: { used: number; total: number };
  system?: {
    api: "healthy" | "degraded" | "down";
    database?: string;
    cache?: string;
    uptime?: number;
  };
}

export interface ListQuery {
  page: number;
  size: number;
  search?: string;
  status?: string;
  sort?: string;
  order?: "asc" | "desc";
  [key: string]: string | number | boolean | undefined;
}

export const endpoints = {
  dashboard: "/api/dashboard",
  users: "/api/users",
  posts: "/api/post",
  categories: "/api/category",
  tags: "/api/tag",
  moments: "/api/moment",
  friends: "/api/friend",
  attachments: "/api/attachment",
  about: "/api/about",
} as const;
