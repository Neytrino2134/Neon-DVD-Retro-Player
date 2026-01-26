
import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Disc } from 'lucide-react';

const TitleBar: React.FC = () => {
  const [isElectron, setIsElectron] = useState(false);
  const [ipcRenderer, setIpcRenderer] = useState<any>(null);

  useEffect(() => {
    // Check if running in Electron with nodeIntegration
    if ((window as any).require) {
      try {
        const electron = (window as any).require('electron');
        setIpcRenderer(electron.ipcRenderer);
        setIsElectron(true);
      } catch (e) {
        console.log('Not running in Electron or require not defined');
      }
    }
  }, []);

  if (!isElectron) return null;

  const handleMinimize = () => ipcRenderer?.send('window-minimize');
  const handleMaximize = () => ipcRenderer?.send('window-maximize');
  const handleClose = () => ipcRenderer?.send('window-close');

  return (
    <div className="h-8 bg-theme-bg border-b border-theme-border flex items-center justify-between select-none z-[99999] w-full shrink-0">
      {/* Draggable Area */}
      <div className="flex-1 h-full flex items-center px-3 gap-2 app-drag-region">
        <Disc size={16} className="text-theme-primary animate-spin-slow" />
        <span className="text-[10px] font-mono font-bold text-theme-text tracking-widest opacity-80 pt-0.5">
          NEON RETRO PLAYER
        </span>
      </div>

      {/* Window Controls (No Drag) */}
      <div className="flex h-full app-no-drag">
        <button 
          onClick={handleMinimize}
          className="system-cursor w-10 h-full flex items-center justify-center text-theme-muted hover:bg-theme-panel hover:text-theme-text transition-colors focus:outline-none"
        >
          <Minus size={14} />
        </button>
        <button 
          onClick={handleMaximize}
          className="system-cursor w-10 h-full flex items-center justify-center text-theme-muted hover:bg-theme-panel hover:text-theme-text transition-colors focus:outline-none"
        >
          <Square size={12} />
        </button>
        <button 
          onClick={handleClose}
          className="system-cursor w-10 h-full flex items-center justify-center text-theme-muted hover:bg-red-500 hover:text-white transition-colors focus:outline-none"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
