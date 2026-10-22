import { useCallback, useEffect, useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Footer } from './layout/Footer'
import { Header } from './layout/Header'
import { Icon } from '../shared/ui/Icon'
import { SearchDialog } from '../features/posts/SearchDialog'
import { usePosts } from '../features/posts/usePosts'
import { useTheme } from '../shared/hooks/useTheme'
import { AboutPage } from '../features/about/AboutPage'
import { ArticleDetailPage } from '../features/posts/ArticleDetailPage'
import { ArticlesPage } from '../features/posts/ArticlesPage'
import { CategoriesPage } from '../features/categories/CategoriesPage'
import { FriendsPage } from '../features/friends/FriendsPage'
import { HomePage } from '../features/home/HomePage'
import { MomentsPage } from '../features/moments/MomentsPage'
import { NotFoundPage } from '../features/not-found/NotFoundPage'
import { TagsPage } from '../features/tags/TagsPage'

function App() {
  const { theme, toggleTheme } = useTheme()
  const resource = usePosts()
  const posts = resource.data ?? []
  const location = useLocation()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const searchQuery = new URLSearchParams(location.search).get('q') || ''

  const closeSearch = useCallback(() => setSearchOpen(false), [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  const search = (query: string) => {
    navigate(query ? `/articles?q=${encodeURIComponent(query)}` : '/articles')
  }

  return (
    <div className="app-shell">
      <Header
        theme={theme}
        onThemeToggle={toggleTheme}
        onSearch={() => setSearchOpen(true)}
      />
      <main>
        <Routes>
          <Route path="/" element={<HomePage resource={resource} />} />
          <Route
            path="/articles"
            element={
              <ArticlesPage
                resource={resource}
                searchQuery={searchQuery}
                onClearSearch={() => navigate('/articles')}
              />
            }
          />
          <Route path="/articles/:slug" element={<ArticleDetailPage />} />
          <Route
            path="/categories"
            element={<CategoriesPage resource={resource} />}
          />
          <Route path="/tags" element={<TagsPage resource={resource} />} />
          <Route path="/moments" element={<MomentsPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      <SearchDialog
        open={searchOpen}
        posts={posts}
        initialQuery={searchQuery}
        onClose={closeSearch}
        onSearch={search}
      />
      <button
        className="floating-search"
        onClick={() => setSearchOpen(true)}
        aria-label="搜索文章"
      >
        <Icon name="search" size={19} />
      </button>
    </div>
  )
}

export default App
