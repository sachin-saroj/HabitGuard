const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1400,
    minHeight: 900,
    title: 'HabitGuard',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#F5F7FA',
    show: false
  });

  mainWindow.loadFile('src/index.html');

  // Smooth show after content is ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  buildApplicationMenu();
}

/**
 * Builds the application menu with File > Export/Import
 */
function buildApplicationMenu() {
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Export Data…',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: handleExportData
        },
        {
          label: 'Import Data…',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: handleImportData
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
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
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: `HabitGuard v${app.getVersion()}`,
          enabled: false
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

/**
 * Handle export: ask renderer for data, then save to file
 */
async function handleExportData() {
  mainWindow.webContents.send('request-export');
}

/**
 * Handle import: open file dialog, read JSON, send to renderer
 */
async function handleImportData() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import HabitGuard Data',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const data = fs.readFileSync(result.filePaths[0], 'utf-8');
      const parsed = JSON.parse(data);
      mainWindow.webContents.send('import-data', parsed);
    } catch (err) {
      dialog.showErrorBox('Import Error', 'The selected file is not valid HabitGuard data.');
    }
  }
}

// IPC: Renderer requests to save export file
ipcMain.handle('save-export', async (event, jsonString) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export HabitGuard Data',
    defaultPath: `habitguard-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, jsonString, 'utf-8');
    return { success: true, path: result.filePath };
  }
  return { success: false };
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
