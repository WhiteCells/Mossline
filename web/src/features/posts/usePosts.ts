import { useAsyncResource } from '../../shared/hooks/useAsyncResource'
import type { ResourceState } from '../../shared/hooks/resource'
import { getPosts } from './posts'
import type { Post } from './types'

const loadPosts = (signal: AbortSignal) => getPosts({ signal })

/** 供首页、归档、分类和标签共用完整文章列表 */
export function usePosts(): ResourceState<Post[]> {
  return useAsyncResource(loadPosts)
}
