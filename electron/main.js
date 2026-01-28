
import { app, BrowserWindow, ipcMain, globalShortcut, desktopCapturer } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
// Default to the large size requested
let previousBounds = { width: 1700, height: 900, x: 0, y: 0 }; 

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1700, // Default to Normal Mode size
    height: 900,
    minWidth: 780, // Allow smaller for initialization, but logic below enforces specific modes
    minHeight: 900, 
    backgroundColor: '#030712', // Critical: Matches app background to hide resize flash
    title: "Neon Retro Player",
    frame: false, 
    titleBarStyle: 'hidden', 
    autoHideMenuBar: true,
    show: false, 
    icon: path.join(__dirname, '../public/NEON RETRO Player.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      devTools: true 
    },
  });

  // --- ENABLE SYSTEM AUDIO CAPTURE ---
  mainWindow.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      callback({ video: sources[0], audio: 'loopback' });
    }).catch((e) => {
      console.error(e);
      callback(null);
    });
  });

  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath).catch(e => {
        console.error('Failed to load index.html:', e);
    });
  }

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

  // --- MINI MODE RESIZING HANDLERS ---
  ipcMain.on('set-mini-mode', (event, { width, height }) => {
    if (!mainWindow) return;
    
    // 1. Save current bounds if we are currently in "Large" mode (width > 1000)
    const currentBounds = mainWindow.getBounds();
    if (!mainWindow.isMaximized() && currentBounds.width > 1000) {
        previousBounds = currentBounds;
    }
    
    // CRITICAL FIX: Reset Minimum Size BEFORE resizing to prevent "width must be > minWidth" error
    // We set it to a very small safe value temporarily.
    mainWindow.setMinimumSize(400, 600);
    
    // 2. Resize Window
    // Use integers to prevent blurry rendering
    // NOTE: width/height come from App.tsx (e.g. 540x920)
    // The third parameter 'true' enables animation on macOS
    mainWindow.setSize(Math.round(width), Math.round(height), true); 

    // 3. Set New Minimum Constraints for Mini Mode
    // Must match or be smaller than the requested size in step 2 (540)
    mainWindow.setMinimumSize(540, 920);
  });

  ipcMain.on('set-full-mode', () => {
    if (!mainWindow) return;
    
    // CRITICAL FIX: Reset constraints BEFORE resizing
    // If we are currently 540px wide (Mini), and we set minWidth to 1700px BEFORE resizing,
    // Electron might crash or throw an error because current window violates new constraint.
    mainWindow.setMinimumSize(400, 600);

    // 1. Determine restore size
    // If previous saved size is smaller than our new minimum (1700x900), force the minimum.
    const w = Math.max(1700, Math.round(previousBounds.width));
    const h = Math.max(900, Math.round(previousBounds.height));
    
    // 2. Resize Window
    mainWindow.setSize(w, h, true);
    mainWindow.center(); 

    // 3. Set Minimum Constraints for Normal Mode AFTER resize logic is processed
    mainWindow.setMinimumSize(1700, 900);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
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
