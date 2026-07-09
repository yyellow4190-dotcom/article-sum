import { useEffect, useState } from 'react'
import Pending from './pages/Pending'
import Archive from './pages/Archive'
import Settings from './pages/Settings'
import Chat from './pages/Chat'
import { useApiKeys } from './hooks/useApiKeys'
import { useModels } from './hooks/useModels'

type Page = 'pending' | 'archive' | 'chat' | 'settings'
type IconName = 'folder' | 'search' | 'star' | 'profile' | 'menu' | 'link'

const NAV_ITEMS: { id: Page; label: string; icon: IconName }[] = [
  { id: 'pending', label: 'Category', icon: 'folder' },
  { id: 'archive', label: 'Search', icon: 'search' },
  { id: 'chat', label: 'Favorites', icon: 'star' },
  { id: 'settings', label: 'Profile', icon: 'profile' },
]

function Logo() {
  return (
    <div className="flex items-stretch gap-0 border-2 border-[#090806] bg-[#d9cfbc]">
      <div className="grid h-24 w-32 place-items-center bg-[#090806] text-[#e9dfcb]">
        <span className="font-poster text-[4.3rem] leading-none">CB</span>
      </div>
      <div className="flex min-w-64 flex-col justify-between border-l-2 border-[#090806] px-5 py-3">
        <div className="flex items-start justify-between gap-4 border-b-2 border-[#090806] pb-2">
          <span className="font-poster text-5xl leading-none text-[#090806]">2026</span>
          <span className="text-xs font-black uppercase leading-tight text-[#090806]">
            Link
            <br />
            Briefing
            <br />
            Desk
          </span>
        </div>
        <div className="flex items-end justify-between pt-2">
          <h1 className="font-poster text-4xl uppercase leading-none text-[#090806]">Clipbrief</h1>
          <span className="text-[10px] font-black uppercase text-[#090806]">Edition 01</span>
        </div>
      </div>
    </div>
  )
}

function Icon({ name }: { name: IconName }) {
  const common = {
    className: 'h-5 w-5',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
    viewBox: '0 0 24 24',
  }

  if (name === 'folder') {
    return (
      <svg {...common}>
        <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
      </svg>
    )
  }
  if (name === 'search') {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m16.5 16.5 4 4" />
      </svg>
    )
  }
  if (name === 'star') {
    return (
      <svg {...common}>
        <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.2l-5.6 3 1.1-6.2L3 9.6l6.2-.9z" />
      </svg>
    )
  }
  if (name === 'profile') {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    )
  }
  if (name === 'link') {
    return (
      <svg {...common}>
        <path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.2 1.2" />
        <path d="M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 0 0 7.1 7.1l1.2-1.2" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>('pending')
  const [chatTarget, setChatTarget] = useState<number | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [newsLink, setNewsLink] = useState('')
  const { keys } = useApiKeys()
  const { models } = useModels()

  // Electron 메인 프로세스는 클립보드 파이프라인에서 같은 API 키/모델을 쓴다.
  // 렌더러 localStorage 값이 바뀔 때마다 main으로 동기화.
  useEffect(() => {
    window.api?.syncSettings({ apiKeys: keys, models })
  }, [keys, models])

  function handleChatWithArticle(contentId: number) {
    setChatTarget(contentId)
    setPage('chat')
  }

  return (
    <div className="paper-grain h-screen bg-[#d9cfbc] text-[#090806] overflow-hidden">
      <div className="h-full flex">
        <aside
          className={`ui-copy shrink-0 border-r-2 border-[#090806] bg-[#090806] text-[#e9dfcb] transition-[width] duration-300 ${
            sidebarOpen ? 'w-64' : 'w-24'
          }`}
        >
          <div className="flex h-full flex-col items-center gap-4 px-4 py-5">
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              className={`flex h-16 items-center border-2 border-[#e9dfcb] bg-[#e9dfcb] text-[#090806] transition-all hover:bg-[#d9cfbc] ${
                sidebarOpen ? 'w-full justify-start gap-4 px-4' : 'w-16 justify-center'
              }`}
            >
              <Icon name="menu" />
              {sidebarOpen && <span className="font-poster text-2xl uppercase leading-none">Menu</span>}
            </button>

            <nav className="flex w-full flex-1 flex-col gap-4">
              {NAV_ITEMS.map((item) => {
                const isActive = page === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setPage(item.id)}
                    aria-label={item.label}
                    className={`flex h-16 items-center border-2 text-sm font-black uppercase transition-all ${
                      sidebarOpen ? 'w-full justify-start gap-4 px-4' : 'mx-auto w-16 justify-center'
                    } ${
                      isActive
                        ? 'border-[#e9dfcb] bg-[#e9dfcb] text-[#090806]'
                        : 'border-[#2b2821] bg-[#171510] text-[#d9cfbc] hover:border-[#e9dfcb] hover:text-[#e9dfcb]'
                    }`}
                  >
                    <Icon name={item.icon} />
                    {sidebarOpen && <span className="font-poster text-2xl leading-none">{item.label}</span>}
                  </button>
                )
              })}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-hidden bg-transparent">
          <div className="flex h-full flex-col">
            <header className="shrink-0 border-b-2 border-[#090806] px-5 py-4 sm:px-7">
              <div className="grid gap-5 xl:grid-cols-[auto_minmax(20rem,1fr)] xl:items-end">
                <Logo />
                <div className="ui-copy relative max-w-3xl xl:ml-auto xl:w-full">
                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#090806]">
                    <Icon name="link" />
                  </div>
                  <input
                    value={newsLink}
                    onChange={(e) => setNewsLink(e.target.value)}
                    placeholder="Paste a news link"
                    className="h-16 w-full border-2 border-[#090806] bg-[#e9dfcb] pl-12 pr-4 font-poster text-3xl uppercase leading-none text-[#090806] outline-none placeholder:text-[#090806]/55 focus:bg-[#f3ead8]"
                  />
                </div>
              </div>
            </header>

            <div className={`ui-copy min-h-0 flex-1 ${page === 'chat' ? '' : 'overflow-y-auto'}`}>
              {page === 'chat' ? (
                <Chat initialContentId={chatTarget} />
              ) : (
                <div className="grid min-h-full grid-cols-1 gap-6 px-5 py-6 sm:px-7 xl:grid-cols-[minmax(0,1fr)_21rem]">
                  <section className="min-w-0">
                    {page === 'pending' && <Pending />}
                    {page === 'archive' && <Archive onChatWithArticle={handleChatWithArticle} />}
                    {page === 'settings' && <Settings />}
                  </section>
                  <aside className="hidden xl:flex xl:flex-col xl:gap-4">
                    <div className="grid min-h-80 place-items-center border-2 border-[#090806] bg-[#e9dfcb] text-center font-poster text-5xl uppercase leading-none text-[#090806]">
                      Article
                      <br />
                      Image
                    </div>
                    <div className="border-2 border-[#090806] bg-[#d9cfbc] p-4">
                      <h2 className="font-poster text-4xl uppercase leading-none">Related Articles</h2>
                      <div className="mt-4 space-y-2 border-t-2 border-[#090806] pt-4">
                        <div className="h-1.5 w-full bg-[#090806]" />
                        <div className="h-1.5 w-4/5 bg-[#090806]" />
                        <div className="h-1.5 w-11/12 bg-[#090806]" />
                      </div>
                    </div>
                  </aside>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
