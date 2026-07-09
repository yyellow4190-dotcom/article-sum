import type { Provider } from '../types'

export const CLAUDE_BASE = 'https://api.anthropic.com/v1'
export const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'
export const OPENAI_BASE = 'https://api.openai.com/v1'

// NVIDIA NIM doesn't send CORS headers — dev only, proxied via vite.config.ts.
// No prod proxy configured; nvidia provider is dev-only for now.
export const NVIDIA_BASE = import.meta.env.DEV ? '/nvidia-nim/v1' : 'https://integrate.api.nvidia.com/v1'

export const DEFAULT_MODELS: Record<Provider, string> = {
  claude: 'claude-haiku-4-5-20251001',
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-5.1',
  nvidia: 'meta/llama-3.3-70b-instruct',
}
