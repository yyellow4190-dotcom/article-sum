import { useState } from 'react'
import type { Models, Provider } from '../types'
import { DEFAULT_MODELS } from '../config/endpoints'

const STORAGE_KEY = 'article-sum-models'

function load(): Models {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return { ...DEFAULT_MODELS }
  return { ...DEFAULT_MODELS, ...JSON.parse(raw) }
}

export function useModels() {
  const [models, setModels] = useState<Models>(load)

  function updateModel(provider: Provider, value: string) {
    const next = { ...models, [provider]: value }
    setModels(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  return { models, updateModel }
}
