import { useCallback, useEffect, useState } from 'react'
import { getPosts } from '../services/posts'

export function usePosts() {
  const [state, setState] = useState({ status: 'loading', posts: [], error: null })

  const load = useCallback(async (signal) => {
    setState((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const nextPosts = await getPosts({ signal })
      setState({ status: 'success', posts: nextPosts, error: null })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setState({ status: 'error', posts: [], error })
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  return { ...state, retry: () => load() }
}
