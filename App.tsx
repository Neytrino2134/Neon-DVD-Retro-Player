
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import SettingsPanel from './components/settings/SettingsPanel';
import Controls from './components/Controls';
import RetroScreen from './components/RetroScreen';
import CustomCursor from './components/CustomCursor';
import ContextMenu from './components/ContextMenu';
import StartupOverlay from './components/StartupOverlay';
import ShutdownOverlay from './components/ShutdownOverlay';
import TitleBar from './components/TitleBar'; 
import TutorialOverlay from './components/TutorialOverlay'; 
import CollapseTab from './components/ui/CollapseTab'; 
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useAppConfig } from './hooks/useAppConfig';
import { useSFX } from './hooks/useSFX';
import { useAmbience } from './hooks/useAmbience'; 
import { useScreenCapture } from './hooks/useScreenCapture'; 
import { useAppHotkeys } from './hooks/useAppHotkeys'; 
import { ViewMode } from './types';

// Animation phases for the view transition
type AnimSequence = 
  | 'idle' 
  | 'exiting_default'   // Fade out/scale down from big mode
  | 'exiting_mini'      // Fade out/scale down from mini mode
  | 'void_layout'       // Layout mounted but hidden (preparation phase)
  | 'reveal_left'       // System panel slides in
  | 'reveal_right'      // Player panel slides in
  | 'reveal_center';    // Screen pops in

function AppContent() {
  // Panel States
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  
  // VIEW MODE STATE: 'default' | 'cinema' | 'mini'
  const [viewMode, setViewMode] = useState<ViewMode>('default');
  
  // Animation Sequence State
  const [animSequence, setAnimSequence] = useState<AnimSequence>('idle');
  
  // Helper to sync legacy focusMode with new viewMode
  const focusMode = viewMode === 'cinema';

  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false); 
  const appContainerRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotification();
  const { currentTheme, setTheme, controlStyle, setControlStyle } = useTheme();
  
  // Reload State Logic
  const [rebootPhase, setRebootPhase] = useState<'idle' | 'waiting' | 'active'>('idle');
  
  // Intro Animation Sequence State
  const [introState, setIntroState] = useState<0 | 1 | 2>(0);
  
  // Developer Skip State
  const [devSkip, setDevSkip] = useState(false);
  
  // Track if we have already done the initial boot notification
  const hasBootedRef = useRef(false);
  
  // Key to force remount of StartupOverlay
  const [startupKey, setStartupKey] = useState(0);

  // Tutorial State
  const [showTutorial, setShowTutorial] = useState(false);

  // Screen Capture States
  const [screenVideo, setScreenVideo] = useState<MediaStream | null>(null);
  const [sysAudioVolume, setSysAudioVolume] = useState(1);
  const [sysAudioMonitor, setSysAudioMonitor] = useState(false);

  // Custom Hooks
  const player = useAudioPlayer();
  const config = useAppConfig();
  const { playSFX, handleZipUpload, stopAllSFX, sfxMap } = useSFX();
  const ambience = useAmbience(); 
  
  // Initialize Screen Capture
  const screenCapture = useScreenCapture({
      onVideoStream: (stream: MediaStream | null) => setScreenVideo(stream),
      onAudioStream: (stream: MediaStream) => player.connectAuxSource(stream)
  });

  // Effects to update audio levels
  useEffect(() => {
      player.updateAuxVolume(sysAudioVolume);
  }, [sysAudioVolume, player]);

  useEffect(() => {
      player.updateAuxMonitor(sysAudioMonitor);
  }, [sysAudioMonitor, player]);

  // --- AUTOMATIC CINEMA MODE TOGGLE ---
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

  // --- VIEW MODE TRANSITION LOGIC ---
  const handleSetViewMode = useCallback(async (targetMode: ViewMode) => {
      const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
      const ipc = (window as any).require ? (window as any).require('electron').ipcRenderer : null;

      // 1. SWITCHING TO MINI MODE (Cinematic Fade Out)
      if (targetMode === 'mini' && viewMode !== 'mini') {
          // A. Fade Out "Into the Depths"
          setAnimSequence('exiting_default');
          await wait(600); // Wait for CSS transition (scale down + opacity 0)

          // B. Resize Window
          if (ipc) ipc.send('set-mini-mode', { width: 540, height: 920 });
          
          // C. Change Layout State (Hidden)
          setViewMode('mini');
          setShowLeftPanel(false);
          setShowRightPanel(true);
          
          // D. Prepare Mini Layout (Void phase to ensure mounting happens before reveal)
          setAnimSequence('void_layout'); 
          await wait(250); // Wait slightly for Electron resize to stabilize

          // E. Fade In Mini
          setAnimSequence('idle');
      } 
      
      // 2. SWITCHING TO DEFAULT/FULL MODE (Cinematic Sequential Reveal)
      else if (targetMode === 'default' && viewMode === 'mini') {
          // A. Mini Player "Sinks" into darkness
          setAnimSequence('exiting_mini');
          await wait(600); 

          // B. Resize Window to Large
          if (ipc) ipc.send('set-full-mode');
          
          // C. Mount Full Layout but KEEP HIDDEN (Void State)
          // This allows React to mount the Left/Right/Center panels into the DOM
          // so they are ready to slide in.
          setViewMode('default');
          setShowLeftPanel(true);
          setShowRightPanel(true);
          setAnimSequence('void_layout');
          
          // Wait for Electron resize to stabilize and React to mount DOM
          await wait(400);

          // D. SEQUENCE REVEAL
          // 1. Left Panel Slide
          setAnimSequence('reveal_left');
          playSFX('Boing_0.mp3'); 
          await wait(300);

          // 2. Right Panel Slide
          setAnimSequence('reveal_right');
          playSFX('Boing_0.mp3');
          await wait(300);

          // 3. Center Screen Pop
          setAnimSequence('reveal_center');
          playSFX('Binary_Code_Sound_Effects_Start.mp3'); 
          await wait(800);

          // E. Finish
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
          // Standard restore from Cinema
          setViewMode(targetMode);
          if (targetMode === 'default') {
              setShowLeftPanel(true);
              setShowRightPanel(true);
          }
      }
  }, [viewMode, playSFX]);

  // Helper to toggle Focus Mode
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

  const toggleLeftPanelHandler = useCallback(() => setShowLeftPanel(prev => !prev), []);
  const toggleRightPanelHandler = useCallback(() => setShowRightPanel(prev => !prev), []);

  const handleScheduleReload = useCallback(() => {
    if (rebootPhase !== 'idle') {
        setRebootPhase('idle');
        addNotification("Reboot Cancelled", "info");
        return;
    }
    if (player.isPlaying && Number.isFinite(player.duration) && player.duration > player.currentTime) {
        setRebootPhase('waiting');
        addNotification("Reboot scheduled after track", "warning");
    } else {
        setRebootPhase('active');
        player.setIsPlaying(false);
    }
  }, [rebootPhase, player, addNotification]);

  useAppHotkeys({
    player,
    config,
    focusMode,
    toggleFocusMode,
    handleScheduleReload,
    stopAllSFX,
    setDevSkip,
    setIntroState,
    setShowTutorial,
    toggleLeftPanel: toggleLeftPanelHandler,
    toggleRightPanel: toggleRightPanelHandler,
    viewMode,
    setViewMode: handleSetViewMode
  });

  const handleOverlayFadeOut = () => {
      setIntroState(2);
  };

  const handleBootComplete = () => {
      const tutorialDone = localStorage.getItem('neon_tutorial_complete');
      if (!tutorialDone) {
          setTimeout(() => setShowTutorial(true), 500);
      }

      if (!hasBootedRef.current) {
          hasBootedRef.current = true;
          setTimeout(() => {
              addNotification("SYSTEM ONLINE", "success");
          }, 500);
      }
  };

  const handleTutorialComplete = () => {
      setShowTutorial(false);
      localStorage.setItem('neon_tutorial_complete', 'true');
      addNotification("TUTORIAL COMPLETE", "success");
  };

  const handleGoHome = () => {
      player.stop();
      setIntroState(0);
      setStartupKey(prev => prev + 1); 
      handleSetViewMode('default'); 
      setDevSkip(false); 
  };
  
  const handlePlayRebootSfx = useCallback(() => {
      playSFX('Binary_Code_Sound_Effects_Reboot.mp3');
  }, [playSFX]);

  const handleResetDefault = () => {
      const defaults = config.resetDefaultPreset();
      config.setVisualizerConfig(defaults.visualizerConfig);
      if (defaults.reactorConfig && config.setReactorConfig) config.setReactorConfig(defaults.reactorConfig);
      config.setDvdConfig(defaults.dvdConfig);
      config.setEffectsConfig(defaults.effectsConfig);
      config.setMarqueeConfig(defaults.marqueeConfig);
      if (defaults.watermarkConfig && config.setWatermarkConfig) config.setWatermarkConfig(defaults.watermarkConfig);
      config.setBgColor(defaults.bgColor);
      config.setBgPattern(defaults.bgPattern);
      config.setBgPatternConfig(defaults.bgPatternConfig);
      config.setShowVisualizer(defaults.showVisualizer);
      if (config.setShowVisualizer3D && defaults.showVisualizer3D !== undefined) config.setShowVisualizer3D(defaults.showVisualizer3D);
      config.setShowDvd(defaults.showDvd);
      config.setBgAutoplayInterval(defaults.bgAutoplayInterval);
      if (defaults.cursorStyle) config.setCursorStyle(defaults.cursorStyle);
      if (defaults.bgTransition) config.setBgTransition(defaults.bgTransition);
      if (defaults.theme) setTheme(defaults.theme);
      if (defaults.controlStyle) setControlStyle(defaults.controlStyle);
      addNotification("System Reset to Factory", "success");
  };

  useEffect(() => {
      const handleFullscreenChange = () => {
          setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Drag and Drop Logic
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.dataTransfer.types.includes('Files')) return;
    const target = e.target as HTMLElement;
    if (target.closest('#tutorial-player')) {
        if (isDragging) setIsDragging(false);
        return;
    }
    if (!isDragging) setIsDragging(true);
  };

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.dataTransfer.types.includes('Files')) return;
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (appContainerRef.current) {
        const related = e.relatedTarget as Node;
        const isOutsideApp = !appContainerRef.current.contains(related);
        const isInsideControls = related && (related as Element).closest('#tutorial-player');
        if (isOutsideApp || isInsideControls) {
            setIsDragging(false);
        }
    }
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files) as File[];
    if (droppedFiles.length === 0) return;

    const nrpFiles = droppedFiles.filter(f => f.name.toLowerCase().endsWith('.nrp'));
    if (nrpFiles.length > 0) {
      config.importConfig(nrpFiles[0], (loadedConfig: any) => {
          if (loadedConfig.theme) setTheme(loadedConfig.theme);
          if (loadedConfig.controlStyle) setControlStyle(loadedConfig.controlStyle);
      });
      addNotification("Configuration Loaded", "success");
    }

    const audioFiles = droppedFiles.filter(f => f.type.startsWith('audio/'));
    const mediaFiles = droppedFiles.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    const zipFiles = droppedFiles.filter(f => f.name.toLowerCase().endsWith('.zip'));

    if (audioFiles.length > 0) {
        await player.processAudioFiles(audioFiles);
        addNotification(`${audioFiles.length} tracks added`, "success");
    }
    if (mediaFiles.length > 0) {
        await config.handleBgUpload(mediaFiles);
        addNotification(`${mediaFiles.length} backgrounds added`, "success");
    }
    if (zipFiles.length > 0) {
        await handleZipUpload(zipFiles[0]);
    }
  };

  const handleFilesSelected = async (fileList: FileList) => {
    await player.processAudioFiles(Array.from(fileList));
    addNotification(`${fileList.length} tracks added`, "success");
  };

  const handleTrackEnded = () => {
    if (rebootPhase === 'waiting') {
        player.setIsPlaying(false);
        setRebootPhase('active');
    } else {
        player.nextTrack();
    }
  };

  const handleTimeUpdate = (e: any) => {
      const preventAutoMix = rebootPhase === 'waiting';
      player.handleTimeUpdate(e, preventAutoMix);
  };

  const playbackPercentage = (player.duration > 0) ? (player.currentTime / player.duration) * 100 : 0;

  // --- STYLING LOGIC FOR TRANSITIONS ---
  
  // 1. Master Container (Handles global fades/scales for exits)
  // When exiting_mini: Scale down, Fade Out.
  // When exiting_default: Fade Out.
  // When void_layout: Ensure transparency but mounted.
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
      masterStyle = { opacity: 0, transform: 'scale(1)', transition: 'none' }; // Force invisible during resize
  }

  // 2. Left Panel Animation Logic
  // - Hidden if intro not done.
  // - Hidden if user collapsed it manually (!showLeftPanel).
  // - Hidden if in Mini Mode.
  // - ANIMATION: Hidden during 'void_layout', reveals during 'reveal_left' and subsequent phases.
  // - When revealing: Slide from Left (-100%) to 0.
  const isLeftPanelVisible = 
      (introState >= 1) && 
      showLeftPanel && 
      viewMode !== 'mini' && 
      (animSequence === 'reveal_left' || animSequence === 'reveal_right' || animSequence === 'reveal_center' || animSequence === 'idle');

  const leftPanelClass = `shrink-0 z-20 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]
      ${!isLeftPanelVisible ? '-ml-[100%] md:-ml-[460px] opacity-0 -translate-x-10' : 'ml-0 opacity-100 translate-x-0'}
      w-full md:w-[460px]
  `;

  // 3. Right Panel Animation Logic
  // - Always visible in Mini Mode (but contained differently).
  // - In Default Mode: Visible if user enabled (!showRightPanel) AND sequence reached 'reveal_right'.
  // - When revealing: Slide from Right (collapsed width 0) to full width.
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

  // 4. Center Screen Animation Logic
  // - Hidden during 'void_layout', 'reveal_left', 'reveal_right'.
  // - Pops in during 'reveal_center'.
  // - Uses Scale Up effect.
  const isScreenVisible = 
      introState >= 2 && 
      viewMode !== 'mini' &&
      (animSequence === 'reveal_center' || animSequence === 'idle');

  const screenContainerClass = `flex-grow flex flex-col relative transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden
      ${!isScreenVisible ? 'scale-75 opacity-0' : 'scale-100 opacity-100'}
  `;

  return (
    <div 
      ref={appContainerRef}
      className="flex flex-col h-screen w-full bg-theme-bg text-theme-text overflow-hidden relative"
      style={masterStyle}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {!isFullscreen && (
          <TitleBar 
            viewMode={viewMode} 
            onRestore={() => handleSetViewMode('default')}
            currentTrack={player.currentTrack} 
          />
      )}

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <CustomCursor style={introState < 2 ? 'dos-terminal' : config.cursorStyle} />
        
        <StartupOverlay 
          key={startupKey}
          onFadeOut={handleOverlayFadeOut}
          onComplete={handleBootComplete} 
          onPlaySfx={playSFX} 
          onStopSfx={stopAllSFX}
          apiKey={config.apiKey}
          setApiKey={config.setApiKey}
          forceSkip={devSkip} 
        />
        <ShutdownOverlay 
          active={rebootPhase === 'active'} 
          onPlayRebootSfx={handlePlayRebootSfx}
          onCancel={() => {
              setRebootPhase('idle');
              stopAllSFX();
              addNotification("Reboot Cancelled", "info");
          }} 
        />
        
        {showTutorial && !devSkip && (
            <TutorialOverlay 
                onComplete={handleTutorialComplete}
                trackCount={player.tracks.length}
                isPlaying={player.isPlaying}
                visualizerConfig={config.visualizerConfig}
                setVisualizerConfig={config.setVisualizerConfig}
                setShowVisualizer={config.setShowVisualizer}
                isSettingsOpen={showLeftPanel}
                presetsCount={config.savedPresets.length}
            />
        )}
        
        <audio ref={player.audioRefA} onEnded={player.activeDeck === 'A' ? handleTrackEnded : undefined} onTimeUpdate={player.activeDeck === 'A' ? handleTimeUpdate : undefined} onLoadedMetadata={player.activeDeck === 'A' ? handleTimeUpdate : undefined} onPlay={player.onAudioPlay} onPause={player.onAudioPause} crossOrigin="anonymous" />
        <audio ref={player.audioRefB} onEnded={player.activeDeck === 'B' ? handleTrackEnded : undefined} onTimeUpdate={player.activeDeck === 'B' ? handleTimeUpdate : undefined} onLoadedMetadata={player.activeDeck === 'B' ? handleTimeUpdate : undefined} onPlay={player.onAudioPlay} onPause={player.onAudioPause} crossOrigin="anonymous" />
        
        {/* Settings Panel (Left) - Only renders if not mini mode */}
        {viewMode !== 'mini' && (
        <div className={leftPanelClass}>
          <div className="w-full h-full">
             <SettingsPanel 
               showVisualizer={config.showVisualizer} setShowVisualizer={config.setShowVisualizer}
               showVisualizer3D={config.showVisualizer3D} setShowVisualizer3D={config.setShowVisualizer3D}
               showDvd={config.showDvd} setShowDvd={config.setShowDvd}
               marqueeConfig={config.marqueeConfig} setMarqueeConfig={config.setMarqueeConfig}
               visualizerConfig={config.visualizerConfig} setVisualizerConfig={config.setVisualizerConfig}
               reactorConfig={config.reactorConfig} setReactorConfig={config.setReactorConfig} 
               dvdConfig={config.dvdConfig} setDvdConfig={config.setDvdConfig}
               effectsConfig={config.effectsConfig} setEffectsConfig={config.setEffectsConfig}
               watermarkConfig={config.watermarkConfig} setWatermarkConfig={config.setWatermarkConfig}
               bgColor={config.bgColor} setBgColor={config.setBgColor}
               bgPattern={config.bgPattern} setBgPattern={config.setBgPattern}
               bgPatternConfig={config.bgPatternConfig} setBgPatternConfig={config.setBgPatternConfig}
               onBgMediaUpload={(f: FileList) => { config.handleBgUpload(f); addNotification(`${f.length} backgrounds added`, "success"); }} 
               bgMedia={config.bgMedia} 
               bgList={config.bgList}
               currentBgIndex={config.currentBgIndex}
               onRemoveBg={config.removeBg}
               onMoveBg={config.moveBg}
               onSelectBg={config.selectBg}
               onDeselectBg={config.deselectBg}
               onClearBgMedia={config.handleClearBg}
               onExportConfig={() => config.exportConfig(currentTheme, controlStyle)}
               bgAutoplayInterval={config.bgAutoplayInterval}
               setBgAutoplayInterval={config.setBgAutoplayInterval}
               onScheduleReload={handleScheduleReload}
               onGoHome={handleGoHome}
               onAudioUpload={handleFilesSelected}
               crossfadeDuration={player.crossfadeDuration}
               setCrossfadeDuration={player.setCrossfadeDuration}
               savedPresets={config.savedPresets}
               activePresetId={config.activePresetId}
               savePreset={(n: string) => { config.savePreset(n, currentTheme, controlStyle); addNotification(`Preset "${n}" saved`, "success"); }}
               overwritePreset={config.overwritePreset}
               loadPreset={(id: string) => { 
                   const loaded = config.loadPreset(id); 
                   if (loaded) {
                       if (loaded.theme) setTheme(loaded.theme);
                       if (loaded.controlStyle) setControlStyle(loaded.controlStyle);
                       if (loaded.ambienceConfig) ambience.importConfig(loaded.ambienceConfig);
                       addNotification("Preset loaded", "success"); 
                   }
               }}
               deletePreset={config.deletePreset}
               renamePreset={config.renamePreset}
               onResetDefault={handleResetDefault} 
               onSfxUpload={handleZipUpload}
               sfxMap={sfxMap}
               cursorStyle={config.cursorStyle}
               setCursorStyle={config.setCursorStyle}
               apiKey={config.apiKey}
               setApiKey={config.setApiKey}
               bgTransition={config.bgTransition}
               setBgTransition={config.setBgTransition}
               onRestartTutorial={() => setShowTutorial(true)}
               ambienceFiles={ambience.files}
               ambienceConfig={ambience.config}
               onAmbienceUpload={ambience.handleUpload}
               onAmbienceDelete={ambience.handleDelete}
               onAmbienceSetActive={ambience.setActive}
               onAmbienceTogglePlay={ambience.togglePlay}
               onAmbienceVolume={ambience.setVolume}
               isVideoActive={screenCapture.isVideoActive}
               toggleVideo={screenCapture.toggleVideoCapture}
               isAudioActive={screenCapture.isAudioActive}
               toggleAudio={screenCapture.toggleAudioCapture}
               audioVolume={sysAudioVolume}
               setAudioVolume={setSysAudioVolume}
               isMonitoring={sysAudioMonitor}
               setMonitoring={setSysAudioMonitor}
             />
          </div>
        </div>
        )}

        {/* Main Screen (Center) - Only renders if not mini mode */}
        {viewMode !== 'mini' && (
        <div 
          id="tutorial-screen"
          className={screenContainerClass}
        >
            {/* Collapse Tongues - Only show if idle/active */}
            {introState >= 2 && animSequence === 'idle' && (
              <>
                <CollapseTab side="left" isOpen={showLeftPanel} onClick={() => setShowLeftPanel(!showLeftPanel)} />
                <CollapseTab side="right" isOpen={showRightPanel} onClick={() => setShowRightPanel(!showRightPanel)} />
              </>
            )}

            <RetroScreen 
              {...{ reactorConfig: config.reactorConfig, setReactorConfig: config.setReactorConfig }} 
              analyser={player.analyser}
              isPlaying={player.isPlaying || screenCapture.isAudioActive} 
              currentTrack={player.currentTrack}
              tracks={player.tracks}
              onTrackSelect={player.selectTrack}
              bgMedia={config.bgMedia}
              bgColor={config.bgColor}
              bgPattern={config.bgPattern}
              bgPatternConfig={config.bgPatternConfig}
              videoStream={screenVideo}
              visualizerConfig={config.visualizerConfig}
              setVisualizerConfig={config.setVisualizerConfig} 
              showVisualizer={config.showVisualizer}
              showVisualizer3D={config.showVisualizer3D} 
              dvdConfig={config.dvdConfig}
              showDvd={config.showDvd}
              effectsConfig={config.effectsConfig}
              marqueeConfig={config.marqueeConfig}
              watermarkConfig={config.watermarkConfig}
              progress={playbackPercentage}
              focusMode={focusMode}
              setFocusMode={(v: boolean) => toggleFocusMode(v)}
              isDragging={isDragging}
              onDragOver={onDragOver}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onScheduleReload={handleScheduleReload}
              rebootPhase={rebootPhase}
              currentTime={player.currentTime}
              duration={player.duration}
              onPlaySfx={playSFX}
              volume={screenCapture.isAudioActive ? 1 : player.volume}
              apiKey={config.apiKey}
            />
        </div>
        )}
        
        {/* Controls Panel (Right) - Always visible (but styles change) */}
        <div className={rightPanelClass}>
          <div className={`w-full h-full ${viewMode === 'mini' ? '' : 'md:w-[580px]'}`}>
              <Controls 
                viewMode={viewMode}
                onToggleMiniMode={() => handleSetViewMode(viewMode === 'mini' ? 'default' : 'mini')}
                tracks={player.tracks} 
                playlists={player.playlists}
                activePlaylistId={player.activePlaylistId}
                playingPlaylistId={player.playingPlaylistId}
                currentTrackIndex={player.currentTrackIndex} 
                currentTrack={player.currentTrack}
                isPlaying={player.isPlaying} 
                volume={player.volume} 
                currentTime={player.currentTime}
                duration={player.duration}
                onVolumeChange={player.setVolume} 
                onSeek={player.seek}
                onPlay={player.togglePlay} 
                onPause={player.togglePlay} 
                onStop={player.stop} 
                onNext={player.nextTrack} 
                onPrev={player.prevTrack} 
                onTrackSelect={player.selectTrack} 
                onFilesSelected={handleFilesSelected}
                onFilesInserted={player.insertAudioFiles}
                onClearPlaylist={() => { player.clearPlaylist(); addNotification("Playlist cleared", "warning"); }}
                onSort={() => { player.sortTracks(); addNotification("Playlist sorted A-Z", "info"); }}
                onShuffle={() => { player.shuffleTracks(); addNotification("Playlist shuffled", "info"); }}
                onAddPlaylist={player.addPlaylist}
                onRemovePlaylist={player.removePlaylist}
                onRenamePlaylist={player.renamePlaylist}
                onSwitchPlaylist={player.switchPlaylist}
                onReorderPlaylists={player.reorderPlaylists}
                removeTracks={player.removeTracks}
                reorderTracks={player.reorderTracks}
                moveTracksToPlaylist={player.moveTracksToPlaylist}
                onNewPlaylistWithTracks={player.createPlaylistFromMove}
                onNewPlaylistWithFiles={player.createPlaylistFromFiles}
                analyser={player.analyser}
                visualizerConfig={config.visualizerConfig}
              />
          </div>
        </div>

        {viewMode !== 'mini' && (
            <ContextMenu 
            onNextTrack={player.nextTrack}
            onPrevTrack={player.prevTrack}
            onNextBg={config.nextBg}
            onPrevBg={config.prevBg}
            onToggleFullScreen={() => toggleFocusMode()}
            />
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
