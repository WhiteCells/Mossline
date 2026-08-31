import { useCallback, useEffect, useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Icon } from './components/Icon'
import { SearchDialog } from './components/SearchDialog'
import { usePosts } from './hooks/usePosts'
import { useTheme } from './hooks/useTheme'
import { AboutPage } from './pages/AboutPage'
import { ArticlesPage } from './pages/ArticlesPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { FriendsPage } from './pages/FriendsPage'
import { HomePage } from './pages/HomePage'
import { MomentsPage } from './pages/MomentsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { TagsPage } from './pages/TagsPage'

function App() {
  const { theme, toggleTheme } = useTheme()
  const { posts, status, retry } = usePosts()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const [toast, setToast] = useState('')
  const searchQuery = new URLSearchParams(location.search).get('q') || ''

  const closeSearch = useCallback(() => setSearchOpen(false), [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  const showToast = () => {
    setToast('管理入口还在生长中，敬请期待。')
    window.setTimeout(() => setToast(''), 2600)
  }

  const search = (query) => {
    navigate(query ? `/articles?q=${encodeURIComponent(query)}` : '/articles')
  }

  return (
    <div className="app-shell">
      <Header theme={theme} onThemeToggle={toggleTheme} onSearch={() => setSearchOpen(true)} onLogin={showToast} />
      <main>
        <Routes>
          <Route path="/" element={<HomePage posts={posts} status={status} />} />
          <Route path="/articles" element={<ArticlesPage posts={posts} status={status} retry={retry} searchQuery={searchQuery} onClearSearch={() => navigate('/articles')} />} />
          <Route path="/categories" element={<CategoriesPage posts={posts} />} />
          <Route path="/tags" element={<TagsPage posts={posts} />} />
          <Route path="/moments" element={<MomentsPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      <SearchDialog open={searchOpen} posts={posts} initialQuery={searchQuery} onClose={closeSearch} onSearch={search} />
      <button className="floating-search" onClick={() => setSearchOpen(true)} aria-label="搜索文章"><Icon name="search" size={19} /></button>
      <div className={`toast ${toast ? 'is-visible' : ''}`} role="status"><Icon name="leaf" size={17} />{toast}</div>
    </div>
  )
}

export default App
