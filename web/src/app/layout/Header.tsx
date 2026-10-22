import type { CSSProperties } from 'react'
import type { Theme } from '../../shared/hooks/useTheme'
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Icon } from '../../shared/ui/Icon'

const navigation = [
  ['首页', '/'],
  ['文章', '/articles'],
  ['分类', '/categories'],
  ['标签', '/tags'],
  ['动态', '/moments'],
  ['友链', '/friends'],
  ['关于', '/about'],
] as const

interface HeaderProps {
  theme: Theme
  onThemeToggle: () => void
  onSearch: () => void
}

export function Header({ theme, onThemeToggle, onSearch }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('menu-locked', menuOpen)
    return () => document.body.classList.remove('menu-locked')
  }, [menuOpen])

  return (
    <header
      className={`site-header ${scrolled || menuOpen || location.pathname !== '/' ? 'is-scrolled' : ''}`}
    >
      <div className="header-inner">
        <Link className="brand" to="/" aria-label="返回首页">
          <span className="brand-mark">
            <Icon name="leaf" size={19} />
          </span>
          <span>Mossline</span>
        </Link>

        <nav className="desktop-nav" aria-label="主导航">
          {navigation.map(([label, path]) => (
            <NavLink
              key={path}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'is-active' : ''}`
              }
              to={path}
              end={path === '/'}
            >
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
          <a className="login-button" href="/admin/">
            <Icon name="user" size={17} />
            <span>登录</span>
          </a>
          <button
            className="icon-button menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="打开导航菜单"
            aria-expanded={menuOpen}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </div>

      <div
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
