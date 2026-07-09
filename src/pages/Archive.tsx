import { useEffect, useMemo, useState } from 'react'
import type { ContentRecord } from '../types/global'
import { cachedImageSrc } from '../utils/imageCache'
import { usePipelineDefaults } from '../hooks/usePipelineDefaults'

const cardClass = 'bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-3'
const inputClass =
  'bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

export default function Archive({
  onChatWithArticle,
  onOpenArticle,
  variant = 'library',
}: {
  onChatWithArticle: (id: number) => void
  onOpenArticle: (record: ContentRecord) => void
  variant?: 'library' | 'favorites'
}) {
  const [records, setRecords] = useState<ContentRecord[] | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set())
  const [folderFilter, setFolderFilter] = useState<string | null>(null)
  const [fullTextRecord, setFullTextRecord] = useState<ContentRecord | null>(null)
  const { defaults } = usePipelineDefaults()

  function refresh() {
    window.api?.listApproved().then(setRecords)
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

  function toggleCategoryFilter(category: string) {
    setCategoryFilter((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const r of records ?? []) {
      if (r.data.category) set.add(r.data.category)
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [records])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (records ?? []).filter((r) => {
      if (categoryFilter.size > 0 && !(r.data.category && categoryFilter.has(r.data.category))) return false
      if (folderFilter !== null && r.data.folder !== folderFilter) return false
      if (!query) return true
      const summary = r.data.summaries ? Object.values(r.data.summaries)[0] : undefined
      return r.url.toLowerCase().includes(query) || (summary?.toLowerCase().includes(query) ?? false)
    })
  }, [records, search, categoryFilter, folderFilter])

  if (!window.api) {
    if (variant === 'favorites') {
      return (
        <div className="favorites-showcase favorites-preview">
          <article className="favorite-feature">
            <div className="favorite-art" />
            <div className="favorite-copy"><span>FEATURED</span><h3>Your favorite articles</h3><p>Saved stories will appear here with their key summaries.</p></div>
          </article>
          <div className="favorite-grid">
            <article><div className="favorite-thumb" /><span>RECENTLY SAVED</span><h3>Article title</h3><p>A short summary of the saved article appears here.</p></article>
            <article><div className="favorite-thumb" /><span>RECENTLY SAVED</span><h3>Article title</h3><p>A short summary of the saved article appears here.</p></article>
          </div>
        </div>
      )
    }
    return (
      <div className="category-dashboard category-preview">
        <section className="category-section">
          <header><h3>All categories</h3></header>
          <div className="category-folder-grid category-all-grid">
            {['AI & Technology', 'Business', 'Culture', 'Science', 'Design', 'World'].map((category, index) => (
              <article className="category-folder" key={category}>
                <button>•••</button><h3>{category}</h3><small>{12 + index * 4} saved articles</small>
                <p className="category-latest"><span>LATEST</span>{['AI reshapes everyday work', 'Markets enter a new chapter', 'The culture of small teams'][index % 3]}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    )
  }

  if (records === null) {
    return <p className="text-slate-500 text-sm">Loading...</p>
  }

  if (variant === 'favorites') {
    const [featured, ...rest] = filtered
    const summaryFor = (record: ContentRecord) =>
      record.data.summaries ? Object.values(record.data.summaries)[0] : undefined

    if (!featured) return <p className="text-slate-500 text-sm">No favorite articles yet.</p>

    return (
      <div className="favorites-showcase">
        <article className="favorite-feature" onClick={() => onOpenArticle(featured)}>
          {featured.data.images?.[0] ? <img src={cachedImageSrc(featured.data.images[0])} alt="" /> : <div className="favorite-art" />}
          <div className="favorite-copy">
            <span>{featured.data.category ?? 'FEATURED'}</span>
            <h3>{featured.data.title ?? 'Saved article'}</h3>
            <p>{summaryFor(featured) ?? featured.url}</p>
          </div>
        </article>
        <div className="favorite-grid">
          {rest.slice(0, 2).map((record) => (
            <article key={record.id} onClick={() => onOpenArticle(record)}>
              {record.data.images?.[0] ? <img className="favorite-thumb" src={cachedImageSrc(record.data.images[0])} alt="" /> : <div className="favorite-thumb" />}
              <span>RECENTLY SAVED</span>
              <h3>{record.data.title ?? 'Saved article'}</h3>
              <p>{summaryFor(record) ?? record.url}</p>
            </article>
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'library') {
    const categoryGroups = new Map<string, ContentRecord[]>()
    for (const record of filtered) {
      const category = record.data.category ?? 'Uncategorized'
      if (!categoryGroups.has(category)) categoryGroups.set(category, [])
      categoryGroups.get(category)!.push(record)
    }

    return (
      <div className="category-dashboard">
        <section className="category-section">
          <header><h3>All categories</h3></header>
          <div className="category-folder-grid category-all-grid">
            {[...categoryGroups.entries()].map(([category, articles]) => (
              <article className="category-folder" key={category} onClick={() => onOpenArticle(articles[0])}>
                <button onClick={(event) => event.stopPropagation()}>•••</button><h3>{category}</h3><small>{articles.length} saved articles</small>
                <p className="category-latest"><span>LATEST</span>{articles[0].data.title ?? 'Saved article'}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    )
  }

  const groups = new Map<string, ContentRecord[]>()
  for (const r of filtered) {
    const folder = r.data.folder ?? 'No folder'
    if (!groups.has(folder)) groups.set(folder, [])
    groups.get(folder)!.push(r)
  }
  const folders = [...groups.keys()].sort((a, b) => (a === 'No folder' ? 1 : b === 'No folder' ? -1 : a.localeCompare(b)))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by URL or summary"
          className={inputClass}
        />
        {categories.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-xs font-semibold text-slate-500 pt-1">Category</span>
            <div className="flex items-center gap-2 flex-wrap">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleCategoryFilter(c)}
                  className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                    categoryFilter.has(c) ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-start gap-2">
          <span className="text-xs font-semibold text-slate-500 pt-1">Folder</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFolderFilter(null)}
              className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                folderFilter === null ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              ALL
            </button>
            {(defaults?.folders ?? []).map((f) => (
              <button
                key={f}
                onClick={() => setFolderFilter(f)}
                className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                  folderFilter === f ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {records.length === 0 && <p className="text-slate-500 text-sm">No archived items.</p>}
      {records.length > 0 && filtered.length === 0 && (
        <p className="text-slate-500 text-sm">No items match your search/filter.</p>
      )}

      {folders.map((folder) => (
        <section key={folder} className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-slate-400">{folder}</h3>
          {groups.get(folder)!.map((r) => {
            const summary = r.data.summaries ? Object.values(r.data.summaries)[0] : undefined

            return (
              <section
                key={r.id}
                onClick={() => !r.data.processing && onOpenArticle(r)}
                className={`${cardClass} p-2 cursor-pointer hover:border-slate-600 hover:bg-slate-900/80 transition-colors ${
                  r.data.processing ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                  <div className="flex flex-row items-center gap-3">
                    {r.data.images?.[0] ? (
                      <div className="relative isolate h-16 w-16 flex-shrink-0">
                        {r.data.images.length > 1 && (
                          <>
                            <div className="absolute inset-0 rotate-[20deg] rounded-lg bg-slate-800 border border-slate-700 -z-20" />
                            <div className="absolute inset-0 rotate-[10deg] rounded-lg bg-slate-800 border border-slate-700 -z-10" />
                          </>
                        )}
                        <img
                          src={cachedImageSrc(r.data.images[0])}
                          alt=""
                          className="relative h-16 w-16 object-cover rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-slate-800 flex-shrink-0" />
                    )}
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {r.data.processing ? (
                          <span className="inline-block text-xs px-2 py-1 rounded-full font-medium bg-slate-700 animate-pulse">
                            🔄 {r.data.stage ?? 'Processing...'}
                          </span>
                        ) : (
                          <span
                            className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
                              r.tag === 'Article' ? 'bg-indigo-600' : 'bg-slate-700'
                            }`}
                          >
                            {r.tag}
                          </span>
                        )}
                        {r.data.category && (
                          <span className="inline-block bg-slate-800 text-xs px-2 py-1 rounded-full">{r.data.category}</span>
                        )}
                      </div>
                      {r.data.title && <p className="text-sm font-semibold text-slate-100 truncate">{r.data.title}</p>}
                      {summary && <p className="text-xs text-slate-400 whitespace-pre-wrap">{summary}</p>}
                    </div>
                    <span className="text-slate-600 text-xs flex-shrink-0">▸</span>
                  </div>
                  <div className="flex flex-row justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {r.data.original && (
                      <button
                        onClick={() => onChatWithArticle(r.id)}
                        className="text-xs bg-indigo-600 hover:bg-indigo-500 rounded-lg px-2 py-1 font-medium whitespace-nowrap"
                      >
                        Chat with this article
                      </button>
                    )}
                    {r.data.original && (
                      <button
                        onClick={() => setFullTextRecord(r)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 rounded-lg px-2 py-1 font-medium whitespace-nowrap"
                      >
                        View full text
                      </button>
                    )}
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-slate-800 hover:bg-slate-700 rounded-lg px-2 py-1 font-medium text-center whitespace-nowrap"
                    >
                      View on web
                    </a>
                  </div>
                </section>
              )
          })}
        </section>
      ))}

      {fullTextRecord && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
          onClick={() => setFullTextRecord(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 max-w-2xl w-full max-h-[80vh]"
          >
            <div className="flex items-center gap-2">
              <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                {fullTextRecord.data.title && (
                  <span className="text-sm font-semibold text-slate-100 truncate">{fullTextRecord.data.title}</span>
                )}
                <span className="text-xs text-slate-500 break-all">{fullTextRecord.url}</span>
              </div>
              <button
                onClick={() => setFullTextRecord(null)}
                className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 flex-shrink-0"
              >
                Close
              </button>
            </div>
            <p className="whitespace-pre-wrap text-slate-200 text-sm leading-relaxed overflow-y-auto">
              {fullTextRecord.data.original}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
