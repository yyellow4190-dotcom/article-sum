const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  syncSettings: (partial) => ipcRenderer.invoke('settings:sync', partial),
  listPending: () => ipcRenderer.invoke('contents:list', 'pending'),
  listApproved: () => ipcRenderer.invoke('contents:list', 'approved'),
  approve: (id) => ipcRenderer.invoke('contents:approve', id),
  discard: (id) => ipcRenderer.invoke('contents:discard', id),
  cancel: (id) => ipcRenderer.invoke('contents:cancel', id),
  onQueueUpdate: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('queue:updated', listener)
    return () => ipcRenderer.removeListener('queue:updated', listener)
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
