import type { ReactNode } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Routes, useLocation, useNavigationType } from 'react-router-dom'

interface PageTransitionProps {
  children: ReactNode
}

/** 集中处理路由过渡、回顶和历史位置，页内筛选不触发整页动画。 */
export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const [displayedLocation, setDisplayedLocation] = useState(location)
  const displayedLocationRef = useRef(displayedLocation)
  const mainRef = useRef<HTMLElement>(null)
  const positions = useRef(new Map<string, number>())
  const previousPath = useRef(location.pathname)
  const initialized = useRef(false)

  useEffect(() => {
    if (navigationType !== 'POP' || location.key !== displayedLocation.key)
      return
    const target = positions.current.get(displayedLocation.key)
    if (target === undefined || Math.abs(window.scrollY - target) < 2) return

    // 详情等异步内容未撑开页面时，等待内容加载后再恢复阅读位置。
    const stop = () => {
      observer.disconnect()
      window.clearTimeout(timeout)
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
      window.removeEventListener('keydown', stop)
    }
    const observer = new ResizeObserver(() => {
      window.scrollTo({ top: target, behavior: 'instant' })
      if (Math.abs(window.scrollY - target) < 2) stop()
    })
    const timeout = window.setTimeout(stop, 2000)
    observer.observe(document.body)
    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('touchstart', stop, { passive: true })
    window.addEventListener('keydown', stop)
    return stop
  }, [displayedLocation, navigationType, location.key])

  useLayoutEffect(() => {
    displayedLocationRef.current = displayedLocation
  }, [displayedLocation])

  useEffect(() => {
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = previous
    }
  }, [])

  useEffect(() => {
    const displayed = displayedLocationRef.current
    if (location === displayed) return

    positions.current.set(displayed.key, window.scrollY)
    // 限制历史缓存，避免长时间浏览时持续增长。
    if (positions.current.size > 100) {
      const oldest = positions.current.keys().next().value
      if (oldest !== undefined) positions.current.delete(oldest)
    }

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (location.pathname === displayed.pathname || reducedMotion) {
      setDisplayedLocation(location)
      return
    }

    let cancelled = false
    const update = () => {
      if (!cancelled) flushSync(() => setDisplayedLocation(location))
    }

    if (document.startViewTransition) {
      const transition = document.startViewTransition(update)
      // 快速连续跳转可能跳过截图，路由更新仍由最新一次导航完成。
      void transition.ready.catch(() => {})
      return () => {
        cancelled = true
        transition.skipTransition()
      }
    }

    // 未支持 View Transitions 的浏览器使用同样时长的淡出、淡入。
    const animation = mainRef.current?.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 100, easing: 'ease-out', fill: 'forwards' },
    )
    if (animation) {
      void animation.finished
        .then(() => {
          animation.cancel()
          update()
        })
        .catch(() => {})
    } else {
      setDisplayedLocation(location)
    }
    return () => {
      cancelled = true
      animation?.cancel()
    }
  }, [location])

  useLayoutEffect(() => {
    const changedPath = previousPath.current !== displayedLocation.pathname
    previousPath.current = displayedLocation.pathname
    if (!initialized.current) {
      initialized.current = true
      return
    }
    if (!changedPath) return

    const savedPosition = positions.current.get(displayedLocation.key)
    let anchor: HTMLElement | null = null
    if (displayedLocation.hash) {
      try {
        anchor = document.getElementById(
          decodeURIComponent(displayedLocation.hash.slice(1)),
        )
      } catch {
        // 非法编码的锚点按普通页面跳转处理。
      }
    }
    if (navigationType === 'POP' && savedPosition !== undefined) {
      window.scrollTo({ top: savedPosition, behavior: 'instant' })
    } else if (anchor) {
      anchor.scrollIntoView({ behavior: 'instant' })
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }

    if (
      !document.startViewTransition &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      const animation = mainRef.current?.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 200, easing: 'ease-out' },
      )
      return () => animation?.cancel()
    }
  }, [displayedLocation, navigationType])

  return (
    <main ref={mainRef} className="page-content">
      <Routes key={displayedLocation.pathname} location={displayedLocation}>
        {children}
      </Routes>
    </main>
  )
}
