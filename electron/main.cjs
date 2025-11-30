const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Load settings for boot flags
const userDataPath = app.getPath('userData');
const settingsPath = path.join(userDataPath, 'settings.json');
let settings = { vsync: false }; // Default to VSync OFF

console.log('Loading settings from:', settingsPath);

try {
  if (fs.existsSync(settingsPath)) {
    const data = fs.readFileSync(settingsPath, 'utf8');
    settings = JSON.parse(data);
    console.log('Loaded settings:', settings);
  } else {
    console.log('Settings file not found, using defaults');
  }
} catch (e) {
  console.error('Failed to load settings for boot flags:', e);
}

// Disable background throttling to prevent FPS drops when window loses focus
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
// Force high performance GPU (Critical for unlocking FPS on some systems)
app.commandLine.appendSwitch('force_high_performance_gpu');
// Force 1:1 pixel mapping (ignore Windows scaling)
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.commandLine.appendSwitch('high-dpi-support', '1');

// VSync / FPS Unlocking Logic
if (!settings.vsync) {
  // VSync OFF: Unlock FPS
  console.log('VSync is OFF - Unlocking FPS');
  app.commandLine.appendSwitch('disable-frame-rate-limit');
  app.commandLine.appendSwitch('disable-gpu-vsync');
  app.commandLine.appendSwitch('max-gum-fps', '1000');
} else {
  // VSync ON: Default behavior (usually locked to refresh rate)
  console.log('VSync is ON - Using default behavior');
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false, // Security best practice
      contextIsolation: true, // Security best practice
      backgroundThrottling: false, // Prevent FPS drop when window is not focused
    },
  });

  // IPC Handlers
  ipcMain.handle('set-fullscreen', (event, value) => {
    mainWindow.setFullScreen(value);
  });

  ipcMain.handle('set-resolution', (event, width, height) => {
    mainWindow.setSize(width, height);
    mainWindow.center();
  });

  ipcMain.handle('get-resolution', () => {
    const [width, height] = mainWindow.getSize();
    return { width, height };
  });

  ipcMain.handle('is-fullscreen', () => {
    return mainWindow.isFullScreen();
  });

  ipcMain.handle('save-settings', (event, newSettings) => {
    try {
      console.log('Saving settings to file:', settingsPath);
      fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2));
      console.log('Settings saved successfully');
      return true;
    } catch (e) {
      console.error('Failed to save settings to file:', e);
      return false;
    }
  });

  ipcMain.handle('exit-app', () => {
    app.quit();
  });

  // Get the data folder path (relative to the app)
  const getDataPath = () => {
    if (app.isPackaged) {
      // In production, data folder is next to the executable
      return path.join(path.dirname(app.getPath('exe')), 'data');
    } else {
      // In development, data folder is in the project root
      return path.join(__dirname, '../data');
    }
  };

  // Save a single data file
  ipcMain.handle('save-data-file', async (event, filename, content) => {
    try {
      const dataPath = getDataPath();
      const filePath = path.join(dataPath, filename);
      
      // Ensure data directory exists
      if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, { recursive: true });
      }
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[Electron] Saved: ${filePath}`);
      return { success: true, path: filePath };
    } catch (error) {
      console.error(`[Electron] Failed to save ${filename}:`, error);
      return { success: false, error: error.message };
    }
  });

  // Save multiple data files at once
  ipcMain.handle('save-all-data-files', async (event, files) => {
    const results = {};
    const dataPath = getDataPath();
    
    // Ensure data directory exists
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
    }
    
    for (const [filename, content] of Object.entries(files)) {
      try {
        const filePath = path.join(dataPath, filename);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`[Electron] Saved: ${filePath}`);
        results[filename] = { success: true, path: filePath };
      } catch (error) {
        console.error(`[Electron] Failed to save ${filename}:`, error);
        results[filename] = { success: false, error: error.message };
      }
    }
    
    return results;
  });

  // Check if running in Electron
  ipcMain.handle('is-electron', () => true);

  // In development, we can load the Vite dev server.
  // In production, we load the built index.html.
  // You can toggle this based on an environment variable or argument.
  // For now, let's assume we want to load the local file for the build.
  
  // Check if we are running in dev mode
  // app.isPackaged is true when the app is built with electron-builder
  const isDev = !app.isPackaged;

  if (isDev) {
    // In dev mode, we load the Vite dev server.
    // Ensure your Vite server is running on port 3000
    mainWindow.loadURL('http://localhost:3000');
    // mainWindow.webContents.openDevTools(); // Disable auto-open devtools
  } else {
    // Load the index.html of the app.
    // We assume the build output is in the 'dist' folder at the project root.
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  
  // Remove the menu bar for a more game-like feel
  mainWindow.setMenuBarVisibility(false);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
