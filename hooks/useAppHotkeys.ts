
import { useEffect, useRef } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import { ViewMode, RecorderConfig } from '../types';

interface UseAppHotkeysProps {
  player: any; // AudioPlayer hook return type
  config: any; // AppConfig hook return type
  focusMode: boolean;
  toggleFocusMode: (force?: boolean) => void;
  handleScheduleReload: () => void;
  stopAllSFX: () => void;
  setDevSkip: (v: boolean) => void;
  setIntroState: (v: any) => void;
  setShowTutorial: (v: boolean) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onGoHome: () => void;
  // Recording
  isRecording: boolean;
  startRecording: (config: RecorderConfig) => void;
  stopRecording: () => void;
  // System State
  introState: number;
}

export const useAppHotkeys = ({
  player,
  config,
  focusMode,
  toggleFocusMode,
  handleScheduleReload,
  stopAllSFX,
  setDevSkip,
  setIntroState,
  setShowTutorial,
  toggleLeftPanel,
  toggleRightPanel,
  viewMode,
  setViewMode,
  onGoHome,
  isRecording,
  startRecording,
  stopRecording,
  introState
}: UseAppHotkeysProps) => {
  const { addNotification } = useNotification();
  const { setTheme, setControlStyle } = useTheme();
  
  // Throttling ref for preset switching to prevent spam freeze
  const lastPresetSwitchTimeRef = useRef<number>(0);

  // Default recording config for hotkey
  const defaultRecConfig: RecorderConfig = {
      resolution: '1080p',
      fps: 60,
      videoBitrate: 8000000,
      audioBitrate: 192000
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      
      // Ctrl+Shift+R: Force System Cursor (Emergency Recovery)
      if (e.ctrlKey && e.shiftKey && (e.code === 'KeyR')) {
          e.preventDefault();
          e.stopPropagation();
          config.setCursorStyle('system');
          addNotification("DEV: SYSTEM CURSOR FORCED", "warning");
          return;
      }

      // SKIP INTRO (Allowed during startup)
      if (e.code === 'Backslash' || e.code === 'Insert') {
          setDevSkip(true);
          setIntroState(2);
          setShowTutorial(false);
          stopAllSFX();
          addNotification("DEV SKIP ACTIVATED", "warning");
          return;
      }

      // --- BLOCK OTHER HOTKEYS DURING STARTUP ---
      // introState < 2 means we are in the boot/login sequence
      if (introState < 2) return;

      if (e.code === 'Home') {
          onGoHome();
          return;
      }

      // F9: Toggle Recording
      if (e.code === 'F9') {
          e.preventDefault();
          if (isRecording) {
              stopRecording();
          } else {
              startRecording(defaultRecConfig);
              addNotification("RECORDING STARTED (1080p/60)", "success");
          }
          return;
      }

      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

      if (e.repeat) return;

      // Shift + C: Compact Mode (Desktop Only)
      if (e.code === 'KeyC' && e.shiftKey) {
          const isElectron = typeof navigator !== 'undefined' && /Electron/.test(navigator.userAgent);
          if (isElectron) {
              setViewMode(viewMode === 'mini' ? 'default' : 'mini');
          } else {
              addNotification("COMPACT MODE: DESKTOP ONLY", "warning");
          }
          return;
      }

      // P: Toggle Media Player (Right Panel)
      if (e.code === 'KeyP') {
          toggleRightPanel();
          return;
      }

      // Check for modifiers to avoid collisions with Ctrl+A, Ctrl+S, etc.
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;

      if (e.code === 'KeyA' && !hasModifier) {
          player.prevTrack();
      } else if (e.code === 'KeyS') {
          if (e.shiftKey) {
              // Shift + S: Toggle System Panel (Left Panel)
              toggleLeftPanel();
          } else if (!hasModifier) {
              // S: Stop Playback
              player.stop();
              addNotification("STOPPED", "info");
          }
      } else if (e.code === 'KeyD' && !hasModifier) {
          player.nextTrack();
      } else if (e.code === 'ArrowUp') {
          e.preventDefault();
          player.setVolume(Math.min(1, player.volume + 0.05));
      } else if (e.code === 'ArrowDown') {
          e.preventDefault();
          player.setVolume(Math.max(0, player.volume - 0.05));
      }
      else if (e.code === 'BracketLeft') { 
          const now = Date.now();
          if (now - lastPresetSwitchTimeRef.current < 500) return; 
          lastPresetSwitchTimeRef.current = now;

          if (config.savedPresets.length > 0) {
              const currentIndex = config.savedPresets.findIndex((p: any) => p.id === config.activePresetId);
              const nextIdx = currentIndex <= 0 ? config.savedPresets.length - 1 : currentIndex - 1;
              const p = config.savedPresets[nextIdx];
              config.loadPreset(p.id);
              if (p.config.theme) setTheme(p.config.theme);
              if (p.config.controlStyle) setControlStyle(p.config.controlStyle);
              addNotification(`LOADED: ${p.name}`, "success");
          }
      } else if (e.code === 'BracketRight') {
          const now = Date.now();
          if (now - lastPresetSwitchTimeRef.current < 500) return; 
          lastPresetSwitchTimeRef.current = now;

          if (config.savedPresets.length > 0) {
              const currentIndex = config.savedPresets.findIndex((p: any) => p.id === config.activePresetId);
              const nextIdx = (currentIndex + 1) % config.savedPresets.length;
              const p = config.savedPresets[nextIdx];
              config.loadPreset(p.id);
              if (p.config.theme) setTheme(p.config.theme);
              if (p.config.controlStyle) setControlStyle(p.config.controlStyle);
              addNotification(`LOADED: ${p.name}`, "success");
          }
      }
      else if (e.code === 'Space') {
        e.preventDefault();
        player.togglePlay();
      } else if (e.code === 'ArrowRight') {
        config.nextBg();
      } else if (e.code === 'ArrowLeft') {
        config.prevBg();
      } else if (e.code === 'KeyF') {
        if (e.shiftKey) {
            e.preventDefault();
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            toggleFocusMode();
        }
      } else if (e.code === 'Pause') {
        handleScheduleReload();
      } else if (e.code === 'Escape') {
        if (focusMode) {
            toggleFocusMode(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [player, config, focusMode, handleScheduleReload, toggleFocusMode, addNotification, stopAllSFX, setTheme, setControlStyle, toggleLeftPanel, toggleRightPanel, viewMode, setViewMode, onGoHome, isRecording, startRecording, stopRecording, introState]);
};
