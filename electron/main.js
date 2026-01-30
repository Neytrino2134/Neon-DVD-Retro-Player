
import { app, BrowserWindow, ipcMain, globalShortcut, desktopCapturer, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1700, // Default to Normal Mode size
    height: 900,
    minWidth: 770, // Updated to 770 to match new mini-mode constraint
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

  // --- RECORDING HANDLER ---
  // Note: We removed setDisplayMediaRequestHandler to allow the renderer process
  // to select specific screen sources using desktopCapturer and getUserMedia.

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
    
    // Temporarily relax constraints to allow shrinking
    mainWindow.setMinimumSize(1, 1);
    
    // Resize
    mainWindow.setSize(width, height, true);
    
    // We don't enforce strict min size here immediately to allow fluid transition,
    // or we set it to the mini dimensions.
    mainWindow.setMinimumSize(width, height);
  });

  ipcMain.on('set-full-mode', () => {
    if (!mainWindow) return;
    
    // 1. CRITICAL FIX: Relax constraints completely BEFORE resizing.
    // Setting minWidth to 770 while window is 540 causes conflict/freeze on some systems.
    mainWindow.setMinimumSize(1, 1);

    const currentBounds = mainWindow.getBounds();
    const targetW = 1700;
    const targetH = 900;

    // Logic: Expand to default if smaller, otherwise keep current size
    const newW = Math.max(currentBounds.width, targetW);
    const newH = Math.max(currentBounds.height, targetH);
    
    // 2. Resize
    if (newW !== currentBounds.width || newH !== currentBounds.height) {
        mainWindow.setSize(newW, newH, true); // true = animate (system dependent)
        mainWindow.center();
    }

    // 3. Re-apply constraints AFTER resize is initiated
    // Used a small timeout to ensure the OS window manager has processed the size change
    setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setMinimumSize(770, 900);
        }
    }, 100);
  });

  // --- RECORDING SAVE HANDLER ---
  ipcMain.handle('save-recording', async (event, buffer) => {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      buttonLabel: 'Save Recording',
      defaultPath: `Neon_Recording_${Date.now()}.webm`,
      filters: [{ name: 'WebM Video', extensions: ['webm'] }]
    });

    if (filePath) {
      await fs.writeFile(filePath, Buffer.from(buffer));
      return { success: true, filePath };
    }
    return { canceled: true };
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