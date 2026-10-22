export type EntityId = string | number;

export type ApiCode = string | number;

export interface ApiEnvelope<T> {
  code: ApiCode;
  data: T;
  msg: string;
}

export type FieldErrors = Record<string, string[]>;

export interface Pagination {
  page: number;
  size: number;
  total: number;
  total_pages: number;
  has_more: boolean;
}

export interface PaginatedData<T> {
  pagination: Pagination;
  items: T[];
}

export type QueryPrimitive = string | number | boolean | null | undefined;

export type QueryValue = QueryPrimitive | readonly QueryPrimitive[];

export type QueryParams = Readonly<Record<string, QueryValue>>;

export interface RequestOptions {
  query?: QueryParams;
  signal?: AbortSignal;
  headers?: HeadersInit;
}

export interface BodyRequestOptions extends Omit<RequestOptions, "query"> {
  query?: QueryParams;
}

export interface DeleteRequestOptions<B = unknown> extends RequestOptions {
  body?: B;
}

export interface UploadProgress {
  loaded: number;
  total: number | null;
  percent: number | null;
}

export type UploadMetadataValue = string | number | boolean | Blob;

export interface UploadOptions extends Omit<RequestOptions, "query"> {
  fieldName?: string;
  fileName?: string;
  metadata?: Readonly<Record<string, UploadMetadataValue>>;
  onProgress?: (progress: UploadProgress) => void;
}

export type UserStatus = "active" | "disabled" | "pending";

export interface AuthUser {
  id: EntityId;
  username?: string;
  name?: string;
  nickname?: string;
  email?: string;
  avatar?: string | null;
  role?: string;
  roles?: string[];
  permissions?: string[];
  status?: UserStatus;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user?: AuthUser;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: (signal?: AbortSignal) => Promise<AuthUser>;
}
