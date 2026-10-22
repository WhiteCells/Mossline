import type { FormEvent } from 'react'
import type { Post } from './types'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../shared/ui/Icon'

interface SearchDialogProps {
  open: boolean
  posts: Post[]
  initialQuery: string
  onClose: () => void
  onSearch: (query: string) => void
}

export function SearchDialog({
  open,
  posts,
  initialQuery,
  onClose,
  onSearch,
}: SearchDialogProps) {
  const [value, setValue] = useState(initialQuery)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return undefined
    setValue(initialQuery)
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 30)
    const onKeyDown = (event: KeyboardEvent) =>
      event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKeyDown)
    document.body.classList.add('menu-locked')
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('menu-locked')
    }
  }, [initialQuery, onClose, open])

  if (!open) return null

  const suggestions = value.trim()
    ? posts
        .filter((post) =>
          [post.title, post.category, ...post.tags]
            .join(' ')
            .toLowerCase()
            .includes(value.trim().toLowerCase()),
        )
        .slice(0, 3)
    : posts.slice(0, 3)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearch(value.trim())
    onClose()
  }

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="search-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-title"
      >
        <div className="dialog-topline">
          <span>SEARCH THE JOURNAL</span>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="关闭搜索"
          >
            <Icon name="close" />
          </button>
        </div>
        <h2 id="search-title">寻找一段时光</h2>
        <form onSubmit={submit}>
          <Icon name="search" size={23} />
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="输入文章、分类或标签…"
            aria-label="搜索关键词"
          />
          {value && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setValue('')}
              aria-label="清空输入"
            >
              <Icon name="close" size={17} />
            </button>
          )}
          <button className="search-submit" type="submit">
            搜索
          </button>
        </form>
        <div className="search-suggestions">
          <div className="suggestion-title">
            <span>{value ? '匹配的故事' : '最近被阅读'}</span>
            <small>{suggestions.length} STORIES</small>
          </div>
          {suggestions.length ? (
            suggestions.map((post) => (
              <button
                key={post.id}
                onClick={() => {
                  onSearch(post.title)
                  onClose()
                }}
              >
                <span>{post.id}</span>
                <div>
                  <strong>{post.title}</strong>
                  <small>
                    {post.category} · {post.reading_time} 分钟阅读
                  </small>
                </div>
                <Icon name="arrow" size={17} />
              </button>
            ))
          ) : (
            <p className="no-suggestion">
              没有找到相关故事，试试“旅行”或“日常”。
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
