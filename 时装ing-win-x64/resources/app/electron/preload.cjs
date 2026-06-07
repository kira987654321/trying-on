const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('shizhuang', {
  getApiKeyStatus: () => ipcRenderer.invoke('shizhuang:get-api-key-status'),
  setApiKey: (apiKey) => ipcRenderer.invoke('shizhuang:set-api-key', apiKey),
  clearApiKey: () => ipcRenderer.invoke('shizhuang:clear-api-key'),
  generateImage: (payload) => ipcRenderer.invoke('shizhuang:generate-image', payload),
  saveDataUrl: (item) => ipcRenderer.invoke('shizhuang:save-data-url', item),
  saveDataUrls: (items) => ipcRenderer.invoke('shizhuang:save-data-urls', items),
})
