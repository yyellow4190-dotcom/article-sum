import { useState } from 'react'
import type { ApiKeys } from '../types'

const STORAGE_KEY = 'article-sum-api-keys'

function load(): ApiKeys {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return { claude: '', gemini: '', openai: '', nvidia: '' }
  return JSON.parse(raw)
}

export function useApiKeys() {
  const [keys, setKeys] = useState<ApiKeys>(load)

  function updateKey(provider: keyof ApiKeys, value: string) {
    const next = { ...keys, [provider]: value }
    setKeys(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  return { keys, updateKey }
}
