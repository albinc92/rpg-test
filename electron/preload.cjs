const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setFullscreen: (value) => ipcRenderer.invoke('set-fullscreen', value),
  setResolution: (width, height) => ipcRenderer.invoke('set-resolution', width, height),
  getResolution: () => ipcRenderer.invoke('get-resolution'),
  isFullscreen: () => ipcRenderer.invoke('is-fullscreen')
});

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
      const element = document.getElementById(selector)
      if (element) element.innerText = text
    }
  
    for (const type of ['chrome', 'node', 'electron']) {
      replaceText(`${type}-version`, process.versions[type])
    }
  })
