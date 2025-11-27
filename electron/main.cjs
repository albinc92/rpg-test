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
  // We don't need to explicitly enable VSync as it's the default behavior.
  // Passing 'enable-gpu-vsync' can sometimes cause crashes on certain drivers/Electron versions.
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
