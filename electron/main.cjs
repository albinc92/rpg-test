const { app, BrowserWindow } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
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
    },
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
    mainWindow.webContents.openDevTools();
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
