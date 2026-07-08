import { useState } from 'react'
import { LANGUAGES, PROVIDERS } from '../types'
import type { Provider, SummaryOptions } from '../types'
import { useApiKeys } from '../hooks/useApiKeys'
import { useModels } from '../hooks/useModels'
import { usePipelineDefaults } from '../hooks/usePipelineDefaults'
import { useSupabaseConfig } from '../hooks/useSupabaseConfig'

const inputClass =
  'bg-[#e9dfcb] border-2 border-[#090806] px-3 py-2 text-sm font-black text-[#090806] placeholder:text-[#090806]/55 focus:outline-none'
const cardClass =
  'bg-[#d9cfbc] border-2 border-[#090806] p-4 flex flex-col gap-3'

export default function Settings() {
  const { keys, updateKey } = useApiKeys()
  const { models, updateModel } = useModels()
  const { defaults, updateCategories, updateDefaultProvider, updateDefaultOptions } = usePipelineDefaults()
  const { config: supabaseConfig, updateConfig: updateSupabaseConfig } = useSupabaseConfig()
  const [newCategory, setNewCategory] = useState('')

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
            <label className="ml-auto flex items-center gap-2 text-sm font-black uppercase text-[#090806]">
              Provider
              <select
                value={defaults.defaultProvider}
                onChange={(e) => updateDefaultProvider(e.target.value as Provider)}
                className={inputClass}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
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

      {supabaseConfig && (
        <div className="flex flex-col gap-4">
          <h2 className="font-poster text-4xl uppercase leading-none text-[#090806]">Database</h2>
          <div className={cardClass}>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase text-[#090806]">Project URL</label>
              <input
                value={supabaseConfig.url}
                onChange={(e) => updateSupabaseConfig({ url: e.target.value })}
                placeholder="https://xxxxx.supabase.co"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase text-[#090806]">Anon Key</label>
              <input
                type="password"
                value={supabaseConfig.anonKey}
                onChange={(e) => updateSupabaseConfig({ anonKey: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {PROVIDERS.map((p) => (
          <div key={p.id} className={cardClass}>
            <span className="font-poster text-4xl uppercase leading-none text-[#090806]">{p.label}</span>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase text-[#090806]">API Key</label>
              <input
                type="password"
                placeholder={`${p.label} API Key`}
                value={keys[p.id]}
                onChange={(e) => updateKey(p.id, e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase text-[#090806]">Model Name</label>
              <input
                value={models[p.id]}
                onChange={(e) => updateModel(p.id, e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
