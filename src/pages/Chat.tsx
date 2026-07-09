import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import type { ChatMessage, ChatSession, ChatSessionSummary, ContentRecord } from '../types/global'
import type { Provider } from '../types'
import { PROVIDERS } from '../types'
import { usePipelineDefaults } from '../hooks/usePipelineDefaults'
import { cachedImageSrc } from '../utils/imageCache'

const inputClass =
  'bg-[#e9dfcb] border-2 border-[#090806] px-3 py-2 text-sm font-black uppercase text-[#090806] focus:outline-none'

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="underline text-[#090806] hover:text-black">
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  h1: ({ children }) => <p className="font-semibold text-base mb-1">{children}</p>,
  h2: ({ children }) => <p className="font-semibold text-base mb-1">{children}</p>,
  h3: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#090806] pl-2 italic text-[#090806] mb-2 last:mb-0">{children}</blockquote>
  ),
  pre: ({ children }) => (
    <pre className="bg-[#d9cfbc] border border-[#090806] p-2 overflow-x-auto text-xs font-mono mb-2 last:mb-0">{children}</pre>
  ),
  code: ({ className, children, ...rest }) => {
    const isInline = !className && !String(children).includes('\n')
    if (isInline) {
      return (
        <code className="bg-[#d9cfbc] border border-[#090806] px-1 py-0.5 text-xs font-mono" {...rest}>
          {children}
        </code>
      )
    }
    return (
      <code className={className} {...rest}>
        {children}
      </code>
    )
  },
}

export default function Chat({ initialContentId }: { initialContentId: number | null }) {
  const [articles, setArticles] = useState<ContentRecord[] | null>(null)
  const [sessionSummaries, setSessionSummaries] = useState<ChatSessionSummary[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [session, setSession] = useState<ChatSession | null>(null)
  const [optimistic, setOptimistic] = useState<ChatMessage[]>([])
  const [streamingText, setStreamingText] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<Provider>('claude')
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const { defaults } = usePipelineDefaults()

  const selectedIdRef = useRef(selectedId)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  function refreshSessionList() {
    window.api?.chatListSessions().then(setSessionSummaries)
  }

  useEffect(() => {
    window.api?.listApproved().then(setArticles)
    refreshSessionList()
  }, [])

  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  useEffect(() => {
    return window.api?.onChatEvent((event) => {
      if (event.contentId !== selectedIdRef.current) return
      if (event.type === 'chunk') {
        setStreamingText((prev) => prev + (event.chunk ?? ''))
      } else if (event.type === 'done') {
        setStreamingText('')
        setSending(false)
        setOptimistic([])
        window.api?.chatGetSession(event.contentId).then(setSession)
        refreshSessionList()
      } else if (event.type === 'error') {
        setStreamingText('')
        setSending(false)
        setOptimistic([])
        setError(event.error ?? 'Unknown error')
        window.api?.chatGetSession(event.contentId).then(setSession)
      }
    })
  }, [])

  function openSession(id: number) {
    setSelectedId(id)
    setOptimistic([])
    setStreamingText('')
    setError(null)
    setDraft('')
    window.api?.chatGetSession(id).then(setSession)
  }

  useEffect(() => {
    if (initialContentId != null) openSession(initialContentId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContentId])

  useEffect(() => {
    setProvider(session?.provider ?? defaults?.defaultProvider ?? 'claude')
  }, [session, defaults])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [session, optimistic, streamingText])

  const articleMap = useMemo(() => new Map((articles ?? []).map((a) => [a.id, a])), [articles])
  const summaryMap = useMemo(() => new Map(sessionSummaries.map((s) => [s.contentId, s])), [sessionSummaries])

  const sidebarIds = useMemo(() => {
    const ids = new Set(summaryMap.keys())
    if (selectedId != null) ids.add(selectedId)
    return [...ids]
      .filter((id) => articleMap.has(id))
      .sort((a, b) => {
        const ta = summaryMap.get(a)?.updatedAt
        const tb = summaryMap.get(b)?.updatedAt
        if (!ta && !tb) return 0
        if (!ta) return -1
        if (!tb) return 1
        return tb.localeCompare(ta)
      })
  }, [summaryMap, selectedId, articleMap])

  const selectedArticle = selectedId != null ? articleMap.get(selectedId) : undefined
  const displayMessages = [...(session?.messages ?? []), ...optimistic]

  async function handleSend() {
    const text = draft.trim()
    if (!text || sending || selectedId == null || !selectedArticle) return
    setOptimistic((prev) => [...prev, { role: 'user', content: text, createdAt: new Date().toISOString() }])
    setDraft('')
    setSending(true)
    setStreamingText('')
    setError(null)
    try {
      await window.api?.chatSend(selectedId, {
        text,
        provider,
        articleText: selectedArticle.data.original ?? '',
      })
    } catch (e) {
      setSending(false)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function handleDeleteSession(id: number) {
    setOpenMenuId(null)
    if (!window.confirm('Delete this conversation?')) return
    await window.api?.chatDeleteSession(id)
    refreshSessionList()
    if (selectedId === id) {
      setSelectedId(null)
      setSession(null)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!window.api) {
    return <p className="border-2 border-[#090806] bg-[#d9cfbc] p-4 font-poster text-3xl uppercase leading-none text-[#090806]">This feature is only available in the Electron app.</p>
  }

  return (
    <div className="h-full flex">
      <aside className="w-[28%] max-w-xs min-w-[220px] border-r-2 border-[#090806] bg-[#c8bca9] flex flex-col overflow-y-auto">
        {sidebarIds.length === 0 && (
          <p className="p-4 text-xs font-black uppercase text-[#090806]">
            Start a chat by clicking "Chat with this article" in Archive.
          </p>
        )}
        {sidebarIds.map((id) => {
          const article = articleMap.get(id)!
          const summary = summaryMap.get(id)
          const isActive = id === selectedId
          return (
            <div
              key={id}
              className={`relative flex items-center gap-1 border-b-2 border-[#090806] transition-colors ${
                isActive ? 'bg-[#e9dfcb]' : 'hover:bg-[#d9cfbc]'
              }`}
            >
              <button onClick={() => openSession(id)} className="flex items-center gap-3 p-3 text-left flex-1 min-w-0">
                {article.data.thumbnail ? (
                  <img
                    src={cachedImageSrc(article.data.thumbnail)}
                    alt=""
                    className="h-10 w-10 object-cover flex-shrink-0 border border-[#090806]"
                  />
                ) : (
                  <div className="h-10 w-10 border border-[#090806] bg-[#bfb5a6] flex-shrink-0" />
                )}
                <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                  <span className="text-sm font-medium truncate">{article.data.title ?? article.data.category ?? 'Article'}</span>
                  <span className="truncate text-xs font-bold text-[#090806]">{summary?.lastMessage ?? article.url}</span>
                </div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenMenuId((prev) => (prev === id ? null : id))
                }}
                className="mr-1 flex-shrink-0 px-2 py-1 text-sm font-black text-[#090806] hover:bg-[#090806] hover:text-[#e9dfcb]"
              >
                ⋯
              </button>
              {openMenuId === id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                  <div className="absolute right-2 top-10 z-20 overflow-hidden border-2 border-[#090806] bg-[#e9dfcb] shadow-[6px_6px_0_#090806]">
                    <button
                      onClick={() => handleDeleteSession(id)}
                      className="block w-full text-left px-3 py-2 text-xs text-red-700 hover:bg-red-50 whitespace-nowrap"
                    >
                      Delete conversation
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </aside>

      <section className="flex-1 flex flex-col min-w-0">
        {selectedArticle ? (
          <>
            <header className="shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-b-2 border-[#090806] flex-wrap">
              <div className="flex flex-col min-w-0 gap-0.5">
                {selectedArticle.data.title && (
                  <span className="truncate font-poster text-3xl uppercase leading-none text-[#090806]">{selectedArticle.data.title}</span>
                )}
                <a
                  href={selectedArticle.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-black uppercase text-[#090806] truncate hover:underline"
                >
                  {selectedArticle.url}
                </a>
              </div>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as Provider)}
                className={inputClass}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </header>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              {displayMessages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[75%] px-4 py-2 text-sm font-bold leading-relaxed ${
                    m.role === 'user' ? 'self-end bg-[#090806] text-[#e9dfcb]' : 'self-start border-2 border-[#090806] bg-[#d9cfbc] text-[#090806]'
                  }`}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              ))}
              {sending && (
                <div className="self-start max-w-[75%] border-2 border-[#090806] bg-[#d9cfbc] px-4 py-2 text-sm leading-relaxed text-[#090806]">
                  {streamingText ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
                      {streamingText}
                    </ReactMarkdown>
                  ) : (
                    '...'
                  )}
                </div>
              )}
              {error && (
                <p className="self-start border-2 border-red-700 bg-red-50 px-3 py-2 text-xs font-black uppercase text-red-700">
                  {error}
                </p>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="shrink-0 p-4">
              <div className="mx-auto flex max-w-2xl items-end gap-2 border-2 border-[#090806] bg-[#e9dfcb] px-4 py-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about the article..."
                  rows={1}
                  className="max-h-32 flex-1 resize-none bg-transparent py-1.5 text-sm font-bold focus:outline-none placeholder:text-[#090806]/55"
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim() || sending}
                  className={`shrink-0 px-4 py-1.5 text-sm font-black uppercase transition-colors ${
                    draft.trim() && !sending
                      ? 'bg-[#090806] hover:bg-black text-[#e9dfcb]'
                      : 'border-2 border-[#090806] text-[#090806]/45'
                  }`}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="p-6 font-poster text-3xl uppercase leading-none text-[#090806]">Select a conversation on the left.</p>
        )}
      </section>
    </div>
  )
}
