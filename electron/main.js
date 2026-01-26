import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#030712', // Match the app bg color to prevent white flash
    title: "Neon Retro Player",
    autoHideMenuBar: true, // Hide the default menu bar for immersion
    icon: path.join(__dirname, '../public/icon.ico'), // Ensure you have an icon or remove this line
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // Allows loading local files easily in dev
    },
  });

  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

  if (isDev) {
    // In development, load the Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools optionally
    // mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built index.html
    // We go up one level from 'electron/' to root, then into 'dist/'
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
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