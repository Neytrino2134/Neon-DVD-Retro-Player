
import React, { useState, useRef } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import SettingsPanel from './components/SettingsPanel';
import Controls from './components/Controls';
import RetroScreen from './components/RetroScreen';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useAppConfig } from './hooks/useAppConfig';

function AppContent() {
  const [focusMode, setFocusMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const screenContainerRef = useRef<HTMLDivElement>(null);

  // Custom Hooks
  const player = useAudioPlayer();
  const config = useAppConfig();

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
    const rect = screenContainerRef.current?.getBoundingClientRect();
    if (rect) {
      if (e.clientX <= rect.left || e.clientX >= rect.right || e.clientY <= rect.top || e.clientY >= rect.bottom) {
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

    // Handle .NRP Config files
    const nrpFiles = droppedFiles.filter(f => f.name.toLowerCase().endsWith('.nrp'));
    if (nrpFiles.length > 0) {
      config.importConfig(nrpFiles[0]);
    }

    // Handle Media
    const audioFiles = droppedFiles.filter(f => f.type.startsWith('audio/'));
    const mediaFiles = droppedFiles.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));

    if (audioFiles.length > 0) await player.processAudioFiles(audioFiles);
    if (mediaFiles.length > 0) await config.handleBgUpload(mediaFiles[0]);
  };

  const handleFilesSelected = async (fileList: FileList) => {
    await player.processAudioFiles(Array.from(fileList));
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-black overflow-hidden relative">
      <audio 
        ref={player.audioRef} 
        onEnded={player.nextTrack} 
        onTimeUpdate={() => player.audioRef.current && player.setCurrentTime(player.audioRef.current.currentTime)}
        onLoadedMetadata={() => player.audioRef.current && player.setDuration(player.audioRef.current.duration)}
        crossOrigin="anonymous" 
        loop={player.tracks.length === 1}
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
             onBgMediaUpload={config.handleBgUpload} bgMedia={config.bgMedia} onClearBgMedia={config.handleClearBg}
             onExportConfig={config.exportConfig}
           />
        </div>
      </div>

      {/* Main Screen */}
      <RetroScreen 
        ref={screenContainerRef}
        analyser={player.analyser}
        isPlaying={player.isPlaying}
        currentTrack={player.tracks[player.currentTrackIndex]}
        bgMedia={config.bgMedia}
        bgColor={config.bgColor}
        visualizerConfig={config.visualizerConfig}
        showVisualizer={config.showVisualizer}
        dvdConfig={config.dvdConfig}
        showDvd={config.showDvd}
        effectsConfig={config.effectsConfig}
        marqueeConfig={config.marqueeConfig}
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
            />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
