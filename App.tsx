

import React, { useState, useRef, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import SettingsPanel from './components/SettingsPanel';
import Controls from './components/Controls';
import RetroScreen from './components/RetroScreen';
import CustomCursor from './components/CustomCursor';
import ContextMenu from './components/ContextMenu';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useAppConfig } from './hooks/useAppConfig';
import ProgressBar from './components/ProgressBar'; // Explicitly imported for reference if needed, though used in RetroScreen

function AppContent() {
  const [focusMode, setFocusMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const appContainerRef = useRef<HTMLDivElement>(null);
  
  // Reload State Logic
  const [rebootPhase, setRebootPhase] = useState<'idle' | 'waiting' | 'countdown' | 'blackout'>('idle');
  const [finalTimer, setFinalTimer] = useState(5);

  // Custom Hooks
  const player = useAudioPlayer();
  const config = useAppConfig();

  // 1. Trigger or Cancel Reboot
  const handleScheduleReload = () => {
    // If already scheduled, cancel it
    if (rebootPhase !== 'idle') {
        setRebootPhase('idle');
        setFinalTimer(5);
        return;
    }
    
    // Check if playing audio
    if (player.isPlaying && Number.isFinite(player.duration) && player.duration > player.currentTime) {
        setRebootPhase('waiting');
    } else {
        // No audio playing, go straight to critical countdown
        setRebootPhase('countdown');
        player.setIsPlaying(false);
    }
  };

  // 3. Final Countdown Effect
  useEffect(() => {
    if (rebootPhase === 'countdown') {
        if (finalTimer <= 0) {
            // Trigger blackout phase instead of immediate reload
            setRebootPhase('blackout');
            return;
        }

        const interval = setInterval(() => {
            setFinalTimer(prev => prev - 1);
        }, 1000);

        return () => clearInterval(interval);
    } else if (rebootPhase === 'blackout') {
        // Wait 5 seconds in darkness before actual reload
        const timeout = setTimeout(() => {
            window.location.reload();
        }, 5000);
        return () => clearTimeout(timeout);
    }
  }, [rebootPhase, finalTimer]);


  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key presses if typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        player.togglePlay();
      } else if (e.code === 'ArrowRight') {
        config.nextBg();
      } else if (e.code === 'ArrowLeft') {
        config.prevBg();
      } else if (e.code === 'KeyF') {
        if (e.shiftKey) {
            // Shift + F: Browser Fullscreen
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        } else {
            // F: App Focus Mode (Cinema Mode)
            setFocusMode(prev => !prev);
        }
      } else if (e.code === 'Pause') {
        handleScheduleReload();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player, config, setFocusMode, handleScheduleReload]);

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
    
    // Check if we are leaving the app container
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
    }

    // Handle Media
    const audioFiles = droppedFiles.filter(f => f.type.startsWith('audio/'));
    const mediaFiles = droppedFiles.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));

    if (audioFiles.length > 0) await player.processAudioFiles(audioFiles);
    if (mediaFiles.length > 0) await config.handleBgUpload(mediaFiles);
  };

  const handleFilesSelected = async (fileList: FileList) => {
    await player.processAudioFiles(Array.from(fileList));
  };

  const handleTrackEnded = () => {
    // If we were waiting for the track to end to reboot
    if (rebootPhase === 'waiting') {
        player.setIsPlaying(false); // Silence
        setRebootPhase('countdown'); // Start 5s timer
    } else {
        // Normal behavior:
        // If crossfade is 0, automatic transition happens here.
        // If crossfade > 0, it likely happened in timeUpdate, but this is a fallback.
        player.nextTrack();
    }
  };

  // Wrapper for time update to inject logic control
  const handleTimeUpdate = (e: any) => {
      // If we are waiting for a reboot, we want the track to play to the bitter end (onEnded)
      // and NOT trigger the auto-mix/crossfade logic in the hook.
      const preventAutoMix = rebootPhase === 'waiting';
      
      if (player.activeDeck === 'A') {
          player.handleTimeUpdate(e, preventAutoMix);
      } else {
          player.handleTimeUpdate(e, preventAutoMix);
      }
  };

  // Calculate percentage for the new progress bar
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
      {/* DUAL DECK AUDIO SYSTEM */}
      {/* Deck A */}
      <audio 
        ref={player.audioRefA} 
        onEnded={player.activeDeck === 'A' ? handleTrackEnded : undefined} 
        onTimeUpdate={player.activeDeck === 'A' ? handleTimeUpdate : undefined}
        onLoadedMetadata={player.activeDeck === 'A' ? handleTimeUpdate : undefined}
        onPlay={player.onAudioPlay}
        onPause={player.onAudioPause}
        crossOrigin="anonymous" 
      />
      {/* Deck B */}
      <audio 
        ref={player.audioRefB} 
        onEnded={player.activeDeck === 'B' ? handleTrackEnded : undefined} 
        onTimeUpdate={player.activeDeck === 'B' ? handleTimeUpdate : undefined}
        onLoadedMetadata={player.activeDeck === 'B' ? handleTimeUpdate : undefined}
        onPlay={player.onAudioPlay}
        onPause={player.onAudioPause}
        crossOrigin="anonymous" 
      />
      
      {/* Settings Panel */}
      <div className={`shrink-0 z-20 transition-all duration-500 ease-in-out border-r border-gray-800 ${focusMode ? 'w-0 opacity-0 overflow-hidden' : 'w-full md:w-[400px]'}`}>
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
             onBgMediaUpload={config.handleBgUpload} 
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
             onAudioUpload={handleFilesSelected}
             // Audio Props
             crossfadeDuration={player.crossfadeDuration}
             setCrossfadeDuration={player.setCrossfadeDuration}
           />
        </div>
      </div>

      {/* Main Screen */}
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
        rebootPhase={rebootPhase}
        trackRemaining={Math.max(0, player.duration - player.currentTime)}
        finalTimer={finalTimer}
        progress={playbackPercentage}
        focusMode={focusMode}
        setFocusMode={setFocusMode}
        isDragging={isDragging}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      />
      
      {/* Controls Panel */}
      <div className={`shrink-0 z-20 transition-all duration-500 ease-in-out border-l border-gray-800 ${focusMode ? 'w-0 opacity-0 overflow-hidden' : 'w-full md:w-72 lg:w-80'}`}>
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
              onToggleCinema={() => setFocusMode(!focusMode)} 
              onClearPlaylist={player.clearPlaylist}
              onSort={player.sortTracks}
              onShuffle={player.shuffleTracks}
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
    <LanguageProvider>
      <CustomCursor />
      <AppContent />
    </LanguageProvider>
  );
}

export default App;