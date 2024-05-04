const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  setName: (nameData) => ipcRenderer.send('set-name', nameData),
  onNextSketch: (callback) => ipcRenderer.on('next-sketch', callback),
  onPrevSketch: (callback) => ipcRenderer.on('prev-sketch', callback),
  onSelect: (callback) => ipcRenderer.on('select', callback),
  onBack: (callback) => ipcRenderer.on('back', callback),
  getOpts: () => ipcRenderer.invoke('get-opts'),
})
