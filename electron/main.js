
import { app, BrowserWindow, ipcMain, globalShortcut, desktopCapturer, dialog, powerSaveBlocker } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
// Initialize with undefined x/y to prevent crash on first restore if not set
let lastBounds = { width: 1800, height: 1000, x: undefined, y: undefined }; 

// Prevent display from sleeping during playback/recording
powerSaveBlocker.start('prevent-display-sleep');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1800, 
    height: 1000,
    // UPDATED: Lower limits to allow Mini Player
    minWidth: 340, 
    minHeight: 500,
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
      devTools: true,
      backgroundThrottling: false 
    },
  });

  // --- ENABLE SYSTEM AUDIO CAPTURE & WINDOW RECORDING ---
  mainWindow.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['window', 'screen'] }).then((sources) => {
      const appSource = sources.find(s => 
        s.name === 'Neon DVD Player' || 
        s.name === 'Neon Retro Player'
      );
      const source = appSource || sources[0];
      callback({ video: source, audio: 'loopback' });
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

  // --- MINI MODE HANDLERS ---
  ipcMain.on('set-mini-mode', () => {
    if (!mainWindow) return;
    // Store previous bounds before shrinking
    if (!mainWindow.isMaximized() && !mainWindow.isMinimized()) {
        const bounds = mainWindow.getBounds();
        // Only save if it looks like a full window (width > 500)
        if (bounds.width > 800) {
            lastBounds = bounds;
        }
    }
    // Resize to Mini Player dimensions (Fixed 800x900 as requested)
    mainWindow.setMinimumSize(800, 900);
    mainWindow.setSize(800, 900, true);
    mainWindow.setResizable(false); // Fixed size as requested ("неизменным")
  });

  ipcMain.on('set-full-mode', () => {
    if (!mainWindow) return;
    mainWindow.setResizable(true);
    mainWindow.setMinimumSize(340, 500); // Reset min limits
    
    // Restore bounds
    const { width, height, x, y } = lastBounds;
    // Ensure we don't restore to a tiny size by accident
    const targetW = Math.max(width || 1200, 800);
    const targetH = Math.max(height || 800, 600);
    
    if (x !== undefined && y !== undefined) {
        mainWindow.setBounds({ x, y, width: targetW, height: targetH }, true);
    } else {
        mainWindow.setSize(targetW, targetH, true);
        mainWindow.center();
    }
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
