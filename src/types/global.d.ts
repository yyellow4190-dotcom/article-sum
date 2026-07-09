import type { ApiKeys, Models, Provider, SummaryOptions } from './index'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface ChatSession {
  messages: ChatMessage[]
  provider: Provider | null
  updatedAt: string | null
}

export interface ChatSessionSummary {
  contentId: number
  provider: Provider | null
  updatedAt: string | null
  lastMessage: string | null
}

export interface ChatEvent {
  type: 'chunk' | 'done' | 'error'
  contentId: number
  chunk?: string
  error?: string
}

export interface PipelineSettings {
  apiKeys: ApiKeys
  models: Models
  defaultProvider: Provider
  defaultOptions: SummaryOptions
  categories: string[]
  activeFolder: string | null
  supabase: { url: string; anonKey: string }
}

export interface ContentRecord {
  id: number
  url: string
  tag: 'Article' | 'Not Article'
  status: 'pending' | 'approved'
  data: {
    original?: string
    title?: string | null
    category?: string
    summaries?: Record<string, string>
    processing?: boolean
    stage?: string
    thumbnail?: string | null
    error?: string
    folder?: string | null
  }
  createdAt: string
}

export interface ElectronApi {
  getSettings: () => Promise<PipelineSettings>
  syncSettings: (partial: Partial<PipelineSettings>) => Promise<PipelineSettings>
  listPending: () => Promise<ContentRecord[]>
  listApproved: () => Promise<ContentRecord[]>
  approve: (id: number) => Promise<void>
  discard: (id: number) => Promise<void>
  cancel: (id: number) => Promise<void>
  onQueueUpdate: (callback: () => void) => () => void
  chatGetSession: (contentId: number) => Promise<ChatSession>
  chatListSessions: () => Promise<ChatSessionSummary[]>
  chatDeleteSession: (contentId: number) => Promise<void>
  chatSend: (contentId: number, payload: { text: string; provider: Provider; articleText: string }) => Promise<void>
  onChatEvent: (callback: (event: ChatEvent) => void) => () => void
}

declare global {
  interface Window {
    api?: ElectronApi
  }
}
