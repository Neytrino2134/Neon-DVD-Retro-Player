
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
    
    // Set minimum constraints as requested: 770px width, 900px height
    mainWindow.setMinimumSize(770, 900);
    
    // If the window is currently smaller than the new minimums, resize it up
    const bounds = mainWindow.getBounds();
    if (bounds.width < 770 || bounds.height < 900) {
        mainWindow.setSize(Math.max(bounds.width, 770), Math.max(bounds.height, 900), true);
    }
    
    // Note: We do NOT force it to shrink if it's larger, preserving user's resize preference 
    // unless they manually resize it down.
  });

  ipcMain.on('set-full-mode', () => {
    if (!mainWindow) return;
    
    // Temporarily relax constraints to allow resizing logic
    mainWindow.setMinimumSize(770, 900);

    const currentBounds = mainWindow.getBounds();
    const targetW = 1700;
    const targetH = 900;

    // Logic: 
    // If current size < 1700x900 -> Expand to 1700x900
    // If current size >= 1700x900 -> Keep current size (do not shrink)
    const newW = Math.max(currentBounds.width, targetW);
    const newH = Math.max(currentBounds.height, targetH);
    
    // Only apply resize if dimensions actually need to change
    if (newW !== currentBounds.width || newH !== currentBounds.height) {
        mainWindow.setSize(newW, newH, true);
        mainWindow.center(); // Center only if we had to resize/expand
    }

    // Enforce strict minimum constraints for Full Mode
    mainWindow.setMinimumSize(targetW, targetH);
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
