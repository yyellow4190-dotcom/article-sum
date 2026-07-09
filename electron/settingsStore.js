const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const DEFAULT_SETTINGS = {
  apiKeys: { claude: '', gemini: '', openai: '', nvidia: '' },
  models: {
    claude: 'claude-haiku-4-5-20251001',
    gemini: 'gemini-2.5-flash',
    openai: 'gpt-5.1',
    nvidia: 'meta/llama-3.3-70b-instruct',
  },
  defaultProvider: 'claude',
  defaultOptions: { emoji: true, kidFriendly: false, language: 'ko' },
  categories: ['Politics', 'Economy', 'Society', 'Culture', 'Entertainment', 'Sports', 'IT'],
  activeFolder: null,
  supabase: { url: '', anonKey: '' },
}

let cache = null

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

function getSettings() {
  if (cache) return cache
  const file = settingsPath()
  if (fs.existsSync(file)) {
    const raw = JSON.parse(fs.readFileSync(file, 'utf-8'))
    cache = {
      ...DEFAULT_SETTINGS,
      ...raw,
      apiKeys: { ...DEFAULT_SETTINGS.apiKeys, ...raw.apiKeys },
      models: { ...DEFAULT_SETTINGS.models, ...raw.models },
      defaultOptions: { ...DEFAULT_SETTINGS.defaultOptions, ...raw.defaultOptions },
      supabase: { ...DEFAULT_SETTINGS.supabase, ...raw.supabase },
    }
  } else {
    cache = { ...DEFAULT_SETTINGS }
  }
  return cache
}

function updateSettings(partial) {
  const current = getSettings()
  cache = {
    ...current,
    ...partial,
    apiKeys: { ...current.apiKeys, ...partial.apiKeys },
    models: { ...current.models, ...partial.models },
    defaultOptions: { ...current.defaultOptions, ...partial.defaultOptions },
    supabase: { ...current.supabase, ...partial.supabase },
  }
  fs.writeFileSync(settingsPath(), JSON.stringify(cache, null, 2))
  return cache
}

module.exports = { getSettings, updateSettings }
