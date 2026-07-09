import type { Provider, SummaryOptions } from './index'

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

export interface AuthUser {
  id: string
  email: string | null
}

export interface ChatEvent {
  type: 'chunk' | 'done' | 'error'
  contentId: number
  chunk?: string
  error?: string
}

export interface PipelineSettings {
  backendUrl: string
  defaultOptions: SummaryOptions
  folders: string[]
  activeFolder: string | null
}

export interface ContentRecord {
  id: number
  url: string
  tag: 'Article' | 'Not Article'
  status: 'pending' | 'approved'
  embedding?: number[] | null
  similarity?: number
  data: {
    original?: string
    title?: string | null
    category?: string
    summaries?: Record<string, string>
    processing?: boolean
    stage?: string
    images?: string[]
    error?: string
    folder?: string | null
    embeddingError?: string
  }
  createdAt: string
}

export interface ElectronApi {
  getSettings: () => Promise<PipelineSettings>
  syncSettings: (partial: Partial<PipelineSettings>) => Promise<PipelineSettings>
  listPending: () => Promise<ContentRecord[]>
  listApproved: () => Promise<ContentRecord[]>
  processUrl: (url: string) => Promise<void>
  approve: (id: number) => Promise<void>
  discard: (id: number) => Promise<void>
  cancel: (id: number) => Promise<void>
  regenerate: (id: number) => Promise<void>
  getRelated: (id: number) => Promise<ContentRecord[]>
  onQueueUpdate: (callback: () => void) => () => void
  authSignUp: (email: string, password: string) => Promise<AuthUser | null>
  authSignIn: (email: string, password: string) => Promise<AuthUser | null>
  authSignOut: () => Promise<void>
  authGetUser: () => Promise<AuthUser | null>
  onAuthChange: (callback: (user: AuthUser | null) => void) => () => void
  chatGetSession: (contentId: number) => Promise<ChatSession>
  chatListSessions: () => Promise<ChatSessionSummary[]>
  chatDeleteSession: (contentId: number) => Promise<void>
  chatSend: (contentId: number, payload: { text: string; articleText: string }) => Promise<void>
  onChatEvent: (callback: (event: ChatEvent) => void) => () => void
}

declare global {
  interface Window {
    api?: ElectronApi
  }
}
