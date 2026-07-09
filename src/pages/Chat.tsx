import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import type { ChatMessage, ChatSession, ChatSessionSummary, ContentRecord } from '../types/global'
import { cachedImageSrc } from '../utils/imageCache'

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="underline text-indigo-300 hover:text-indigo-200">
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
    <blockquote className="border-l-2 border-slate-500 pl-2 italic text-slate-300 mb-2 last:mb-0">{children}</blockquote>
  ),
  pre: ({ children }) => (
    <pre className="bg-black/30 rounded-lg p-2 overflow-x-auto text-xs font-mono mb-2 last:mb-0">{children}</pre>
  ),
  code: ({ className, children, ...rest }) => {
    const isInline = !className && !String(children).includes('\n')
    if (isInline) {
      return (
        <code className="bg-black/30 rounded px-1 py-0.5 text-xs font-mono" {...rest}>
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
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  const selectedIdRef = useRef(selectedId)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  function refreshSessionList() {
    window.api?.chatListSessions().then(setSessionSummaries)
  }

  function refresh() {
    window.api?.listApproved().then(setArticles)
    refreshSessionList()
    if (selectedIdRef.current != null) {
      window.api?.chatGetSession(selectedIdRef.current).then(setSession)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'F5') {
        e.preventDefault()
        refresh()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
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
    return (
      <div className="chat-workspace chat-preview has-chat">
        <aside className="chat-sessions">
          <div className="chat-side-title"><span>CONVERSATIONS</span><strong>Article briefs</strong></div>
          <button className="chat-session active"><i>01</i><div><b>The future of independent media</b><span>How will this change publishing?</span></div></button>
          <button className="chat-session"><i>02</i><div><b>Designing calmer technology</b><span>Summarize the key argument</span></div></button>
        </aside>
        <section className="chat-main">
          <header className="chat-header"><span>ARTICLE CONVERSATION</span><h2>Chatbot</h2></header>
          <div className="chat-messages">
            <div className="chat-message assistant">Ask me anything about this saved article.</div>
            <div className="chat-message user">What is the main idea?</div>
            <div className="chat-message assistant">The article argues that smaller, reader-supported publications can build stronger trust through focused reporting and direct relationships.</div>
          </div>
          <div className="chat-composer"><textarea placeholder="Ask a question about the article..." rows={1} /><button>Send</button></div>
        </section>
      </div>
    )
  }

  return (
    <div className={`h-full flex chat-workspace ${selectedArticle ? 'has-chat' : ''}`}>
      <aside className="w-[26%] max-w-xs min-w-[220px] border-r border-slate-800 bg-slate-900/50 flex flex-col overflow-y-auto chat-sessions">
        {sidebarIds.length === 0 && (
          <p className="text-slate-500 text-xs p-4">
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
              className={`relative flex items-center gap-1 border-b border-slate-800/60 transition-colors ${
                isActive ? 'bg-indigo-600/20' : 'hover:bg-slate-800/60'
              }`}
            >
              <button onClick={() => openSession(id)} className="flex items-center gap-3 p-3 text-left flex-1 min-w-0">
                {article.data.images?.[0] ? (
                  <img
                    src={cachedImageSrc(article.data.images[0])}
                    alt=""
                    className="h-10 w-10 object-cover rounded-lg flex-shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-slate-800 flex-shrink-0" />
                )}
                <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                  <span className="text-sm font-medium truncate">{article.data.title ?? article.data.category ?? 'Article'}</span>
                  <span className="text-xs text-slate-500 truncate">{summary?.lastMessage ?? article.url}</span>
                </div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenMenuId((prev) => (prev === id ? null : id))
                }}
                className="text-slate-500 hover:text-slate-200 px-2 py-1 text-sm flex-shrink-0 mr-1"
              >
                ⋯
              </button>
              {openMenuId === id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                  <div className="absolute right-2 top-10 z-20 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden">
                    <button
                      onClick={() => handleDeleteSession(id)}
                      className="block w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-slate-700 whitespace-nowrap"
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

      <section className="flex-1 flex flex-col min-w-0 chat-main">
        {selectedArticle ? (
          <>
            <header className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b-2 border-indigo-500/50 shadow-[0_4px_16px_-6px_rgba(99,102,241,0.4)] flex-wrap chat-header">
              <div className="flex flex-col min-w-0 gap-0.5">
                <span className="text-sm font-semibold text-slate-100 truncate chatbot-title">Chatbot</span>
                <a
                  href={selectedArticle.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-400 truncate hover:underline"
                >
                  {selectedArticle.url}
                </a>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 chat-messages">
              {displayMessages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                    m.role === 'user' ? 'self-end bg-indigo-600 text-white chat-message user' : 'self-start bg-slate-800 text-slate-100 chat-message assistant'
                  }`}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              ))}
              {sending && (
                <div className="self-start max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed bg-slate-800 text-slate-100 chat-message assistant">
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
                <p className="self-start text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="shrink-0 p-4 chat-composer-wrap">
              <div className="max-w-2xl mx-auto flex items-end gap-2 bg-slate-900 border border-slate-700 rounded-3xl px-4 py-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about the article..."
                  rows={1}
                  className="flex-1 bg-transparent resize-none max-h-32 py-1.5 text-sm focus:outline-none placeholder:text-slate-500"
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim() || sending}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    draft.trim() && !sending
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-slate-800 text-slate-600'
                  }`}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-slate-500 text-sm p-6">Select a conversation on the left.</p>
        )}
      </section>
    </div>
  )
}
