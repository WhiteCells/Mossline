import type { CSSProperties } from 'react'
import type { Theme } from '../../shared/hooks/useTheme'
import { useEffect, useLayoutEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Icon } from '../../shared/ui/Icon'

const navigation = [
  ['首页', '/', 'home'],
  ['文章', '/articles', 'file'],
  ['分类', '/categories', 'folder'],
  ['标签', '/tags', 'tag'],
  ['动态', '/moments', 'spark'],
  ['友链', '/friends', 'link'],
  ['关于', '/about', 'info'],
] as const

interface HeaderProps {
  theme: Theme
  onThemeToggle: () => void
  onSearch: () => void
}

export function Header({ theme, onThemeToggle, onSearch }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(() => window.scrollY > 24)

  useLayoutEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > 24)
    updateScrolled()
    window.addEventListener('scroll', updateScrolled, { passive: true })
    return () => window.removeEventListener('scroll', updateScrolled)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('menu-locked', menuOpen)
    return () => document.body.classList.remove('menu-locked')
  }, [menuOpen])

  return (
    <header
      className={`site-header${scrolled ? ' is-scrolled' : ''}${menuOpen ? ' is-menu-open' : ''}`}
    >
      <div className="header-inner">
        <Link className="brand" to="/" aria-label="返回首页">
          <span className="brand-mark">
            <Icon name="leaf" size={19} />
          </span>
          <span>Mossline</span>
        </Link>

        <nav className="desktop-nav" aria-label="主导航">
          {navigation.map(([label, path, icon]) => (
            <NavLink
              key={path}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'is-active' : ''}`
              }
              to={path}
              end={path === '/'}
            >
              <Icon name={icon} size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <button
            className="icon-button"
            onClick={onSearch}
            aria-label="搜索文章"
          >
            <Icon name="search" />
          </button>
          <button
            className="icon-button"
            onClick={onThemeToggle}
            aria-label={theme === 'light' ? '切换到深色主题' : '切换到浅色主题'}
          >
            <Icon name={theme === 'light' ? 'moon' : 'sun'} />
          </button>
          <a
            className="icon-button login-button"
            href="/admin/"
            aria-label="登录"
            title="登录"
          >
            <Icon name="user" />
          </a>
          <button
            className="icon-button menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? '关闭导航菜单' : '打开导航菜单'}
            aria-controls="mobile-navigation"
            aria-expanded={menuOpen}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </div>

      <div
        id="mobile-navigation"
        className={`mobile-menu ${menuOpen ? 'is-open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <nav aria-label="移动端导航">
          {navigation.map(([label, path], index) => (
            <NavLink
              key={path}
              className={({ isActive }) => (isActive ? 'is-active' : '')}
              style={{ '--delay': `${index * 35}ms` } as CSSProperties}
              to={path}
              end={path === '/'}
              onClick={() => setMenuOpen(false)}
            >
              <span>0{index + 1}</span>
              {label}
              <Icon name="arrow" size={17} />
            </NavLink>
          ))}
        </nav>
        <p>循着时间的纹理，收藏日常的微光。</p>
      </div>
    </header>
  )
}
