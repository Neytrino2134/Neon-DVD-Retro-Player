
import React, { useState, useCallback, useEffect, useRef } from 'react';
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

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export const useViewLayout = (introState: number) => {
  const { addNotification } = useNotification();
  const { playSFX } = useSFX();

  const [viewMode, setViewMode] = useState<ViewMode>('default');
  
  // Visibility States
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showCenterPanel, setShowCenterPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  
  // Layout State
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('desktop');
  
  const [animSequence, setAnimSequence] = useState<AnimSequence>('idle');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Ref to block responsive resize logic during animation transitions
  const isTransitioningRef = useRef(false);

  const focusMode = viewMode === 'cinema';
  const isResizing = animSequence === 'exiting_default' || animSequence === 'exiting_mini' || animSequence === 'void_layout';

  // Fullscreen listener
  useEffect(() => {
      const handleFullscreenChange = () => {
          setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // --- SMART BREAKPOINT LOGIC ---
  // Calculates the current breakpoint based on width
  const getBreakpoint = (width: number): Breakpoint => {
      if (width < 950) return 'mobile';
      if (width < 1300) return 'tablet';
      return 'desktop';
  };

  // 1. Handle Window Resize -> Update Breakpoint
  useEffect(() => {
    const handleResize = () => {
        if (viewMode === 'cinema' || viewMode === 'mini' || isTransitioningRef.current) return;
        
        const w = window.innerWidth;
        const newBreakpoint = getBreakpoint(w);
        
        if (newBreakpoint !== currentBreakpoint) {
            setCurrentBreakpoint(newBreakpoint);
        }
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentBreakpoint, viewMode]);

  // 2. Handle Breakpoint Changes -> Apply Defaults
  useEffect(() => {
      if (viewMode !== 'default' || isTransitioningRef.current) return;

      if (currentBreakpoint === 'mobile') {
          // Mobile: Only Player by default
          setShowLeftPanel(false);
          setShowCenterPanel(false);
          setShowRightPanel(true);
      } else if (currentBreakpoint === 'tablet') {
          // Tablet: Screen + Player (Hide Left)
          setShowLeftPanel(false);
          setShowCenterPanel(true);
          setShowRightPanel(true);
      } else {
          // Desktop: Show All
          setShowLeftPanel(true);
          setShowCenterPanel(true);
          setShowRightPanel(true);
      }
  }, [currentBreakpoint, viewMode]);


  // --- MUTUAL EXCLUSION TOGGLING ---
  
  const toggleLeftPanel = useCallback(() => {
      setShowLeftPanel(prev => {
          const willShow = !prev;
          if (willShow && currentBreakpoint === 'tablet') {
              setShowRightPanel(false);
          }
          return willShow;
      });
  }, [currentBreakpoint]);

  const toggleRightPanel = useCallback(() => {
      setShowRightPanel(prev => {
          const willShow = !prev;
          if (willShow && currentBreakpoint === 'tablet') {
              setShowLeftPanel(false);
          }
          return willShow;
      });
  }, [currentBreakpoint]);


  const handleSetViewMode = useCallback(async (targetMode: ViewMode) => {
      const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
      const ipc = (window as any).require ? (window as any).require('electron').ipcRenderer : null;

      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true; // LOCK responsive logic

      try {
          // 1. SWITCHING TO MINI MODE (Compact Mode: No Left Panel, Fixed Size)
          if (targetMode === 'mini' && viewMode !== 'mini') {
              playSFX('WHOOSH_IN.mp3');
              setAnimSequence('exiting_default');
              await wait(600); 

              if (ipc) ipc.send('set-mini-mode');
              
              setViewMode('mini');
              // Mini Mode Logic: Show Screen + Player, Hide Settings
              setShowLeftPanel(false);
              setShowCenterPanel(false); // Hide center screen in true mini mode
              setShowRightPanel(true);
              
              setAnimSequence('void_layout'); 
              await wait(100); 
              
              // Reveal animation
              setAnimSequence('reveal_right');
              await wait(400);
          } 
          
          // 2. SWITCHING TO DEFAULT/FULL MODE
          else if (targetMode === 'default' && viewMode === 'mini') {
              playSFX('WHOOSH_OUT.mp3'); 
              setAnimSequence('exiting_mini');
              await wait(600); 

              if (ipc) ipc.send('set-full-mode');
              
              setViewMode('default');
              
              // Recalculate layout based on current width (which shouldn't have changed)
              const w = window.innerWidth;
              const bp = getBreakpoint(w);
              setCurrentBreakpoint(bp);

              const shouldShowLeft = bp === 'desktop';
              const shouldShowCenter = bp !== 'mobile';

              setShowLeftPanel(shouldShowLeft);
              setShowCenterPanel(shouldShowCenter);
              setShowRightPanel(true);
              
              setAnimSequence('void_layout');
              await wait(200);

              if (shouldShowLeft) {
                  setAnimSequence('reveal_left');
                  await wait(200);
              }
              setAnimSequence('reveal_right');
              await wait(200);
              if (shouldShowCenter) {
                  setAnimSequence('reveal_center');
                  await wait(600);
              }
          }
          // 3. CINEMA MODE
          else if (targetMode === 'cinema') {
              setViewMode('cinema');
              setShowLeftPanel(false);
              setShowCenterPanel(true);
              setShowRightPanel(false);
              if (ipc) ipc.send('set-full-mode');
          } 
          else {
              setViewMode(targetMode);
              if (targetMode === 'default') {
                  const bp = getBreakpoint(window.innerWidth);
                  setShowLeftPanel(bp === 'desktop');
                  setShowCenterPanel(bp !== 'mobile');
                  setShowRightPanel(true);
              }
          }
      } catch (err) {
          console.error("View transition error", err);
          // Fallback to default safe state
          setViewMode('default');
          setShowLeftPanel(true);
          setShowCenterPanel(true);
          setShowRightPanel(true);
      } finally {
          setAnimSequence('idle');
          isTransitioningRef.current = false; // UNLOCK
          
          // Trigger a manual resize event to ensure Canvases update dimensions after animation
          setTimeout(() => {
              window.dispatchEvent(new Event('resize'));
          }, 100);
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

  // --- RENDER STYLES ---
  
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

  const leftPanelClass = `shrink-0 z-20 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden
      ${!isLeftPanelVisible 
          ? 'w-0 opacity-0 -translate-x-10' 
          : 'w-full md:w-[460px] opacity-100 translate-x-0'
      }
  `;

  // Right Panel is now the MAIN container for Mini Mode
  const isRightPanelVisible = 
      (viewMode === 'mini' && (animSequence === 'reveal_right' || animSequence === 'reveal_center' || animSequence === 'idle')) || 
      (
          introState >= 1 &&
          showRightPanel && 
          (animSequence === 'reveal_right' || animSequence === 'reveal_center' || animSequence === 'idle')
      );

  const rightPanelClass = `shrink-0 z-20 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden
      ${!isRightPanelVisible 
          ? 'w-0 opacity-0 translate-x-10' 
          : (viewMode === 'mini' ? 'w-full opacity-100 translate-x-0' : 'w-full md:w-[580px] opacity-100 translate-x-0')
      }
  `;

  const isScreenVisible = 
      introState >= 2 && 
      viewMode !== 'mini' && 
      showCenterPanel &&
      (animSequence === 'reveal_center' || animSequence === 'idle');

  const screenContainerClass = `flex-grow flex flex-col relative transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden
      ${!isScreenVisible ? 'w-0 opacity-0 scale-95' : 'w-auto opacity-100 scale-100'}
  `;

  return {
    viewMode,
    setViewMode: handleSetViewMode,
    showLeftPanel,
    setShowLeftPanel,
    toggleLeftPanel,
    showCenterPanel, 
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
    screenContainerClass,
    isResizing
  };
};
