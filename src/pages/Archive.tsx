import { useEffect, useMemo, useState } from 'react'
import type { ContentRecord } from '../types/global'
import { cachedImageSrc } from '../utils/imageCache'

const cardClass =
  'bg-[#d9cfbc] border-2 border-[#090806] p-4 flex flex-col gap-3'
const inputClass =
  'bg-[#e9dfcb] border-2 border-[#090806] px-3 py-3 font-poster text-3xl uppercase leading-none text-[#090806] placeholder:text-[#090806]/55 focus:outline-none'

export default function Archive({
  onChatWithArticle,
  onOpenArticle,
}: {
  onChatWithArticle: (id: number) => void
  onOpenArticle: (record: ContentRecord) => void
}) {
  const [records, setRecords] = useState<ContentRecord[] | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set())
  const [fullTextRecord, setFullTextRecord] = useState<ContentRecord | null>(null)

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
      if (!query) return true
      const summary = r.data.summaries ? Object.values(r.data.summaries)[0] : undefined
      return r.url.toLowerCase().includes(query) || (summary?.toLowerCase().includes(query) ?? false)
    })
  }, [records, search, categoryFilter])

  if (!window.api) {
    return <p className="border-2 border-[#090806] bg-[#d9cfbc] p-4 font-poster text-3xl uppercase leading-none text-[#090806]">This feature is only available in the Electron app.</p>
  }

  if (records === null) {
    return <p className="font-poster text-3xl uppercase text-[#090806]">Loading...</p>
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
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => toggleCategoryFilter(c)}
                className={`border-2 border-[#090806] px-2 py-1 text-xs font-black uppercase transition-colors ${
                  categoryFilter.has(c)
                    ? 'bg-[#090806] text-[#e9dfcb]'
                    : 'border-2 border-[#090806] text-[#090806] hover:bg-[#e9dfcb]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {records.length === 0 && <p className="border-2 border-[#090806] bg-[#d9cfbc] p-4 font-poster text-3xl uppercase leading-none text-[#090806]">No archived items.</p>}
      {records.length > 0 && filtered.length === 0 && (
        <p className="border-2 border-[#090806] bg-[#d9cfbc] p-4 font-poster text-3xl uppercase leading-none text-[#090806]">No items match your search/filter.</p>
      )}

      {folders.map((folder) => (
        <section key={folder} className="flex flex-col gap-4">
          <h3 className="border-b-2 border-[#090806] pb-1 font-poster text-5xl uppercase leading-none text-[#090806]">{folder}</h3>
          {groups.get(folder)!.map((r) => {
            const summary = r.data.summaries ? Object.values(r.data.summaries)[0] : undefined

            return (
              <section
                key={r.id}
                onClick={() => !r.data.processing && onOpenArticle(r)}
                className={`${cardClass} cursor-pointer p-2 transition-colors hover:bg-[#e9dfcb] ${
                  r.data.processing ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                  <div className="flex flex-row items-center gap-3">
                    {r.data.images?.[0] ? (
                      <div className="relative isolate h-16 w-16 flex-shrink-0">
                        {r.data.images.length > 1 && (
                          <>
                            <div className="absolute inset-0 -z-20 rotate-[16deg] border-2 border-[#090806] bg-[#c8bca9]" />
                            <div className="absolute inset-0 -z-10 rotate-[8deg] border-2 border-[#090806] bg-[#d9cfbc]" />
                          </>
                        )}
                        <img
                          src={cachedImageSrc(r.data.images[0])}
                          alt=""
                          className="relative h-16 w-16 border-2 border-[#090806] object-cover grayscale"
                        />
                      </div>
                    ) : (
                        <div className="h-16 w-16 flex-shrink-0 border-2 border-[#090806] bg-[#c8bca9]" />
                    )}
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {r.data.processing ? (
                          <span className="inline-block animate-pulse bg-[#090806] px-2 py-1 text-xs font-black uppercase text-[#e9dfcb]">
                            {r.data.stage ?? 'Processing...'}
                          </span>
                        ) : (
                          <span
                            className={`inline-block px-2 py-1 text-xs font-black uppercase ${
                              r.tag === 'Article'
                                ? 'bg-[#090806] text-[#e9dfcb]'
                                : 'border border-[#090806] text-[#090806]'
                            }`}
                          >
                            {r.tag}
                          </span>
                        )}
                        {r.data.category && (
                          <span className="inline-block border border-[#090806] px-2 py-1 text-xs font-black uppercase text-[#090806]">{r.data.category}</span>
                        )}
                      </div>
                      {r.data.title && <p className="truncate font-poster text-3xl uppercase leading-none text-[#090806]">{r.data.title}</p>}
                      {summary && <p className="whitespace-pre-wrap text-xs font-bold text-[#090806]">{summary}</p>}
                    </div>
                    <span className="flex-shrink-0 font-poster text-2xl text-[#090806]">▸</span>
                  </div>
                  <div className="flex flex-row justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {r.data.original && (
                      <button
                        onClick={() => onChatWithArticle(r.id)}
                        className="whitespace-nowrap bg-[#090806] px-3 py-1 text-xs font-black uppercase text-[#e9dfcb] hover:bg-black"
                      >
                        Chat with this article
                      </button>
                    )}
                    {r.data.original && (
                      <button
                        onClick={() => setFullTextRecord(r)}
                        className="whitespace-nowrap border-2 border-[#090806] px-3 py-1 text-xs font-black uppercase text-[#090806] hover:bg-[#e9dfcb]"
                      >
                        View full text
                      </button>
                    )}
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="whitespace-nowrap border-2 border-[#090806] px-3 py-1 text-center text-xs font-black uppercase text-[#090806] hover:bg-[#e9dfcb]"
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
          className="fixed inset-0 bg-[#11100d]/35 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setFullTextRecord(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[80vh] w-full max-w-2xl flex-col gap-3 border-2 border-[#090806] bg-[#e9dfcb] p-4 shadow-[12px_12px_0_#090806]"
          >
            <div className="flex items-center gap-2">
              <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                {fullTextRecord.data.title && (
                  <span className="truncate font-poster text-3xl uppercase leading-none text-[#090806]">{fullTextRecord.data.title}</span>
                )}
                <span className="break-all text-xs font-black uppercase text-[#090806]">{fullTextRecord.url}</span>
              </div>
              <button
                onClick={() => setFullTextRecord(null)}
                className="flex-shrink-0 border-2 border-[#090806] px-2 py-1 text-xs font-black uppercase hover:bg-[#090806] hover:text-[#e9dfcb]"
              >
                Close
              </button>
            </div>
            <p className="overflow-y-auto whitespace-pre-wrap border-t-2 border-[#090806] pt-3 text-sm font-bold leading-relaxed text-[#090806]">
              {fullTextRecord.data.original}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
