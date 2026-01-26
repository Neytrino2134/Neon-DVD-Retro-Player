
import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, // Default comfortable size
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#030712', // Match the app background color to prevent white flash
    title: "Neon Retro Player",
    frame: false, // DISABLE STANDARD WINDOWS FRAME
    titleBarStyle: 'hidden', // Clean look on macOS
    autoHideMenuBar: true,
    show: false, // Don't show immediately to prevent flickering
    // Point to the new custom icon in the public folder
    icon: path.join(__dirname, '../public/NEON RETRO Player.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      devTools: true // Ensure DevTools can be opened
    },
  });

  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production, load the built index.html
    // Using relative path based on where main.js is located in the ASAR archive
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath).catch(e => {
        console.error('Failed to load index.html:', e);
    });
  }

  // Show window when ready to prevent visual flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // --- IPC HANDLERS FOR CUSTOM TITLE BAR ---
  ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    mainWindow.close();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Register F12 to open DevTools even in production (helpful for debugging blank screens)
  globalShortcut.register('F12', () => {
      if (mainWindow) mainWindow.webContents.toggleDevTools();
  });
  globalShortcut.register('CommandOrControl+Shift+I', () => {
      if (mainWindow) mainWindow.webContents.toggleDevTools();
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
