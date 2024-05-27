const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  setName: (nameData) => ipcRenderer.send("set-name", nameData),
  onNextSketch: (callback) => ipcRenderer.on("next-sketch", callback),
  onPrevSketch: (callback) => ipcRenderer.on("prev-sketch", callback),
  onSelect: (callback) => ipcRenderer.on("select", callback),
  onBack: (callback) => ipcRenderer.on("back", callback),
  onImportSketch: (callback) => ipcRenderer.on(
    "import-sketch", (_event, json) => callback(json)),
  getOpts: () => ipcRenderer.invoke("get-opts"),
  generateImportCode: () => ipcRenderer.invoke("generate-import-code"),
})
