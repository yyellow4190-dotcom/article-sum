import { useState, type FormEvent, type ReactNode } from 'react'
import Pending from './pages/Pending'
import Archive from './pages/Archive'
import ArchiveDetail from './pages/ArchiveDetail'
import Settings from './pages/Settings'
import Chat from './pages/Chat'
import Login from './pages/Login'
import { useAuth } from './hooks/useAuth'
import type { ContentRecord } from './types/global'

type Page = 'pending' | 'archive' | 'archive-detail' | 'favorites' | 'chat' | 'settings'

function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    folder: <><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></>,
    star: <><path d="m12 3 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 17.03l-5.5 2.89 1.05-6.12L3.1 9.47l6.15-.9z" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
    arrow: <><path d="M5 12h14m-5-5 5 5-5 5" /></>,
    chat: <><path d="M20 15a3 3 0 0 1-3 3H9l-5 3v-6a3 3 0 0 1-1-2.24V7a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3z" /><path d="M8 10h.01M12 10h.01M16 10h.01" /></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function Brand() {
  return (
    <div className="brand" aria-label="Clipbrief">
      <span>Clipbrief</span>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>('pending')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [urlState, setUrlState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [chatTarget, setChatTarget] = useState<number | null>(null)
  const [archiveDetail, setArchiveDetail] = useState<ContentRecord | null>(null)
  const { user, loading, signOut } = useAuth()

  const navItems: { id: Page; label: string; icon: string }[] = [
    { id: 'archive', label: 'Categories', icon: 'folder' },
    { id: 'pending', label: 'Search', icon: 'search' },
    { id: 'favorites', label: 'Favorites', icon: 'star' },
    { id: 'settings', label: 'Profile', icon: 'user' },
  ]

  function goTo(next: Page) {
    setPage(next)
    if (window.innerWidth < 760) setSidebarOpen(false)
  }

  async function submitUrl(e: FormEvent) {
    e.preventDefault()
    const value = url.trim()
    if (!/^https?:\/\/\S+$/i.test(value)) {
      setUrlState('error')
      return
    }
    setUrlState('submitting')
    try {
      await window.api?.processUrl(value)
      setUrl('')
      setUrlState('done')
      setPage('pending')
    } catch {
      setUrlState('error')
    }
  }

  function handleChatWithArticle(contentId: number) {
    setChatTarget(contentId)
    setPage('chat')
  }

  if (loading) return null

  return (
    <div className={`clipbrief-app ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <aside className="app-sidebar">
        <button className="sidebar-toggle" onClick={() => setSidebarOpen((open) => !open)} aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}>
          <Icon name={sidebarOpen ? 'close' : 'menu'} />
        </button>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button key={item.id} className={`nav-item ${page === item.id || (item.id === 'archive' && page === 'archive-detail') ? 'active' : ''}`} onClick={() => goTo(item.id)}>
              <span className="nav-icon"><Icon name={item.icon} /></span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="app-main">
        <header className="topbar">
          <button className="brand-button" onClick={() => goTo('pending')}><Brand /></button>
          {user && <button className="signout" onClick={signOut}>Sign out</button>}
        </header>

        {!user && window.api && page !== 'settings' ? (
          <Login />
        ) : page === 'chat' ? (
          <div className="page-body chat-body"><Chat initialContentId={chatTarget} /></div>
        ) : (
          <>
            {page === 'pending' && (
              <section className="brief-home">
                <form className="brief-search" onSubmit={submitUrl}>
                  <Icon name="search" size={22} />
                  <input value={url} onChange={(e) => { setUrl(e.target.value); setUrlState('idle') }} placeholder="Paste a news article URL" aria-label="News article URL" />
                  <button type="submit" disabled={urlState === 'submitting'}>Create brief <Icon name="arrow" size={18} /></button>
                </form>
                {urlState === 'error' && <p className="form-note error">Enter a valid URL beginning with http:// or https://</p>}
                {urlState === 'done' && <p className="form-note">Your article is being prepared below.</p>}

                <div className="brief-grid">
                  <section className="brief-summary">
                    <div className="brief-label">SUMMARY</div>
                    <Pending />
                  </section>
                  <section className="brief-article">
                    <div className="brief-label light">ARTICLE</div>
                    <p>Paste a link above to create a focused summary and save the full article to your library.</p>
                  </section>
                  <aside className="brief-image">
                    <Icon name="folder" size={28} />
                    <span>ARTICLE IMAGE</span>
                  </aside>
                  <section className="brief-recommendations">
                    <h2>Category recommendations</h2>
                    <div className="recommendation-columns">
                      <div><i /><i /><i /><i /></div>
                      <div><i /><i /><i /><i /></div>
                    </div>
                  </section>
                </div>
              </section>
            )}
            {page !== 'pending' && <div className={`page-body ${page === 'archive' || page === 'favorites' ? 'category-page-body' : ''}`}>
              {(page === 'archive' || page === 'favorites') && (
                <>
                  <Archive
                    variant={page === 'favorites' ? 'favorites' : 'library'}
                    onChatWithArticle={handleChatWithArticle}
                    onOpenArticle={(record) => { setArchiveDetail(record); setPage('archive-detail') }}
                  />
                </>
              )}
              {page === 'archive-detail' && archiveDetail && (
                <ArchiveDetail
                  record={archiveDetail}
                  onBack={() => setPage('archive')}
                  onChatWithArticle={handleChatWithArticle}
                  onOpenArticle={(record) => setArchiveDetail(record)}
                />
              )}
              {page === 'settings' && <Settings />}
            </div>}
          </>
        )}
      </main>

      {(user || !window.api) && page !== 'chat' && <button className="chat-fab" onClick={() => setPage('chat')} aria-label="Open chatbot"><Icon name="chat" size={25} /></button>}
    </div>
  )
}
