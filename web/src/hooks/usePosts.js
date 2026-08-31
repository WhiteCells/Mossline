import { useCallback, useEffect, useState } from 'react'
import { getPosts } from '../services/posts'

export function usePosts() {
  const [state, setState] = useState({ status: 'loading', posts: [], error: null })

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const nextPosts = await getPosts()
      setState({ status: 'success', posts: nextPosts, error: null })
    } catch (error) {
      setState({ status: 'error', posts: [], error })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, retry: load }
}
