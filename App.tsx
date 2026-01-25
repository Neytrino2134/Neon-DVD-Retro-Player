

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import SettingsPanel from './components/settings/SettingsPanel';
import Controls from './components/Controls';
import RetroScreen from './components/RetroScreen';
import CustomCursor from './components/CustomCursor';
import ContextMenu from './components/ContextMenu';
import StartupOverlay from './components/StartupOverlay';
import ShutdownOverlay from './components/ShutdownOverlay';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useAppConfig } from './hooks/useAppConfig';
import { useSFX } from './hooks/useSFX';

function AppContent() {
  const [focusMode, setFocusMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const appContainerRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotification();
  
  // Reload State Logic
  const [rebootPhase, setRebootPhase] = useState<'idle' | 'waiting' | 'active'>('idle');
  
  // Intro Animation Sequence State
  const [introState, setIntroState] = useState<0 | 1 | 2>(0);
  
  // Track if we have already done the initial boot notification
  const hasBootedRef = useRef(false);
  
  // Key to force remount of StartupOverlay
  const [startupKey, setStartupKey] = useState(0);

  // Custom Hooks
  const player = useAudioPlayer();
  const config = useAppConfig();
  const { playSFX, handleZipUpload, stopAllSFX, sfxMap } = useSFX();

  // 1. Trigger or Cancel Reboot
  const handleScheduleReload = () => {
    if (rebootPhase !== 'idle') {
        setRebootPhase('idle');
        addNotification("Reboot Cancelled", "info");
        return;
    }
    
    // Check if playing audio
    if (player.isPlaying && Number.isFinite(player.duration) && player.duration > player.currentTime) {
        setRebootPhase('waiting');
        addNotification("Reboot scheduled after track", "warning");
    } else {
        setRebootPhase('active');
        // SFX is now triggered inside ShutdownOverlay for synchronization
        player.setIsPlaying(false);
    }
  };

  // Called when StartupOverlay BEGINS to fade out.
  // We turn on the main screen immediately so it's visible BEHIND the fading overlay.
  const handleOverlayFadeOut = () => {
      setIntroState(2);
  };

  // Called when StartupOverlay is completely gone.
  const handleBootComplete = () => {
      // Only show notification on the very first boot of the session
      if (!hasBootedRef.current) {
          hasBootedRef.current = true;
          setTimeout(() => {
              addNotification("SYSTEM ONLINE", "success");
          }, 500);
      }
  };

  const handleGoHome = () => {
      player.stop();
      setIntroState(0);
      setStartupKey(prev => prev + 1); // Force StartupOverlay to reset state
      setFocusMode(false);
  };
  
  // FIX: Memoize handler to prevent re-renders of ShutdownOverlay
  const handlePlayRebootSfx = useCallback(() => {
      playSFX('Binary_Code_Sound_Effects_Reboot.mp3');
  }, [playSFX]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

      if (e.repeat) return;

      if (e.code === 'Space') {
        e.preventDefault();
        player.togglePlay();
      } else if (e.code === 'ArrowRight') {
        config.nextBg();
      } else if (e.code === 'ArrowLeft') {
        config.prevBg();
      } else if (e.code === 'KeyF') {
        if (e.shiftKey) {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        } else {
            setFocusMode(prev => !prev);
            addNotification(focusMode ? "UI restored" : "Cinema Mode Active", "info");
        }
      } else if (e.code === 'Pause') {
        handleScheduleReload();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player, config, setFocusMode, handleScheduleReload, focusMode]);

  // Drag and Drop Logic
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (appContainerRef.current && !appContainerRef.current.contains(e.relatedTarget as Node)) {
       setIsDragging(false);
    }
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files) as File[];
    if (droppedFiles.length === 0) return;

    // Handle .NRP Config files
    const nrpFiles = droppedFiles.filter(f => f.name.toLowerCase().endsWith('.nrp'));
    if (nrpFiles.length > 0) {
      config.importConfig(nrpFiles[0]);
      addNotification("Configuration Loaded", "success");
    }

    // Handle Media
    const audioFiles = droppedFiles.filter(f => f.type.startsWith('audio/'));
    const mediaFiles = droppedFiles.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    // Handle Zip (SFX)
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
        // SFX triggered via overlay props
    } else {
        player.nextTrack();
    }
  };

  const handleTimeUpdate = (e: any) => {
      const preventAutoMix = rebootPhase === 'waiting';
      
      if (player.activeDeck === 'A') {
          player.handleTimeUpdate(e, preventAutoMix);
      } else {
          player.handleTimeUpdate(e, preventAutoMix);
      }
  };

  const playbackPercentage = (player.duration > 0) ? (player.currentTime / player.duration) * 100 : 0;

  return (
    <div 
      ref={appContainerRef}
      className="flex flex-col md:flex-row h-screen w-full bg-black overflow-hidden relative"
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <StartupOverlay 
        key={startupKey}
        onFadeOut={handleOverlayFadeOut}
        onComplete={handleBootComplete} 
        onPlaySfx={playSFX} 
        onStopSfx={stopAllSFX}
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
      
      {/* DUAL DECK AUDIO SYSTEM */}
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
      
      {/* Settings Panel - Left Side */}
      <div 
        className={`shrink-0 z-20 transition-all duration-700 ease-out border-r border-gray-800 
          ${(focusMode || introState < 1) ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
          ${focusMode ? 'w-0 overflow-hidden border-none' : 'w-full md:w-[400px]'}
        `}
      >
        <div className="w-full h-full md:w-[400px]">
           <SettingsPanel 
             showVisualizer={config.showVisualizer} setShowVisualizer={config.setShowVisualizer}
             showDvd={config.showDvd} setShowDvd={config.setShowDvd}
             marqueeConfig={config.marqueeConfig} setMarqueeConfig={config.setMarqueeConfig}
             visualizerConfig={config.visualizerConfig} setVisualizerConfig={config.setVisualizerConfig}
             dvdConfig={config.dvdConfig} setDvdConfig={config.setDvdConfig}
             effectsConfig={config.effectsConfig} setEffectsConfig={config.setEffectsConfig}
             bgColor={config.bgColor} setBgColor={config.setBgColor}
             bgPattern={config.bgPattern} setBgPattern={config.setBgPattern}
             bgPatternConfig={config.bgPatternConfig} setBgPatternConfig={config.setBgPatternConfig}
             onBgMediaUpload={(f) => { config.handleBgUpload(f); addNotification(`${f.length} backgrounds added`, "success"); }} 
             bgMedia={config.bgMedia} 
             bgList={config.bgList}
             currentBgIndex={config.currentBgIndex}
             onRemoveBg={config.removeBg}
             onMoveBg={config.moveBg}
             onSelectBg={config.selectBg}
             onDeselectBg={config.deselectBg}
             onClearBgMedia={config.handleClearBg}
             onExportConfig={config.exportConfig}
             bgAutoplayInterval={config.bgAutoplayInterval}
             setBgAutoplayInterval={config.setBgAutoplayInterval}
             onScheduleReload={handleScheduleReload}
             onGoHome={handleGoHome}
             onAudioUpload={handleFilesSelected}
             crossfadeDuration={player.crossfadeDuration}
             setCrossfadeDuration={player.setCrossfadeDuration}
             savedPresets={config.savedPresets}
             savePreset={(n) => { config.savePreset(n); addNotification(`Preset "${n}" saved`, "success"); }}
             loadPreset={(id) => { config.loadPreset(id); addNotification("Preset loaded", "success"); }}
             deletePreset={config.deletePreset}
             renamePreset={config.renamePreset}
             onSfxUpload={handleZipUpload}
             sfxMap={sfxMap}
           />
        </div>
      </div>

      {/* Main Screen - Center */}
      <div className={`flex-grow flex flex-col relative transition-all duration-1000 ease-out overflow-hidden
        ${introState >= 2 ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}
      `}>
          <RetroScreen 
            analyser={player.analyser}
            isPlaying={player.isPlaying}
            currentTrack={player.tracks[player.currentTrackIndex]}
            bgMedia={config.bgMedia}
            bgColor={config.bgColor}
            bgPattern={config.bgPattern}
            bgPatternConfig={config.bgPatternConfig}
            visualizerConfig={config.visualizerConfig}
            showVisualizer={config.showVisualizer}
            dvdConfig={config.dvdConfig}
            showDvd={config.showDvd}
            effectsConfig={config.effectsConfig}
            marqueeConfig={config.marqueeConfig}
            progress={playbackPercentage}
            focusMode={focusMode}
            setFocusMode={(v) => { setFocusMode(v); addNotification(v ? "Cinema Mode Active" : "UI Restored", "info"); }}
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
          />
      </div>
      
      {/* Controls Panel - Right Side */}
      <div 
        className={`shrink-0 z-20 transition-all duration-700 ease-out border-l border-gray-800
           ${(introState < 1) ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
           ${focusMode ? 'w-0 overflow-hidden border-none' : 'w-full md:w-72 lg:w-80'}
        `}
      >
        <div className="w-full h-full md:w-72 lg:w-80">
            <Controls 
              tracks={player.tracks} 
              currentTrackIndex={player.currentTrackIndex} 
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
              onClearPlaylist={() => { player.clearPlaylist(); addNotification("Playlist cleared", "warning"); }}
              onSort={() => { player.sortTracks(); addNotification("Playlist sorted A-Z", "info"); }}
              onShuffle={() => { player.shuffleTracks(); addNotification("Playlist shuffled", "info"); }}
            />
        </div>
      </div>

      {/* Context Menu */}
      <ContextMenu 
        onNextTrack={player.nextTrack}
        onPrevTrack={player.prevTrack}
        onNextBg={config.nextBg}
        onPrevBg={config.prevBg}
        onToggleFullScreen={() => setFocusMode(!focusMode)}
      />
    </div>
  );
}

function App() {
  return (
    <NotificationProvider>
      <LanguageProvider>
        <CustomCursor />
        <AppContent />
      </LanguageProvider>
    </NotificationProvider>
  );
}

export default App;
