import { useEffect, useState } from 'react'
import { LANGUAGES } from '../types'
import type { SummaryOptions } from '../types'
import { usePipelineDefaults } from '../hooks/usePipelineDefaults'

const inputClass =
  'bg-[#e9dfcb] border-2 border-[#090806] px-3 py-2 text-sm font-black text-[#090806] placeholder:text-[#090806]/55 focus:outline-none'
const cardClass =
  'bg-[#d9cfbc] border-2 border-[#090806] p-4 flex flex-col gap-3'

export default function Settings() {
  const { defaults, refresh, updateBackendUrl, updateCategories, updateDefaultOptions } = usePipelineDefaults()
  const [newCategory, setNewCategory] = useState('')

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'F5') {
        e.preventDefault()
        refresh()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleOptionsChange(o: SummaryOptions) {
    updateDefaultOptions(o)
  }

  function handleCategoryRename(index: number, value: string) {
    if (!defaults) return
    const next = [...defaults.categories]
    next[index] = value
    updateCategories(next)
  }

  function handleCategoryRemove(index: number) {
    if (!defaults) return
    updateCategories(defaults.categories.filter((_, i) => i !== index))
  }

  function handleCategoryAdd() {
    const trimmed = newCategory.trim()
    if (!defaults || !trimmed || defaults.categories.includes(trimmed)) return
    updateCategories([...defaults.categories, trimmed])
    setNewCategory('')
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="border-b-2 border-[#090806] pb-1 font-poster text-6xl uppercase leading-none text-[#090806]">Profile</h2>

      {defaults && (
        <div className="flex flex-col gap-4">
          <h2 className="font-poster text-4xl uppercase leading-none text-[#090806]">Backend Configuration</h2>
          <div className={cardClass}>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase text-[#090806]">Backend URL & Port</label>
              <input
                value={defaults.backendUrl}
                onChange={(e) => updateBackendUrl(e.target.value)}
                placeholder="http://127.0.0.1:3000"
                className={inputClass}
              />
            </div>
          </div>

          <h2 className="font-poster text-4xl uppercase leading-none text-[#090806]">Pipeline Defaults</h2>
          <section className={`${cardClass} flex-row flex-wrap items-center gap-x-6 gap-y-3`}>
            <label className="flex items-center gap-2 text-sm font-black uppercase text-[#090806]">
              <input
                type="checkbox"
                checked={defaults.defaultOptions.emoji}
                onChange={(e) => handleOptionsChange({ ...defaults.defaultOptions, emoji: e.target.checked })}
                className="accent-[#11100d]"
              />
              Add emojis
            </label>
            <label className="flex items-center gap-2 text-sm font-black uppercase text-[#090806]">
              <input
                type="checkbox"
                checked={defaults.defaultOptions.kidFriendly}
                onChange={(e) => handleOptionsChange({ ...defaults.defaultOptions, kidFriendly: e.target.checked })}
                className="accent-[#11100d]"
              />
              Kid-friendly (simple words)
            </label>
            <label className="flex items-center gap-2 text-sm font-black uppercase text-[#090806]">
              Summary language
              <select
                value={defaults.defaultOptions.language}
                onChange={(e) =>
                  handleOptionsChange({ ...defaults.defaultOptions, language: e.target.value as SummaryOptions['language'] })
                }
                className={inputClass}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <h2 className="font-poster text-4xl uppercase leading-none text-[#090806]">Categories</h2>
          <div className={cardClass}>
            {defaults.categories.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={c}
                  onChange={(e) => handleCategoryRename(i, e.target.value)}
                  className={`${inputClass} flex-1`}
                />
                <button
                  onClick={() => handleCategoryRemove(i)}
                  className="text-xs text-red-600 hover:text-red-500 px-2"
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category"
                className={`${inputClass} flex-1`}
              />
              <button
                onClick={handleCategoryAdd}
                className="bg-[#090806] px-3 py-1.5 text-xs font-black uppercase text-[#e9dfcb] hover:bg-black"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
