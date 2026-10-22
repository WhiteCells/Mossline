import { useEffect, useState } from 'react'
export type Theme = 'light' | 'dark'
/** 优先恢复已保存主题，没有设置时跟随系统配色偏好 */
function getInitialTheme(): Theme {
  const saved = window.localStorage.getItem('mossline-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}
/** 管理主题并同步根节点、浏览器主题色和本地存储 */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('mossline-theme', theme)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#171519' : '#f8f4f2')
  }, [theme])
  return {
    theme,
    toggleTheme: () =>
      setTheme((current) => (current === 'light' ? 'dark' : 'light')),
  }
}
