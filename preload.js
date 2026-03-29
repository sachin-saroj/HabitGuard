const { contextBridge, ipcRenderer } = require('electron');

/**
 * Secure bridge between Electron main process and renderer.
 * Exposes only specific, controlled APIs to the renderer.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Export: main process asks renderer for data
  onRequestExport: (callback) => {
    ipcRenderer.on('request-export', () => callback());
  },

  // Import: main process sends imported data to renderer
  onImportData: (callback) => {
    ipcRenderer.on('import-data', (_event, data) => callback(data));
  },

  // Save export file through main process dialog
  saveExport: (jsonString) => {
    return ipcRenderer.invoke('save-export', jsonString);
  }
});
