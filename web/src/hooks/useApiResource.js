import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../services/api'

export function useApiResource(path, options = {}) {
  const [state, setState] = useState({ status: 'loading', data: options.initialData ?? null, error: null })
  const load = useCallback(async (signal) => {
    setState((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const data = await apiGet(path, { query: options.query, signal })
      setState({ status: 'success', data, error: null })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setState({ status: 'error', data: options.initialData ?? null, error })
    }
  }, [options.initialData, options.query, path])
  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort() }, [load])
  return { ...state, retry: () => load() }
}
