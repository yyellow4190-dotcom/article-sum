const fs = require('fs')
const path = require('path')
const { app } = require('electron')

let cache = null

function chatPath() {
  return path.join(app.getPath('userData'), 'chats.json')
}

function load() {
  if (cache) return cache
  const file = chatPath()
  if (fs.existsSync(file)) {
    cache = JSON.parse(fs.readFileSync(file, 'utf-8'))
  } else {
    cache = { sessions: {} }
  }
  return cache
}

function save() {
  fs.writeFileSync(chatPath(), JSON.stringify(cache, null, 2))
}

function getSession(contentId) {
  const store = load()
  return store.sessions[contentId] ?? { messages: [], provider: null, updatedAt: null }
}

function listSessions() {
  const store = load()
  return Object.entries(store.sessions).map(([contentId, session]) => ({
    contentId: Number(contentId),
    provider: session.provider,
    updatedAt: session.updatedAt,
    lastMessage: session.messages.length ? session.messages[session.messages.length - 1].content : null,
  }))
}

function appendMessage(contentId, message) {
  const store = load()
  const key = String(contentId)
  const session = store.sessions[key] ?? { messages: [], provider: null, updatedAt: null }
  session.messages.push(message)
  session.updatedAt = message.createdAt
  store.sessions[key] = session
  save()
}

function setProvider(contentId, provider) {
  const store = load()
  const key = String(contentId)
  const session = store.sessions[key] ?? { messages: [], provider: null, updatedAt: null }
  session.provider = provider
  store.sessions[key] = session
  save()
}

function deleteSession(contentId) {
  const store = load()
  delete store.sessions[String(contentId)]
  save()
}

module.exports = { getSession, listSessions, appendMessage, setProvider, deleteSession }
