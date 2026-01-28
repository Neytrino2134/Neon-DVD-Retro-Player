
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LanguageProvider } from '../contexts/LanguageContext';
import { NotificationProvider, useNotification } from '../contexts/NotificationContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import SettingsPanel from './settings/SettingsPanel';
import Controls from './Controls';
import RetroScreen from './RetroScreen';
import CustomCursor from './CustomCursor';
import ContextMenu from './ContextMenu';
import StartupOverlay from './StartupOverlay';
import ShutdownOverlay from './ShutdownOverlay';
import TitleBar from './TitleBar'; 
import TutorialOverlay from './TutorialOverlay'; 
import CollapseTab from './ui/CollapseTab'; 
import MusicEditor from './editor/MusicEditor';
import EditorControls from './editor/EditorControls';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useAppConfig } from '../hooks/useAppConfig';
import { useSFX } from '../hooks/useSFX';
import { useAmbience } from '../hooks/useAmbience'; 
import { useScreenCapture } from '../hooks/useScreenCapture'; 
import { useAppHotkeys } from '../hooks/useAppHotkeys'; 
import { useMusicEngine } from '../hooks/useMusicEngine';
import { ViewMode } from '../types';

function AppContent() {
  // Panel States
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  
  // VIEW MODE STATE
  const [viewMode, setViewMode] = useState<ViewMode>('default');
  const focusMode = viewMode === 'cinema';

  // --- EDITOR MODE STATE ---
  const [isEditorMode, setIsEditorMode] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false); 
  const appContainerRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotification();
  const { currentTheme, setTheme, controlStyle, setControlStyle } = useTheme();
  
  // Logic States
  const [rebootPhase, setRebootPhase] = useState<'idle' | 'waiting' | 'active'>('idle');
  const [introState, setIntroState] = useState<0 | 1 | 2>(0);
  const [devSkip, setDevSkip] = useState(false);
  const hasBootedRef = useRef(false);
  const [startupKey, setStartupKey] = useState(0);
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
  
  // NEW: Music Engine Hook
  const musicEngine = useMusicEngine();
  
  const screenCapture = useScreenCapture({
      onVideoStream: (stream: MediaStream | null) => setScreenVideo(stream),
      onAudioStream: (stream: MediaStream) => player.connectAuxSource(stream)
  });

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

  const handleSetViewMode = useCallback((mode: ViewMode) => {
      if (mode === 'default' && viewMode === 'mini') {
          if ((window as any).require) {
              const { ipcRenderer } = (window as any).require('electron');
              ipcRenderer.send('set-full-mode');
          }
          setTimeout(() => {
              setViewMode('default');
              setShowLeftPanel(true);
              setShowRightPanel(true);
          }, 250); 
      } else if (mode === 'mini') {
          setViewMode('mini');
          setShowLeftPanel(false);
          setShowRightPanel(true); 
          if ((window as any).require) {
              const { ipcRenderer } = (window as any).require('electron');
              ipcRenderer.send('set-mini-mode', { width: 540, height: 920 });
          }
      } else if (mode === 'cinema') {
          setViewMode('cinema');
          setShowLeftPanel(false);
          setShowRightPanel(false);
          if ((window as any).require) {
              const { ipcRenderer } = (window as any).require('electron');
              ipcRenderer.send('set-full-mode');
          }
      } else {
          setViewMode(mode);
          if (mode === 'default') {
              setShowLeftPanel(true);
              setShowRightPanel(true);
          }
      }
  }, [viewMode]);

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
      setIsEditorMode(false); // Reset editor on home
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

  // Toggle Editor Logic
  const handleToggleEditor = () => {
      if (isEditorMode) {
          // Closing Editor: Pause sequencer
          if (musicEngine.isPlaying) musicEngine.togglePlay();
          setIsEditorMode(false);
          addNotification("EDITOR CLOSED", "info");
      } else {
          // Opening Editor: Pause main player
          if (player.isPlaying) player.stop();
          setIsEditorMode(true);
          // Auto-open left panel if closed
          if (!showLeftPanel) setShowLeftPanel(true);
          addNotification("MUSIC STUDIO INITIALIZED", "success");
      }
  };

  return (
    <div 
      ref={appContainerRef}
      className="flex flex-col h-screen w-full bg-theme-bg text-theme-text overflow-hidden relative"
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
        
        <audio 
          ref={player.audioRefA} 
          onEnded={player.activeDeck === 'A' ? handleTrackEnded : undefined} 
          onTimeUpdate={player.activeDeck === 'A' ? handleTimeUpdate : undefined}
          onLoadedMetadata={player.activeDeck === 'A' ? handleTimeUpdate : undefined}
          onPlay={player.onAudioPlay}
          onPause={player.onAudioPause}
          crossOrigin="anonymous" 
        />
        <audio 
          ref={player.audioRefB} 
          onEnded={player.activeDeck === 'B' ? handleTrackEnded : undefined} 
          onTimeUpdate={player.activeDeck === 'B' ? handleTimeUpdate : undefined}
          onLoadedMetadata={player.activeDeck === 'B' ? handleTimeUpdate : undefined}
          onPlay={player.onAudioPlay}
          onPause={player.onAudioPause}
          crossOrigin="anonymous" 
        />
        
        {/* Left Panel: Settings OR Editor Controls */}
        {viewMode !== 'mini' && (
        <div 
          className={`shrink-0 z-20 transition-all duration-700 ease-in-out
            ${(introState < 1) ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
            ${!showLeftPanel ? '-ml-[100%] md:-ml-[460px]' : 'ml-0'}
            w-full md:w-[460px] relative
          `}
        >
          <div className="w-full h-full relative">
             {isEditorMode ? (
                 <EditorControls 
                    instruments={musicEngine.instruments}
                    bpm={musicEngine.bpm}
                    setBpm={musicEngine.setBpm}
                    isPlaying={musicEngine.isPlaying}
                    onTogglePlay={musicEngine.togglePlay}
                    onSetVolume={musicEngine.setInstrumentVolume}
                    onClearPattern={musicEngine.clearPattern}
                    onExit={handleToggleEditor}
                 />
             ) : (
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
             )}
             
             {/* EDITOR TOGGLE BUTTON (Floating in Bottom of Panel) */}
             {!isEditorMode && (
                 <div className="absolute bottom-0 left-0 right-0 z-50 bg-theme-bg border-t border-theme-border p-3">
                     <div className="flex items-center justify-between px-1">
                        <span className="text-[9px] font-mono text-theme-muted tracking-widest opacity-40 select-none">
                            EXPANSION SLOT
                        </span>
                        <button
                            onClick={handleToggleEditor}
                            className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-[10px] font-mono text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-800 transition-all flex items-center gap-2 group shadow-sm"
                        >
                            <span>Open studio</span>
                            <span className="text-[9px] text-yellow-600 group-hover:text-yellow-500 transition-colors opacity-80">(Alpha)</span>
                        </button>
                     </div>
                 </div>
             )}
          </div>
        </div>
        )}

        {/* Center Screen: RetroScreen OR MusicEditor */}
        {viewMode !== 'mini' && (
        <div 
          id="tutorial-screen"
          className={`flex-grow flex flex-col relative transition-all duration-1000 ease-out overflow-hidden
          ${introState >= 2 ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}
        `}>
            {introState >= 2 && !isEditorMode && (
              <>
                <CollapseTab 
                  side="left" 
                  isOpen={showLeftPanel} 
                  onClick={() => setShowLeftPanel(!showLeftPanel)} 
                />
                <CollapseTab 
                  side="right" 
                  isOpen={showRightPanel} 
                  onClick={() => setShowRightPanel(!showRightPanel)} 
                />
              </>
            )}

            {isEditorMode ? (
                <MusicEditor 
                    instruments={musicEngine.instruments}
                    currentStep={musicEngine.currentStep}
                    onToggleStep={musicEngine.toggleStep}
                    isPlaying={musicEngine.isPlaying}
                />
            ) : (
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
            )}
        </div>
        )}
        
        {/* Right Panel (Controls) */}
        <div 
          className={`shrink-0 z-20 transition-all duration-700 ease-in-out
             ${(introState < 1) ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
             ${!showRightPanel && viewMode !== 'mini' ? 'w-0 overflow-hidden' : (viewMode === 'mini' ? 'w-full flex-1 min-h-0' : 'w-full md:w-[580px] h-full')}
          `}
        >
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

        {/* Context Menu */}
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
