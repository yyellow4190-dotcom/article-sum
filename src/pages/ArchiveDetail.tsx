import { useEffect, useState } from 'react'
import type { ContentRecord } from '../types/global'
import { cachedImageSrc } from '../utils/imageCache'

const cardClass = 'bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-3'

export default function ArchiveDetail({
  record,
  onBack,
  onChatWithArticle,
  onOpenArticle,
}: {
  record: ContentRecord
  onBack: () => void
  onChatWithArticle: (id: number) => void
  onOpenArticle: (record: ContentRecord) => void
}) {
  const [related, setRelated] = useState<ContentRecord[]>([])
  const [fullTextRecord, setFullTextRecord] = useState<ContentRecord | null>(null)

  useEffect(() => {
    console.log(`[ArchiveDetail] fetching related articles for id=${record.id}`)
    window.api
      ?.getRelated(record.id)
      .then((r) => {
        console.log(`[ArchiveDetail] id=${record.id} got ${r.length} related article(s):`, r)
        setRelated(r)
      })
      .catch((e) => {
        console.error(`[ArchiveDetail] id=${record.id} getRelated failed:`, e)
      })
  }, [record.id])

  async function handleDelete() {
    if (!window.confirm('Delete this item?')) return
    await window.api?.discard(record.id)
    onBack()
  }

  async function handleRegenerate() {
    await window.api?.regenerate(record.id)
    onBack()
  }

  const summary = record.data.summaries ? Object.values(record.data.summaries)[0] : undefined

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onBack}
        className="text-sm text-slate-400 hover:text-slate-200 self-start"
      >
        ← Back to Archive
      </button>

      <section className={cardClass}>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
              record.tag === 'Article' ? 'bg-indigo-600' : 'bg-slate-700'
            }`}
          >
            {record.tag}
          </span>
          {record.data.category && (
            <span className="inline-block bg-slate-800 text-xs px-2 py-1 rounded-full">{record.data.category}</span>
          )}
          {(record.data.embeddingError || record.embedding == null) && (
            <span
              title={record.data.embeddingError}
              className="inline-block bg-amber-900/50 text-amber-400 text-xs px-2 py-1 rounded-full"
            >
              ⚠ Excluded from related articles
            </span>
          )}
          <span className="text-xs text-slate-600 ml-auto">{new Date(record.createdAt).toLocaleString('en-US')}</span>
        </div>
        {record.data.title && <p className="text-sm font-semibold text-slate-100">{record.data.title}</p>}
        {record.data.images && record.data.images.length > 0 && (
          <div className="flex flex-row gap-2 overflow-x-auto pb-1">
            {record.data.images.map((src, i) => (
              <img
                key={i}
                src={cachedImageSrc(src)}
                alt=""
                className="max-h-[200px] w-auto object-contain rounded-lg flex-shrink-0"
              />
            ))}
          </div>
        )}
        {summary && <p className="whitespace-pre-wrap text-slate-200 leading-relaxed">{summary}</p>}

        {related.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold text-slate-400">Related articles</h4>
            <div className="flex flex-row gap-3 overflow-x-auto pb-1">
              {related.map((r) => {
                const relatedSummary = r.data.summaries ? Object.values(r.data.summaries)[0] : undefined
                return (
                  <button
                    key={r.id}
                    onClick={() => onOpenArticle(r)}
                    className={`text-left bg-slate-800/70 hover:bg-slate-800 border border-slate-700 rounded-lg p-2 flex flex-col gap-1 w-48 flex-shrink-0 ${
                      r.similarity != null && r.similarity <= 0.5 ? 'opacity-50' : ''
                    }`}
                  >
                    {r.data.images?.[0] ? (
                      <img src={cachedImageSrc(r.data.images[0])} alt="" className="h-20 w-full object-cover rounded-md" />
                    ) : (
                      <div className="h-20 w-full rounded-md bg-slate-700" />
                    )}
                    {r.similarity != null && (
                      <span className="self-start text-[10px] font-medium bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full">
                        유사도 {Math.round(r.similarity * 100)}%
                      </span>
                    )}
                    <span className="text-xs font-semibold text-slate-100 line-clamp-2">{r.data.title ?? r.url}</span>
                    {relatedSummary && <span className="text-xs text-slate-400 line-clamp-2">{relatedSummary}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 flex-wrap">
          {record.data.original && !record.data.processing && (
            <button
              onClick={handleRegenerate}
              className="text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5 font-medium"
            >
              Regenerate
            </button>
          )}
          {record.data.original && (
            <button
              onClick={() => onChatWithArticle(record.id)}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 rounded-lg px-3 py-1.5 font-medium"
            >
              Chat with this article
            </button>
          )}
          {record.data.original && (
            <button
              onClick={() => setFullTextRecord(record)}
              className="text-xs bg-slate-800 hover:bg-slate-700 rounded-lg px-3 py-1.5 font-medium"
            >
              View full text
            </button>
          )}
          <a
            href={record.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs bg-slate-800 hover:bg-slate-700 rounded-lg px-3 py-1.5 font-medium"
          >
            View on web
          </a>
          <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5">
            Delete
          </button>
        </div>
      </section>

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
