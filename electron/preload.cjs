const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setFullscreen: (value) => ipcRenderer.invoke('set-fullscreen', value),
  setResolution: (width, height) => ipcRenderer.invoke('set-resolution', width, height),
  getResolution: () => ipcRenderer.invoke('get-resolution'),
  getScreenResolution: () => ipcRenderer.invoke('get-screen-resolution'),
  isFullscreen: () => ipcRenderer.invoke('is-fullscreen'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  exitApp: () => ipcRenderer.invoke('exit-app'),
  
  // Data file saving for editor
  saveDataFile: (filename, content) => ipcRenderer.invoke('save-data-file', filename, content),
  saveAllDataFiles: (files) => ipcRenderer.invoke('save-all-data-files', files),
  isElectron: () => ipcRenderer.invoke('is-electron')
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
