import type { Provider } from '../types'

export const CLAUDE_BASE = 'https://api.anthropic.com/v1'

export const DEFAULT_MODELS: Record<Provider, string> = {
  claude: 'claude-haiku-4-5-20251001',
}

