const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const DEFAULT_SETTINGS = {
  backendUrl: 'http://127.0.0.1:3000',
  defaultOptions: { emoji: true, kidFriendly: false, language: 'ko' },
  categories: ['Politics', 'Economy', 'Society', 'Culture', 'Entertainment', 'Sports', 'IT'],
  activeFolder: null,
  authStorage: {},
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
      defaultOptions: { ...DEFAULT_SETTINGS.defaultOptions, ...raw.defaultOptions },
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
    defaultOptions: { ...current.defaultOptions, ...partial.defaultOptions },
  }
  fs.writeFileSync(settingsPath(), JSON.stringify(cache, null, 2))
  return cache
}

module.exports = { getSettings, updateSettings }
