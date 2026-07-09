export type Category = string

export type Provider = 'claude'

export type Language = 'ko' | 'en' | 'ja' | 'zh'

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'ko', label: 'Korean' },
  { id: 'en', label: 'English' },
  { id: 'ja', label: 'Japanese' },
  { id: 'zh', label: 'Chinese' },
]

export interface SummaryOptions {
  emoji: boolean
  kidFriendly: boolean
  language: Language
}

export interface SummaryResult {
  category: Category
  summary: string
}

