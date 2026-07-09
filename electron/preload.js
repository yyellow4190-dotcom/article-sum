const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  syncSettings: (partial) => ipcRenderer.invoke('settings:sync', partial),
  listPending: () => ipcRenderer.invoke('contents:list', 'pending'),
  listApproved: () => ipcRenderer.invoke('contents:list', 'approved'),
  processUrl: (url) => ipcRenderer.invoke('contents:process-url', url),
  approve: (id) => ipcRenderer.invoke('contents:approve', id),
  discard: (id) => ipcRenderer.invoke('contents:discard', id),
  cancel: (id) => ipcRenderer.invoke('contents:cancel', id),
  regenerate: (id) => ipcRenderer.invoke('contents:regenerate', id),
  getRelated: (id) => ipcRenderer.invoke('contents:related', id),
  onQueueUpdate: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('queue:updated', listener)
    return () => ipcRenderer.removeListener('queue:updated', listener)
  },
  authSignUp: (email, password) => ipcRenderer.invoke('auth:signUp', email, password),
  authSignIn: (email, password) => ipcRenderer.invoke('auth:signIn', email, password),
  authSignOut: () => ipcRenderer.invoke('auth:signOut'),
  authGetUser: () => ipcRenderer.invoke('auth:getUser'),
  onAuthChange: (callback) => {
    const listener = (_event, user) => callback(user)
    ipcRenderer.on('auth:changed', listener)
    return () => ipcRenderer.removeListener('auth:changed', listener)
  },
  chatGetSession: (contentId) => ipcRenderer.invoke('chat:get', contentId),
  chatListSessions: () => ipcRenderer.invoke('chat:list'),
  chatDeleteSession: (contentId) => ipcRenderer.invoke('chat:delete', contentId),
  chatSend: (contentId, payload) => ipcRenderer.invoke('chat:send', contentId, payload),
  onChatEvent: (callback) => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('chat:event', listener)
    return () => ipcRenderer.removeListener('chat:event', listener)
  },
})
