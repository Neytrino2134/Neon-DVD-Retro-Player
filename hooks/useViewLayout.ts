
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useSFX } from './useSFX';
import { ViewMode } from '../types';

// Animation phases for the view transition
export type AnimSequence = 
  | 'idle' 
  | 'exiting_default'   // Fade out/scale down from big mode
  | 'exiting_mini'      // Fade out/scale down from mini mode
  | 'exiting_center'    // New: Fade out/scale down to center (generic exit)
  | 'exiting_focus'     // New: Fade out from Focus/Cinema mode
  | 'loading'           // New: Spinner state (App hidden)
  | 'entering_center'   // New: Scale up from center (generic enter)
  | 'void_layout'       // Layout mounted but hidden (preparation phase)
  | 'reveal_left'       // System panel slides in
  | 'reveal_right'      // Player panel slides in
  | 'reveal_center'     // Screen pops in
  | 'unfolding_setup'   // NEW: Prepare layout invisible/offset for smooth exit
  | 'unfolding_active'  // NEW: Smooth expansion from Cinema (slide in)
  | 'switching_layout'; // NEW: Transition lock for layout mode swapping

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export const useViewLayout = (introState: number) => {
  const { addNotification } = useNotification();
  const { playSFX } = useSFX();

  const [viewMode, setViewMode] = useState<ViewMode>('default');
  
  // Visibility States
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showCenterPanel, setShowCenterPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  
  // Resizable Panel Widths
  const [leftPanelWidth, setLeftPanelWidth] = useState(460);
  const [rightPanelWidth, setRightPanelWidth] = useState(580);
  
  // Layout State
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('desktop');
  
  const [animSequence, setAnimSequence] = useState<AnimSequence>('idle');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Ref to block responsive logic during animation transitions
  const isTransitioningRef = useRef(false);
  
  // Resizing Refs (Manual Drag Handles)
  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const isCinema = viewMode === 'cinema';
  const focusMode = isCinema;

  // Combine resizing states. 
  const isResizing = animSequence.startsWith('exiting') || 
                     animSequence === 'void_layout' || 
                     animSequence === 'loading' || 
                     animSequence === 'entering_center' ||
                     animSequence.startsWith('reveal_') ||
                     animSequence === 'unfolding_active' ||
                     animSequence === 'switching_layout' || 
                     isResizingLeft.current || 
                     isResizingRight.current;

  // Fullscreen listener
  useEffect(() => {
      const handleFullscreenChange = () => {
          setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // --- PANEL RESIZING LOGIC ---
  const handleMouseDownLeft = useCallback((e: React.MouseEvent) => {
      isResizingLeft.current = true;
      startX.current = e.clientX;
      startWidth.current = leftPanelWidth;
      // USE CUSTOM CURSOR CLASS
      document.body.classList.add('custom-cursor-col-resize');
      document.body.style.cursor = 'none'; 
      document.body.style.userSelect = 'none';
  }, [leftPanelWidth]);

  const handleMouseDownRight = useCallback((e: React.MouseEvent) => {
      isResizingRight.current = true;
      startX.current = e.clientX;
      startWidth.current = rightPanelWidth;
      // USE CUSTOM CURSOR CLASS
      document.body.classList.add('custom-cursor-col-resize');
      document.body.style.cursor = 'none';
      document.body.style.userSelect = 'none';
  }, [rightPanelWidth]);

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (isResizingLeft.current) {
              const delta = e.clientX - startX.current;
              const newWidth = Math.min(Math.max(startWidth.current + delta, 300), 800);
              setLeftPanelWidth(newWidth);
          } else if (isResizingRight.current) {
              const delta = startX.current - e.clientX; // Dragging left increases width
              const newWidth = Math.min(Math.max(startWidth.current + delta, 350), 900);
              setRightPanelWidth(newWidth);
          }
      };

      const handleMouseUp = () => {
          if (isResizingLeft.current || isResizingRight.current) {
              isResizingLeft.current = false;
              isResizingRight.current = false;
              
              // REMOVE CUSTOM CURSOR CLASS
              document.body.classList.remove('custom-cursor-col-resize');
              
              document.body.style.cursor = 'default';
              document.body.style.userSelect = 'auto';
              // Trigger window resize event to fix canvas scaling
              window.dispatchEvent(new Event('resize'));
          }
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
      };
  }, []);

  // --- SMART BREAKPOINT LOGIC ---
  const getBreakpoint = (width: number): Breakpoint => {
      if (width < 940) return 'mobile';
      if (width < 1300) return 'tablet';
      return 'desktop';
  };

  // 1. Handle Window Resize -> Update Breakpoint
  useEffect(() => {
    const handleResize = () => {
        if (viewMode === 'cinema' || viewMode === 'mini' || viewMode === 'player-focus' || isTransitioningRef.current) return;
        
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
          // Mobile: Only Player by default (Full width right panel)
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
          if (willShow && currentBreakpoint === 'tablet' && viewMode === 'default') {
              setShowRightPanel(false);
          }
          return willShow;
      });
  }, [currentBreakpoint, viewMode]);

  const toggleRightPanel = useCallback(() => {
      setShowRightPanel(prev => {
          const willShow = !prev;
          if (willShow && currentBreakpoint === 'tablet' && viewMode === 'default') {
              setShowLeftPanel(false);
          }
          return willShow;
      });
  }, [currentBreakpoint, viewMode]);


  const handleSetViewMode = useCallback(async (targetMode: ViewMode) => {
      const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
      const ipc = (window as any).require ? (window as any).require('electron').ipcRenderer : null;

      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true; // LOCK responsive logic

      try {
          // 1. SWITCHING TO MINI MODE (Zoom Out -> Dark -> Zoom In)
          if (targetMode === 'mini' && viewMode !== 'mini') {
              playSFX('WHOOSH_IN.mp3');
              // Step 1: Zoom Out current view into darkness
              setAnimSequence('exiting_center');
              await wait(600); 

              // Step 2: Dark State (Void)
              setAnimSequence('void_layout');
              
              if (ipc) ipc.send('set-mini-mode');
              
              setViewMode('mini');
              setShowLeftPanel(false);
              setShowCenterPanel(false); 
              setShowRightPanel(true);
              
              await wait(100);

              // Step 3: Zoom In new view
              setAnimSequence('entering_center'); 
              await wait(600); 
          } 
          
          // 2. RESTORING FROM MINI MODE (Fade Sequence)
          else if (targetMode === 'default' && viewMode === 'mini') {
              playSFX('WHOOSH_OUT.mp3');
              
              // Fade out Mini
              setAnimSequence('exiting_center');
              await wait(600);

              setAnimSequence('void_layout');
              if (ipc) ipc.send('set-full-mode');
              
              setViewMode('default');
              
              // Restore Layout based on screen size
              const w = window.innerWidth;
              const bp = getBreakpoint(w);
              setCurrentBreakpoint(bp);
              setShowLeftPanel(bp === 'desktop');
              setShowCenterPanel(bp !== 'mobile');
              setShowRightPanel(true);

              await wait(100);

              // Cinematic Reveal
              if (bp === 'desktop') {
                  setAnimSequence('reveal_left');
                  await wait(400);
              }
              setAnimSequence('reveal_right');
              await wait(400);
              if (bp !== 'mobile') {
                  setAnimSequence('reveal_center');
                  await wait(500);
              }
          }

          // 3. RESTORING FROM CINEMA / FOCUS (Smooth Slide In from Sides)
          else if (targetMode === 'default' && (viewMode === 'cinema' || viewMode === 'player-focus')) {
              // PREPARE LAYOUT (Invisible but present)
              // We switch to Default mode but force the panels to be translated off-screen initially
              setAnimSequence('unfolding_setup');
              setViewMode('default');
              
              if (ipc) ipc.send('set-full-mode');

              const w = window.innerWidth;
              const bp = getBreakpoint(w);
              setCurrentBreakpoint(bp);

              const shouldShowLeft = bp === 'desktop';
              const shouldShowCenter = bp !== 'mobile';
              const shouldShowRight = true;

              setShowLeftPanel(shouldShowLeft);
              setShowCenterPanel(shouldShowCenter);
              setShowRightPanel(shouldShowRight);

              // Brief wait to let React render the DOM in the 'default' layout structure
              // The 'unfolding_setup' phase will keep them visually translated out
              await wait(50);

              // ANIMATE IN
              // Now we switch to 'unfolding_active' which transitions transform to 0
              setAnimSequence('unfolding_active');
              
              // Wait for CSS transitions (0.7s)
              await wait(750);
          }

          // 4. ENTERING CINEMA MODE
          else if (targetMode === 'cinema') {
              // NO SFX HERE
              setShowLeftPanel(false);
              setShowRightPanel(false);
              await wait(700); // Wait for panels to slide out
              setAnimSequence('switching_layout');
              setViewMode('cinema');
              setShowCenterPanel(true);
              await wait(50);
              if (ipc) ipc.send('set-full-mode');
          }
          // 5. ENTERING PLAYER FOCUS
          else if (targetMode === 'player-focus') {
              // NO SFX HERE
              setViewMode('player-focus');
              setShowLeftPanel(false);
              setShowCenterPanel(false);
              setShowRightPanel(true);
              if (ipc) ipc.send('set-full-mode');
          }
          else {
              setViewMode(targetMode);
          }
      } catch (err) {
          console.error("View transition error", err);
          setViewMode('default');
          setShowLeftPanel(true);
          setShowCenterPanel(true);
          setShowRightPanel(true);
      } finally {
          if (animSequence !== 'loading') {
              setAnimSequence('idle');
          }
          isTransitioningRef.current = false; 
          
          setTimeout(() => {
              window.dispatchEvent(new Event('resize'));
          }, 100);
      }

  }, [viewMode, playSFX, animSequence]);

  // NEW EFFECT: Auto-enter Cinema Mode if both panels are manually collapsed in Default View
  useEffect(() => {
    if (viewMode === 'default' && !showLeftPanel && !showRightPanel && !isTransitioningRef.current && introState >= 2) {
       handleSetViewMode('cinema');
       addNotification("Cinema Mode Activated", "info");
    }
  }, [viewMode, showLeftPanel, showRightPanel, introState, handleSetViewMode, addNotification]);

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
      transition: isResizing ? 'none' : 'opacity 0.6s ease-in-out, transform 0.6s ease-in-out' 
  };

  // Exit/Enter Transitions
  if (animSequence === 'exiting_center' || animSequence === 'exiting_focus') {
      masterStyle = { opacity: 0, transform: 'scale(0.95)', transition: 'opacity 0.5s ease-in, transform 0.5s ease-in' };
  } else if (animSequence === 'entering_center') {
      masterStyle = { opacity: 1, transform: 'scale(1)', transition: 'opacity 0.5s ease-out, transform 0.5s ease-out' };
  } else if (animSequence === 'void_layout') {
      // Just hide everything, DOM is present but invisible
      masterStyle = { opacity: 1, transform: 'scale(1)', transition: 'none' };
  } else if (animSequence.startsWith('reveal_') || animSequence === 'unfolding_setup' || animSequence === 'unfolding_active') {
      // Master remains visible, individual panels animate
      masterStyle = { opacity: 1, transform: 'scale(1)', transition: 'none' };
  }

  // --- LEFT PANEL LOGIC ---
  const isLeftPanelVisible = 
      (introState >= 1) && 
      showLeftPanel && 
      viewMode !== 'mini' && 
      viewMode !== 'player-focus' &&
      (animSequence === 'idle' || animSequence === 'entering_center' || animSequence === 'unfolding_setup' || animSequence === 'unfolding_active' || animSequence.startsWith('reveal_'));

  let leftPanelClass = `shrink-0 z-20 overflow-hidden ${!isResizing ? 'transition-[width] duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]' : ''}`;
  let leftPanelStyle: React.CSSProperties = { width: isLeftPanelVisible ? `${leftPanelWidth}px` : '0px' };
  
  // INNER SLIDE LOGIC (DEFAULT MODE)
  let leftPanelInnerStyle: React.CSSProperties = {
      width: `${leftPanelWidth}px`,
      height: '100%',
      // Default: Slide out to left if hidden.
      transform: (!isCinema && !isLeftPanelVisible) ? 'translateX(-100%)' : 'translateX(0)',
      transition: isResizing ? 'none' : 'transform 0.7s cubic-bezier(0.25,1,0.5,1)'
  };

  // SEQUENTIAL REVEAL & UNFOLDING OVERRIDES
  if (animSequence === 'void_layout') {
      leftPanelInnerStyle.transform = 'translateX(-100%)';
      leftPanelInnerStyle.opacity = 0;
  } else if (animSequence === 'reveal_left') {
      // Animate In
      leftPanelInnerStyle.transform = 'translateX(0)';
      leftPanelInnerStyle.opacity = 1;
      leftPanelInnerStyle.transition = 'transform 0.5s cubic-bezier(0.2,0.8,0.2,1), opacity 0.5s ease-out';
  } else if (animSequence === 'reveal_right' || animSequence === 'reveal_center') {
      // Already In
      leftPanelInnerStyle.transform = 'translateX(0)';
      leftPanelInnerStyle.opacity = 1;
  } 
  // UNFOLDING LOGIC (Smooth Exit from Cinema)
  else if (animSequence === 'unfolding_setup') {
      // Step 1: Force panel to start off-screen instantly (no transition)
      // This happens while viewMode is 'default' but we haven't animated yet
      leftPanelInnerStyle.transform = 'translateX(-100%)';
      leftPanelInnerStyle.transition = 'none'; 
  } else if (animSequence === 'unfolding_active') {
      // Step 2: Animate smoothly to on-screen
      leftPanelInnerStyle.transform = 'translateX(0)';
      leftPanelInnerStyle.transition = 'transform 0.7s cubic-bezier(0.25,1,0.5,1)';
  }

  // CINEMA OVERRIDE (Left)
  if (isCinema) {
      const zIndex = 'z-50';
      const transitionClass = !isResizing ? 'transition-transform duration-500 cubic-bezier(0.2,0.8,0.2,1)' : '';
      leftPanelClass = `absolute ${zIndex} h-[calc(100%-2rem)] top-4 left-4 rounded-xl border border-theme-border shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-xl bg-black/90 overflow-hidden ${transitionClass}`;
      leftPanelStyle = { 
          width: `${leftPanelWidth}px`, 
          transform: isLeftPanelVisible ? 'translateX(0)' : 'translateX(-120%)'
      };
  }

  // --- RIGHT PANEL LOGIC ---
  const isRightPanelVisible = 
      (viewMode === 'mini' && (animSequence === 'idle' || animSequence === 'entering_center')) || 
      (viewMode === 'player-focus') ||
      (
          introState >= 1 &&
          showRightPanel && 
          (animSequence === 'idle' || animSequence === 'entering_center' || animSequence === 'unfolding_setup' || animSequence === 'unfolding_active' || animSequence.startsWith('reveal_'))
      );

  let rightPanelClass = `shrink-0 z-20 overflow-hidden ${!isResizing ? 'transition-[width] duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]' : ''}`;
  
  const isMobileOrMini = viewMode === 'mini' || viewMode === 'player-focus' || (!showCenterPanel && !showLeftPanel && currentBreakpoint === 'mobile');
  
  let rightPanelStyle: React.CSSProperties = {
      width: !isRightPanelVisible ? '0px' : (isMobileOrMini ? '100%' : `${rightPanelWidth}px`)
  };

  // INNER SLIDE LOGIC (DEFAULT MODE) - Right
  let rightPanelInnerStyle: React.CSSProperties = {
      width: isMobileOrMini ? '100%' : `${rightPanelWidth}px`,
      height: '100%',
      // Move right (100%) when hidden
      transform: (!isCinema && !isRightPanelVisible) ? 'translateX(100%)' : 'translateX(0)',
      transition: isResizing ? 'none' : 'transform 0.7s cubic-bezier(0.25,1,0.5,1)'
  };

  // SEQUENTIAL REVEAL & UNFOLDING OVERRIDES
  if (animSequence === 'void_layout' || animSequence === 'reveal_left') {
      // Hidden state
      rightPanelInnerStyle.transform = 'translateX(100%)';
      rightPanelInnerStyle.opacity = 0;
  } else if (animSequence === 'reveal_right') {
      // Animate In
      rightPanelInnerStyle.transform = 'translateX(0)';
      rightPanelInnerStyle.opacity = 1;
      rightPanelInnerStyle.transition = 'transform 0.5s cubic-bezier(0.2,0.8,0.2,1), opacity 0.5s ease-out';
  } else if (animSequence === 'reveal_center') {
      // Already In
      rightPanelInnerStyle.transform = 'translateX(0)';
      rightPanelInnerStyle.opacity = 1;
  }
  // UNFOLDING LOGIC (Smooth Exit from Cinema)
  else if (animSequence === 'unfolding_setup') {
      // Step 1: Force off-screen
      rightPanelInnerStyle.transform = 'translateX(100%)';
      rightPanelInnerStyle.transition = 'none'; 
  } else if (animSequence === 'unfolding_active') {
      // Step 2: Animate in
      rightPanelInnerStyle.transform = 'translateX(0)';
      rightPanelInnerStyle.transition = 'transform 0.7s cubic-bezier(0.25,1,0.5,1)';
  }

  // CINEMA OVERRIDE (Right)
  if (isCinema) {
      const zIndex = 'z-50';
      const transitionClass = !isResizing ? 'transition-transform duration-500 cubic-bezier(0.2,0.8,0.2,1)' : '';
      rightPanelClass = `absolute ${zIndex} h-full top-0 right-0 overflow-hidden ${transitionClass}`;
      rightPanelStyle = { 
          width: `${rightPanelWidth}px`, 
          transform: isRightPanelVisible ? 'translateX(0)' : 'translateX(100%)' 
      };
  }

  // --- CENTER PANEL LOGIC ---
  const isScreenVisible = 
      introState >= 2 && 
      viewMode !== 'mini' && 
      viewMode !== 'player-focus' &&
      showCenterPanel &&
      (animSequence === 'idle' || animSequence === 'entering_center' || animSequence === 'switching_layout' || animSequence === 'reveal_center' || animSequence === 'unfolding_setup' || animSequence === 'unfolding_active');

  let screenScale = 1;
  let screenOpacity = 1;
  
  if (animSequence === 'void_layout' || animSequence === 'reveal_left' || animSequence === 'reveal_right') {
      screenScale = 0.5; // Start small for boot sequence or mini transition
      screenOpacity = 0;
  } else if (animSequence === 'reveal_center') {
      screenScale = 1;
      screenOpacity = 1;
  }
  
  // NOTE: For 'unfolding_setup' and 'unfolding_active', we purposely keep scale 1 and opacity 1.
  // The center panel simply stays visible while side panels slide in around it.

  const screenContainerClass = `flex-grow flex flex-col relative overflow-hidden z-10
      ${!isResizing ? 'transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]' : ''}
      ${!isScreenVisible ? 'w-0 opacity-0 scale-95' : 'w-auto'}
  `;
  
  // Explicit inline styles for the reveal animation
  const screenContainerStyle = {
      opacity: !isScreenVisible ? 0 : screenOpacity,
      transform: !isScreenVisible ? 'scale(0.95)' : `scale(${screenScale})`,
      transition: (animSequence === 'reveal_center') ? 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1), opacity 0.5s ease-out' : undefined
  };

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
    leftPanelStyle,
    leftPanelInnerStyle,
    rightPanelClass,
    rightPanelStyle,
    rightPanelInnerStyle,
    screenContainerClass,
    screenContainerStyle, 
    isResizing,
    leftPanelWidth,
    rightPanelWidth,
    handleMouseDownLeft,
    handleMouseDownRight
  };
};
