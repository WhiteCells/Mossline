export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>
export interface RequestOptions {
  query?: QueryParams
  signal?: AbortSignal
}
export interface Pagination {
  page: number
  size: number
  total: number
  total_pages: number
}
export interface Page<T> {
  items: T[]
  pagination: Pagination
}
