import type { ReactNode } from 'react'
import type { AsyncState as ResourceStatus } from '../hooks/resource'
import { Icon } from './Icon'

interface AsyncStateProps {
  status: ResourceStatus<unknown>['status']
  error?: Error | null
  empty?: boolean
  onRetry?: () => void
  children: ReactNode
}

export function AsyncState({
  status,
  error,
  empty = false,
  onRetry,
  children,
}: AsyncStateProps) {
  if (status === 'loading')
    return (
      <div className="state-panel home-loading">
        <span className="loading-leaf">
          <Icon name="leaf" />
        </span>
        <p>正在读取内容…</p>
      </div>
    )
  if (status === 'error')
    return (
      <div className="state-panel error-panel">
        <span className="state-icon">!</span>
        <h3>内容暂时无法抵达</h3>
        <p>{error?.message || '请稍后重试。'}</p>
        {onRetry && (
          <button className="primary-button" onClick={onRetry}>
            重新加载 <Icon name="arrow" size={17} />
          </button>
        )}
      </div>
    )
  if (empty)
    return (
      <div className="state-panel empty-panel">
        <div className="empty-illustration">
          <span />
          <i />
        </div>
        <h3>这里还没有留下痕迹</h3>
        <p>新的内容正在慢慢生长。</p>
      </div>
    )
  return children
}
