/** 状态与数据保持对应，成功时一定有数据，失败时一定有错误 */
export type AsyncState<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: null; error: Error }

export type ResourceState<T> = AsyncState<T> & { retry: () => void }
