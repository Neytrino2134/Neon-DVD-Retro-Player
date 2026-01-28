
import React, { useState, useCallback, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useSFX } from './useSFX';
import { ViewMode } from '../types';

// Animation phases for the view transition
export type AnimSequence = 
  | 'idle' 
  | 'exiting_default'   // Fade out/scale down from big mode
  | 'exiting_mini'      // Fade out/scale down from mini mode
  | 'void_layout'       // Layout mounted but hidden (preparation phase)
  | 'reveal_left'       // System panel slides in
  | 'reveal_right'      // Player panel slides in
  | 'reveal_center';    // Screen pops in

export const useViewLayout = (introState: number) => {
  const { addNotification } = useNotification();
  const { playSFX } = useSFX();

  const [viewMode, setViewMode] = useState<ViewMode>('default');
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [animSequence, setAnimSequence] = useState<AnimSequence>('idle');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const focusMode = viewMode === 'cinema';

  // Fullscreen listener
  useEffect(() => {
      const handleFullscreenChange = () => {
          setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Automatic Cinema Mode Toggle based on panels
  useEffect(() => {
    if (viewMode === 'mini') return;

    const areBothPanelsHidden = !showLeftPanel && !showRightPanel;

    if (areBothPanelsHidden && viewMode !== 'cinema') {
      setViewMode('cinema');
      if ((window as any).require) {
          const { ipcRenderer } = (window as any).require('electron');
          ipcRenderer.send('set-full-mode');
      }
      addNotification("Cinema Mode Auto-Enabled", "info");
    } else if (!areBothPanelsHidden && viewMode === 'cinema') {
      setViewMode('default');
      if ((window as any).require) {
          const { ipcRenderer } = (window as any).require('electron');
          ipcRenderer.send('set-full-mode');
      }
    }
  }, [showLeftPanel, showRightPanel, viewMode, addNotification]);

  const handleSetViewMode = useCallback(async (targetMode: ViewMode) => {
      const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
      const ipc = (window as any).require ? (window as any).require('electron').ipcRenderer : null;

      // 1. SWITCHING TO MINI MODE (Cinematic Fade Out)
      if (targetMode === 'mini' && viewMode !== 'mini') {
          playSFX('WHOOSH_IN.mp3');
          setAnimSequence('exiting_default');
          await wait(600); 

          if (ipc) ipc.send('set-mini-mode', { width: 540, height: 920 });
          
          setViewMode('mini');
          setShowLeftPanel(false);
          setShowRightPanel(true);
          
          setAnimSequence('void_layout'); 
          await wait(250); 

          setAnimSequence('idle');
      } 
      
      // 2. SWITCHING TO DEFAULT/FULL MODE (Cinematic Sequential Reveal)
      else if (targetMode === 'default' && viewMode === 'mini') {
          playSFX('WHOOSH_OUT.mp3'); // Play immediately on click
          setAnimSequence('exiting_mini');
          await wait(600); 

          if (ipc) ipc.send('set-full-mode');
          
          setViewMode('default');
          setShowLeftPanel(true);
          setShowRightPanel(true);
          setAnimSequence('void_layout');
          
          await wait(400);

          setAnimSequence('reveal_left');
          // Removed Beep
          await wait(300);

          setAnimSequence('reveal_right');
          // Removed Beep
          await wait(300);

          setAnimSequence('reveal_center');
          // Removed delayed Whoosh
          await wait(800);

          setAnimSequence('idle');
      }
      
      // 3. INSTANT TOGGLES (Cinema Mode)
      else if (targetMode === 'cinema') {
          setViewMode('cinema');
          setShowLeftPanel(false);
          setShowRightPanel(false);
          if (ipc) ipc.send('set-full-mode');
      } 
      else {
          setViewMode(targetMode);
          if (targetMode === 'default') {
              setShowLeftPanel(true);
              setShowRightPanel(true);
          }
      }
  }, [viewMode, playSFX]);

  const toggleFocusMode = useCallback((forceState?: boolean) => {
      const newState = forceState !== undefined ? forceState : !focusMode;
      if (newState) {
          handleSetViewMode('cinema');
          addNotification("Cinema Mode Active", "info");
      } else {
          handleSetViewMode('default');
          addNotification("UI Restored", "info");
      }
  }, [focusMode, addNotification, handleSetViewMode]);

  const toggleLeftPanel = useCallback(() => setShowLeftPanel(prev => !prev), []);
  const toggleRightPanel = useCallback(() => setShowRightPanel(prev => !prev), []);

  // --- RENDER STYLES CALCULATION ---
  let masterStyle: React.CSSProperties = { 
      opacity: 1, 
      transform: 'scale(1)', 
      transition: 'opacity 0.6s ease-in-out, transform 0.6s ease-in-out' 
  };

  if (animSequence === 'exiting_mini') {
      masterStyle = { opacity: 0, transform: 'scale(0.9)', transition: 'opacity 0.5s ease, transform 0.5s ease' };
  } else if (animSequence === 'exiting_default') {
      masterStyle = { opacity: 0, transform: 'scale(0.95)', transition: 'opacity 0.5s ease, transform 0.5s ease' };
  } else if (animSequence === 'void_layout') {
      masterStyle = { opacity: 0, transform: 'scale(1)', transition: 'none' };
  }

  const isLeftPanelVisible = 
      (introState >= 1) && 
      showLeftPanel && 
      viewMode !== 'mini' && 
      (animSequence === 'reveal_left' || animSequence === 'reveal_right' || animSequence === 'reveal_center' || animSequence === 'idle');

  const leftPanelClass = `shrink-0 z-20 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]
      ${!isLeftPanelVisible ? '-ml-[100%] md:-ml-[460px] opacity-0 -translate-x-10' : 'ml-0 opacity-100 translate-x-0'}
      w-full md:w-[460px] relative
  `;

  const isRightPanelVisible = 
      viewMode === 'mini' || 
      (
          introState >= 1 &&
          showRightPanel && 
          (animSequence === 'reveal_right' || animSequence === 'reveal_center' || animSequence === 'idle')
      );

  const rightPanelClass = `shrink-0 z-20 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]
      ${!isRightPanelVisible ? 'w-0 opacity-0 translate-x-10' : (viewMode === 'mini' ? 'w-full opacity-100' : 'w-full md:w-[580px] opacity-100 translate-x-0')}
  `;

  const isScreenVisible = 
      introState >= 2 && 
      viewMode !== 'mini' &&
      (animSequence === 'reveal_center' || animSequence === 'idle');

  const screenContainerClass = `flex-grow flex flex-col relative transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden
      ${!isScreenVisible ? 'scale-75 opacity-0' : 'scale-100 opacity-100'}
  `;

  return {
    viewMode,
    setViewMode: handleSetViewMode,
    showLeftPanel,
    setShowLeftPanel,
    toggleLeftPanel,
    showRightPanel,
    setShowRightPanel,
    toggleRightPanel,
    focusMode,
    toggleFocusMode,
    animSequence,
    isFullscreen,
    masterStyle,
    leftPanelClass,
    rightPanelClass,
    screenContainerClass
  };
};
