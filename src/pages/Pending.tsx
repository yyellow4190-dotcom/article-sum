import { useEffect, useState } from 'react'
import type { ContentRecord } from '../types/global'
import { usePipelineDefaults } from '../hooks/usePipelineDefaults'
import { cachedImageSrc } from '../utils/imageCache'

const cardClass =
  'bg-[#d9cfbc] border-2 border-[#090806] p-4 flex flex-col gap-3'
const inputClass =
  'bg-[#e9dfcb] border-2 border-[#090806] px-3 py-2 text-sm font-black uppercase text-[#090806] focus:outline-none'

export default function Pending() {
  const [records, setRecords] = useState<ContentRecord[] | null>(null)
  const [fullTextRecord, setFullTextRecord] = useState<ContentRecord | null>(null)
  const { defaults, refresh: refreshDefaults, updateActiveFolder } = usePipelineDefaults()

  function refresh() {
    window.api?.listPending().then(setRecords)
  }

  useEffect(() => {
    refresh()
    return window.api?.onQueueUpdate(refresh)
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'F5') {
        e.preventDefault()
        refresh()
        refreshDefaults()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  async function handleApprove(id: number) {
    await window.api?.approve(id)
    refresh()
  }

  async function handleDiscard(id: number) {
    if (!window.confirm('Discard this item?')) return
    await window.api?.discard(id)
    refresh()
  }

  async function handleCancel(id: number) {
    await window.api?.cancel(id)
    refresh()
  }

  async function handleRegenerate(id: number) {
    await window.api?.regenerate(id)
    refresh()
  }

  if (!window.api) {
    return <p className="border-2 border-[#090806] bg-[#d9cfbc] p-4 font-poster text-3xl uppercase leading-none text-[#090806]">This feature is only available in the Electron app.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {defaults && (
        <div className="flex items-center gap-3 border-b-2 border-[#090806] pb-4">
          <label className="font-poster text-3xl uppercase leading-none text-[#090806]">Approve Folder</label>
          <select
            value={defaults.activeFolder ?? ''}
            onChange={(e) => updateActiveFolder(e.target.value || null)}
            className={inputClass}
          >
            <option value="">No folder</option>
            {defaults.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {records === null && <p className="font-poster text-3xl uppercase text-[#090806]">Loading...</p>}

      {records && records.length === 0 && (
        <p className="border-2 border-[#090806] bg-[#d9cfbc] p-4 font-poster text-3xl uppercase leading-none text-[#090806]">No items pending approval. Try copying a link.</p>
      )}

      {records?.map((r) => {
        const summary = r.data.summaries ? Object.values(r.data.summaries)[0] : undefined
        const isRegenerating = r.data.processing && r.data.stage === 'Regenerating summary...'
        return (
          <section key={r.id} className={`${cardClass} ${isRegenerating ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-2 flex-wrap">
              {r.data.processing ? (
                <span className="inline-block animate-pulse bg-[#090806] px-2 py-1 text-xs font-black uppercase text-[#e9dfcb]">
                  {r.data.stage ?? 'Processing...'}
                </span>
              ) : (
                <span
                  className={`inline-block px-2 py-1 text-xs font-black uppercase ${
                    r.tag === 'Article' ? 'bg-[#090806] text-[#e9dfcb]' : 'border border-[#090806] text-[#090806]'
                  }`}
                >
                  {r.tag}
                </span>
              )}
              {r.data.category && (
                <span className="inline-block border border-[#090806] px-2 py-1 text-xs font-black uppercase text-[#090806]">{r.data.category}</span>
              )}
              <span className="ml-auto text-xs font-black uppercase text-[#090806]">{new Date(r.createdAt).toLocaleString('en-US')}</span>
            </div>
            {r.data.title && <p className="font-poster text-4xl uppercase leading-none text-[#090806]">{r.data.title}</p>}
            <a href={r.url} target="_blank" rel="noreferrer" className="break-all border-y-2 border-[#090806] py-2 text-xs font-black uppercase text-[#090806] hover:bg-[#e9dfcb]">
              {r.url}
            </a>
            {r.data.images && r.data.images.length > 0 && (
              <div className="flex flex-row gap-2 overflow-x-auto pb-1">
                {r.data.images.map((src, i) => (
                  <img
                    key={i}
                    src={cachedImageSrc(src)}
                    alt=""
                    className="max-h-[200px] w-auto flex-shrink-0 border-2 border-[#090806] object-contain grayscale"
                  />
                ))}
              </div>
            )}
            {summary && <p className="whitespace-pre-wrap border-t-2 border-[#090806] pt-3 text-sm font-bold leading-relaxed text-[#090806]">{summary}</p>}
            {r.data.error && (
              <p className="border-2 border-red-700 bg-red-50 px-3 py-2 text-sm font-black uppercase text-red-700">
                {r.data.error}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              {r.data.original && (
                <button
                  onClick={() => setFullTextRecord(r)}
                  className="px-3 py-1.5 text-xs font-black uppercase text-[#090806] hover:bg-[#e9dfcb]"
                >
                  Show full article
                </button>
              )}
              {r.data.original && !r.data.processing && (
                <button
                  onClick={() => handleRegenerate(r.id)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5"
                >
                  Regenerate
                </button>
              )}
              {r.data.processing ? (
                <button
                  onClick={() => handleCancel(r.id)}
                  className="text-xs text-red-600 hover:text-red-500 px-3 py-1.5"
                >
                  Cancel
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleDiscard(r.id)}
                    className="text-xs text-red-600 hover:text-red-500 px-3 py-1.5"
                  >
                    Discard
                  </button>
                  <button
                    onClick={() => handleApprove(r.id)}
                    className="bg-[#090806] px-3 py-1.5 text-xs font-black uppercase text-[#e9dfcb] hover:bg-black"
                  >
                    Approve
                  </button>
                </>
              )}
            </div>
          </section>
        )
      })}

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
