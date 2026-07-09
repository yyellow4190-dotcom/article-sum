const { app, BrowserWindow, clipboard, ipcMain, protocol, Menu, screen, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const settingsStore = require('./settingsStore')
const db = require('./db')
const chatStore = require('./chatStore')
const imageCache = require('./imageCache')
const { streamChat } = require('./llm')

const URL_RE = /^https?:\/\/\S+$/i

function getBackendUrl() {
  const url = settingsStore.getSettings().backendUrl || 'http://127.0.0.1:3000'
  return url.replace(/\/+$/, '')
}

function getBackendPort() {
  const url = getBackendUrl()
  const match = url.match(/:(\d+)/)
  return match ? parseInt(match[1], 10) : 3000
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'appimg', privileges: { standard: true, supportFetchAPI: true, stream: true, bypassCSP: true } },
])

let sidecarProcess = null
let mainWindow = null
let lastClipboardText = ''
let overlayWindow = null
let overlayJobCount = 0
let isAuthenticated = false
const activeJobs = new Map()

async function ensureOverlayWindow() {
  if (overlayWindow) return overlayWindow
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  const overlayWidth = 360
  const overlayHeight = 90
  overlayWindow = new BrowserWindow({
    width: overlayWidth,
    height: overlayHeight,
    x: Math.round((width - overlayWidth) / 2),
    y: Math.round(height * 0.9 - overlayHeight / 2),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    show: false,
    webPreferences: { contextIsolation: true },
  })
  overlayWindow.setIgnoreMouseEvents(true)
  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.on('closed', () => {
    overlayWindow = null
  })
  await overlayWindow.loadFile(path.join(__dirname, 'overlay.html'))
  return overlayWindow
}

async function setOverlayText(text) {
  const win = await ensureOverlayWindow()
  await win.webContents.executeJavaScript(`document.querySelector('.label').textContent = ${JSON.stringify(text)}`)
}

async function showOverlay(text) {
  overlayJobCount++
  try {
    await setOverlayText(text)
    overlayWindow?.showInactive()
  } catch (e) {
    console.error('[overlay] show failed:', e)
  }
}

function hideOverlayJob() {
  overlayJobCount = Math.max(0, overlayJobCount - 1)
  if (overlayJobCount === 0) overlayWindow?.hide()
}

function computeOptionKey(options) {
  const parts = []
  if (options.emoji) parts.push('emoji')
  if (options.kidFriendly) parts.push('child')
  return parts.length ? parts.join('_') : 'default'
}

function startBackend() {
  const pythonBin = process.platform === 'win32' ? 'python' : 'python3'
  const port = getBackendPort()
  sidecarProcess = spawn(pythonBin, ['-m', 'uvicorn', 'main:app', '--port', String(port)], {
    cwd: path.join(__dirname, '..', '..', 'article-sum-back'),
    stdio: 'ignore',
  })
  sidecarProcess.on('error', (e) => console.error('[backend] failed to start:', e))
}

function broadcastQueueUpdate() {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('queue:updated')
  }
}

function broadcastChatEvent(payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('chat:event', payload)
  }
}

function broadcastAuthChange(user) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('auth:changed', user)
  }
}

async function processLink(url) {
  const data = { processing: true, stage: 'Fetching article...' }
  let id
  try {
    id = await db.insertContent({ url, tag: 'Article', data })
  } catch (e) {
    console.error('[processLink] insertContent failed:', e)
    return
  }
  broadcastQueueUpdate()

  const controller = new AbortController()
  activeJobs.set(id, controller)
  let tag = 'Article'
  let embedding

  showOverlay('✨ Analyzing link...')

  try {
    const settings = settingsStore.getSettings()

    setOverlayText('✨ Summarizing article...').catch((e) => console.error('[overlay] update failed:', e))

    const res = await fetch(`${getBackendUrl()}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        options: settings.defaultOptions,
        categories: settingsStore.CATEGORIES,
      }),
      signal: AbortSignal.any([AbortSignal.timeout(60_000), controller.signal]),
    })

    if (!res.ok) throw new Error(`Backend process failed: ${res.statusText}`)
    const result = await res.json()

    if (controller.signal.aborted) return

    if (!result.success || !result.text) {
      tag = 'Not Article'
      return
    }

    data.original = result.text
    data.images = result.images ?? []
    data.title = result.title ?? null
    data.summaries = {}
    if (result.error) {
      data.error = result.error
    } else {
      data.category = result.category
      data.summaries[computeOptionKey(settings.defaultOptions)] = result.summary
    }

    embedding = result.embedding
    data.embeddingError = result.embeddingError
    console.log(
      `[processLink] id=${id} embedding=${embedding ? `${embedding.length}d vector` : 'none'} embeddingError=${data.embeddingError ?? 'none'}`
    )
  } catch (e) {
    if (controller.signal.aborted) return
    console.error('[processLink] failed:', e)
    data.error = e instanceof Error ? e.message : String(e)
  } finally {
    hideOverlayJob()
    if (!controller.signal.aborted) {
      data.processing = false
      delete data.stage
      await db.updateContent(id, { tag, data, embedding })
      broadcastQueueUpdate()
    }
    activeJobs.delete(id)
  }
}

function watchClipboard() {
  lastClipboardText = clipboard.readText().trim()
  setInterval(() => {
    const text = clipboard.readText().trim()
    if (!text || text === lastClipboardText) return
    lastClipboardText = text
    if (isAuthenticated && URL_RE.test(text)) processLink(text)
  }, 100)
}

function registerIpcHandlers() {
  ipcMain.handle('settings:get', () => settingsStore.getSettings())
  ipcMain.handle('settings:sync', (_event, partial) => settingsStore.updateSettings(partial))
  ipcMain.handle('contents:list', (_event, status) => db.listByStatus(status))
  ipcMain.handle('contents:process-url', async (_event, url) => {
    if (!isAuthenticated) throw new Error('Sign in to create a brief.')
    if (typeof url !== 'string' || !URL_RE.test(url.trim())) throw new Error('Invalid URL.')
    void processLink(url.trim())
  })
  ipcMain.handle('contents:related', (_event, id) => db.getRelated(id))
  ipcMain.handle('contents:approve', async (_event, id) => {
    const { activeFolder } = settingsStore.getSettings()
    await db.approve(id, activeFolder)
    broadcastQueueUpdate()
  })
  ipcMain.handle('contents:discard', async (_event, id) => {
    await db.discard(id)
    await chatStore.deleteSession(id)
    broadcastQueueUpdate()
  })
  ipcMain.handle('contents:cancel', async (_event, id) => {
    activeJobs.get(id)?.abort()
    await db.discard(id)
    broadcastQueueUpdate()
  })
  ipcMain.handle('contents:regenerate', async (_event, id) => {
    try {
      const record = await db.getContent(id)
      if (!record.data || !record.data.original) {
        throw new Error('Original article text is missing. Cannot regenerate.')
      }

      const settings = settingsStore.getSettings()

      record.data.processing = true
      record.data.stage = 'Regenerating summary...'
      await db.updateContent(id, { data: record.data })
      broadcastQueueUpdate()

      const res = await fetch(`${getBackendUrl()}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: record.data.original,
          options: settings.defaultOptions,
          categories: settingsStore.CATEGORIES,
        }),
      })

      if (!res.ok) throw new Error(`Backend summarize failed: ${res.statusText}`)
      const result = await res.json()

      if (!result.success) {
        throw new Error(result.error || 'Summarization failed')
      }

      record.data.category = result.category
      record.data.summaries = record.data.summaries || {}
      record.data.summaries[computeOptionKey(settings.defaultOptions)] = result.summary
      record.data.processing = false
      delete record.data.stage
      delete record.data.error

      await db.updateContent(id, { data: record.data })
      broadcastQueueUpdate()
    } catch (e) {
      console.error('[contents:regenerate] failed:', e)
      try {
        const record = await db.getContent(id)
        record.data.processing = false
        delete record.data.stage
        record.data.error = e instanceof Error ? e.message : String(e)
        await db.updateContent(id, { data: record.data })
        broadcastQueueUpdate()
      } catch (innerErr) {
        console.error('[contents:regenerate] error fallback failed:', innerErr)
      }
    }
  })

  ipcMain.handle('auth:signUp', (_event, email, password) => db.signUp(email, password))
  ipcMain.handle('auth:signIn', (_event, email, password) => db.signIn(email, password))
  ipcMain.handle('auth:signOut', () => db.signOut())
  ipcMain.handle('auth:getUser', () => db.getUser())

  ipcMain.handle('chat:get', (_event, contentId) => chatStore.getSession(contentId))
  ipcMain.handle('chat:list', () => chatStore.listSessions())
  ipcMain.handle('chat:delete', (_event, contentId) => chatStore.deleteSession(contentId))
  ipcMain.handle('chat:send', async (_event, contentId, { text, articleText }) => {
    await chatStore.appendMessage(contentId, { role: 'user', content: text, createdAt: new Date().toISOString() })

    const session = await chatStore.getSession(contentId)
    try {
      const reply = await streamChat(getBackendUrl(), articleText, session.messages, (chunk) =>
        broadcastChatEvent({ type: 'chunk', contentId, chunk })
      )
      await chatStore.appendMessage(contentId, { role: 'assistant', content: reply, createdAt: new Date().toISOString() })
      broadcastChatEvent({ type: 'done', contentId })
    } catch (e) {
      console.error('[chat:send] failed:', e)
      broadcastChatEvent({ type: 'error', contentId, error: e instanceof Error ? e.message : String(e) })
    }
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(async () => {
  const template = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' }
      ]
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  protocol.handle('appimg', imageCache.fetchImage)
  registerIpcHandlers()
  startBackend()
  try {
    db.onAuthStateChange((user) => {
      isAuthenticated = !!user
      broadcastAuthChange(user)
    })
  } catch (e) {
    console.error('[auth] failed to subscribe:', e.message)
  }
  await db.resetStuckJobs().catch((e) => console.error('[db] resetStuckJobs failed:', e.message))
  createWindow()
  watchClipboard()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  if (sidecarProcess) sidecarProcess.kill()
})
