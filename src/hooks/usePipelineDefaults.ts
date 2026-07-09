import { useEffect, useState } from 'react'
import type { Provider, SummaryOptions } from '../types'

interface PipelineDefaults {
  defaultProvider: Provider
  defaultOptions: SummaryOptions
  categories: string[]
  activeFolder: string | null
}

export function usePipelineDefaults() {
  const [defaults, setDefaults] = useState<PipelineDefaults | null>(null)

  useEffect(() => {
    window.api?.getSettings().then((s) =>
      setDefaults({
        defaultProvider: s.defaultProvider,
        defaultOptions: s.defaultOptions,
        categories: s.categories,
        activeFolder: s.activeFolder,
      })
    )
  }, [])

  function updateDefaultProvider(defaultProvider: Provider) {
    setDefaults((prev) => (prev ? { ...prev, defaultProvider } : prev))
    window.api?.syncSettings({ defaultProvider })
  }

  function updateDefaultOptions(defaultOptions: SummaryOptions) {
    setDefaults((prev) => (prev ? { ...prev, defaultOptions } : prev))
    window.api?.syncSettings({ defaultOptions })
  }

  function updateCategories(categories: string[]) {
    setDefaults((prev) => (prev ? { ...prev, categories } : prev))
    window.api?.syncSettings({ categories })
  }

  function updateActiveFolder(activeFolder: string | null) {
    setDefaults((prev) => (prev ? { ...prev, activeFolder } : prev))
    window.api?.syncSettings({ activeFolder })
  }

  return { defaults, updateDefaultProvider, updateDefaultOptions, updateCategories, updateActiveFolder }
}
