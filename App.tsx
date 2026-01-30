
import { useState, useRef, useEffect } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { Settings } from 'lucide-react';

// Components - Layout & UI
import TitleBar from './components/TitleBar';
import StartupOverlay from './components/StartupOverlay';
import ShutdownOverlay from './components/ShutdownOverlay';
import TutorialOverlay from './components/TutorialOverlay';
import ContextMenu from './components/ContextMenu';
import CustomCursor from './components/CustomCursor';
import StreamWindow from './components/ui/StreamWindow';
import RecordingSettingsModal from './components/modals/RecordingSettingsModal';
import CollapseTab from './components/ui/CollapseTab';

// Components - Main Modules
import SettingsPanel from './components/settings/SettingsPanel';
import Controls from './components/Controls';
import RetroScreen from './components/RetroScreen';
import MusicEditor from './components/editor/MusicEditor';
import EditorControls from './components/editor/EditorControls';
import TagEditor from './components/tags/TagEditor';
import TagControls from './components/tags/TagControls';

// Hooks
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useAppConfig } from './hooks/useAppConfig';
import { useSFX } from './hooks/useSFX';
import { useAmbience } from './hooks/useAmbience';
import { useScreenCapture } from './hooks/useScreenCapture';
import { useAppHotkeys } from './hooks/useAppHotkeys';
import { useMusicEngine } from './hooks/useMusicEngine';
import { useRecorder } from './hooks/useRecorder';

// NEW Modular Hooks
import { useViewLayout } from './hooks/useViewLayout';
import { useSystemCycle } from './hooks/useSystemCycle';
import { useFileHandler } from './hooks/useFileHandler';
import { AudioTrack, TagMetadata, RecorderConfig } from './types';

function AppContent() {
  // --- UI LOCAL STATE ---
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [isTagEditorMode, setIsTagEditorMode] = useState(false);
  const [devSkip, setDevSkip] = useState(false);
  const [showRecModal, setShowRecModal] = useState(false);

  // --- RECORDING STATE ---
  const [recorderConfig, setRecorderConfig] = useState<RecorderConfig>({
    resolution: '1080p',
    fps: 60,
    videoBitrate: 8000000,
    audioBitrate: 192000
  });

  // --- SCREEN CAPTURE STATE ---
  const [screenVideo, setScreenVideo] = useState<MediaStream | null>(null);
  const [sysAudioVolume, setSysAudioVolume] = useState(1);
  const [sysAudioMonitor, setSysAudioMonitor] = useState(false);
  const [streamMode, setStreamMode] = useState<'bg' | 'window'>('bg');

  // --- REFS ---
  const appContainerRef = useRef<HTMLDivElement>(null);

  // Ref to track if we are in an auto-launch sequence
  const autoLaunchRef = useRef(false);

  // --- CONTEXTS & CORE HOOKS ---
  const { addNotification } = useNotification();
  const { currentTheme, setTheme, controlStyle, setControlStyle } = useTheme();

  const player = useAudioPlayer();
  const config = useAppConfig();
  const { playSFX, handleZipUpload, stopAllSFX, sfxMap, sfxVolume, setSfxVolume } = useSFX();
  const ambience = useAmbience();
  const musicEngine = useMusicEngine();

  // --- NEW Modular Hooks ---

  // 1. System Lifecycle (Boot, Reboot, Tutorial)
  const system = useSystemCycle({
    player,
    setDevSkip,
    setIsEditorMode: (v) => { setIsEditorMode(v); if (v) setIsTagEditorMode(false); },
    stopAllSFX
  });

  // 2. View & Layout (Animations, Panels, Modes)
  const view = useViewLayout(system.introState);

  // 3. File Handling (Drag & Drop)
  const fileHandler = useFileHandler({
    player,
    config: { ...config, setTheme, setControlStyle }, // Inject theme setters for config imports
    containerRef: appContainerRef,
    handleZipUpload
  });

  // 4. Recording Hook
  const recorder = useRecorder(player.getAudioStream);

  // --- INTEGRATION EFFECTS ---

  // Sync audio levels
  useEffect(() => {
    player.updateAuxVolume(sysAudioVolume);
  }, [sysAudioVolume, player]);

  useEffect(() => {
    player.updateAuxMonitor(sysAudioMonitor);
  }, [sysAudioMonitor, player]);

  // Initialize Screen Capture
  const screenCapture = useScreenCapture({
    onVideoStream: (stream: MediaStream | null) => setScreenVideo(stream),
    onAudioStream: (stream: MediaStream) => player.connectAuxSource(stream)
  });

  // AUTO-LAUNCH HANDLER
  useEffect(() => {
    if (system.introState === 2 && autoLaunchRef.current) {
      view.toggleFocusMode(true);
      setTimeout(() => {
        if (!player.isPlaying) {
          player.togglePlay();
        }
      }, 500);
      autoLaunchRef.current = false;
    }
  }, [system.introState, view, player]);

  // Handle Editor Toggle
  const handleToggleEditor = () => {
    if (isEditorMode) {
      if (musicEngine.isPlaying) musicEngine.togglePlay();
      setIsEditorMode(false);
      addNotification("EDITOR CLOSED", "info");
    } else {
      if (player.isPlaying) player.stop();
      setIsEditorMode(true);
      setIsTagEditorMode(false);
      if (!view.showLeftPanel) view.setShowLeftPanel(true);
      addNotification("MUSIC STUDIO INITIALIZED", "success");
    }
  };

  // Handle Tag Editor Toggle
  const handleToggleTagEditor = () => {
    if (isTagEditorMode) {
      setIsTagEditorMode(false);
      addNotification("TAG EDITOR CLOSED", "info");
    } else {
      setIsTagEditorMode(true);
      setIsEditorMode(false);
      if (!view.showLeftPanel) view.setShowLeftPanel(true);
      addNotification("TAG EDITOR INITIALIZED", "success");
    }
  };

  const handleUpdateTrackTags = (_id: string, _updates: Partial<AudioTrack> & { tags?: TagMetadata }) => {
    // Note: The logic to actually persist tags to IndexedDB would go here.
    // For now, it's a visual feedback stub as per requirements.
    addNotification("Track Updated (Visual)", "success");
  };

  const handleResetDefault = () => {
    const defaults = config.resetDefaultPreset();
    config.setVisualizerConfig(defaults.visualizerConfig);
    if (defaults.reactorConfig && config.setReactorConfig) config.setReactorConfig(defaults.reactorConfig);
    if (defaults.sineWaveConfig && config.setSineWaveConfig) config.setSineWaveConfig(defaults.sineWaveConfig);
    config.setDvdConfig(defaults.dvdConfig);
    config.setEffectsConfig(defaults.effectsConfig);
    config.setMarqueeConfig(defaults.marqueeConfig);
    if (defaults.watermarkConfig && config.setWatermarkConfig) config.setWatermarkConfig(defaults.watermarkConfig);
    config.setBgColor(defaults.bgColor);
    config.setBgPattern(defaults.bgPattern);
    config.setBgPatternConfig(defaults.bgPatternConfig);
    config.setShowVisualizer(defaults.showVisualizer);
    if (config.setShowVisualizer3D && defaults.showVisualizer3D !== undefined) config.setShowVisualizer3D(defaults.showVisualizer3D);
    if (config.setShowSineWave && defaults.showSineWave !== undefined) config.setShowSineWave(defaults.showSineWave);
    config.setShowDvd(defaults.showDvd);
    config.setBgAutoplayInterval(defaults.bgAutoplayInterval);
    if (defaults.cursorStyle) config.setCursorStyle(defaults.cursorStyle);
    if (defaults.retroScreenCursorStyle) config.setRetroScreenCursorStyle(defaults.retroScreenCursorStyle);
    if (defaults.bgTransition) config.setBgTransition(defaults.bgTransition);
    if (defaults.theme) setTheme(defaults.theme);
    if (defaults.controlStyle) setControlStyle(defaults.controlStyle);
    addNotification("System Reset to Factory", "success");
  };

  // Hotkeys Hook
  useAppHotkeys({
    player,
    config,
    focusMode: view.focusMode,
    toggleFocusMode: view.toggleFocusMode,
    handleScheduleReload: system.handleScheduleReload,
    stopAllSFX,
    setDevSkip,
    setIntroState: system.setIntroState,
    setShowTutorial: system.setShowTutorial,
    toggleLeftPanel: view.toggleLeftPanel,
    toggleRightPanel: view.toggleRightPanel,
    viewMode: view.viewMode,
    setViewMode: view.setViewMode,
    onGoHome: system.handleGoHome,
    isRecording: recorder.isRecording,
    startRecording: recorder.startRecording,
    stopRecording: recorder.stopRecording,
    introState: system.introState
  });

  const playbackPercentage = (player.duration > 0) ? (player.currentTime / player.duration) * 100 : 0;

  return (
    <div
      ref={appContainerRef}
      className="flex flex-col h-screen w-full bg-theme-bg text-theme-text overflow-hidden relative"
      style={view.masterStyle}
      onDragOver={fileHandler.onDragOver}
      onDragEnter={fileHandler.onDragEnter}
      onDragLeave={fileHandler.onDragLeave}
      onDrop={fileHandler.onDrop}
    >
      {!view.isFullscreen && (
        <TitleBar
          viewMode={view.viewMode}
          onRestore={() => view.setViewMode('default')}
          currentTrack={player.currentTrack}
        />
      )}

      {screenVideo && streamMode === 'window' && (
        <StreamWindow
          stream={screenVideo}
          onClose={screenCapture.toggleVideoCapture}
        />
      )}

      {showRecModal && (
        <RecordingSettingsModal
          currentConfig={recorderConfig}
          onClose={() => setShowRecModal(false)}
          onSave={(newConfig) => {
            setRecorderConfig(newConfig);
            addNotification("Recording config saved", "success");
          }}
        />
      )}

      <div
        id="tutorial-main-layout"
        className="flex-1 flex flex-col md:flex-row overflow-hidden relative"
      >
        <CustomCursor
          style={system.introState < 2 ? 'dos-terminal' : config.cursorStyle}
          retroScreenStyle={config.retroScreenCursorStyle}
        />

        {/* SIDEBAR TOGGLE TABS */}
        {view.viewMode !== 'mini' && (
          <>
            <CollapseTab 
              side="left" 
              isOpen={view.showLeftPanel} 
              onClick={view.toggleLeftPanel} 
              style={{
                  left: view.showLeftPanel ? '460px' : '0px',
                  transition: 'left 0.7s cubic-bezier(0.25, 1, 0.5, 1)'
              }}
            />
            <CollapseTab 
              side="right" 
              isOpen={view.showRightPanel} 
              onClick={view.toggleRightPanel} 
              style={{
                  right: view.showRightPanel ? '580px' : '0px',
                  transition: 'right 0.7s cubic-bezier(0.25, 1, 0.5, 1)'
              }}
            />
          </>
        )}

        <StartupOverlay
          key={system.startupKey}
          onFadeOut={() => system.setIntroState(2)}
          onComplete={system.handleBootComplete}
          onPlaySfx={playSFX}
          onStopSfx={stopAllSFX}
          apiKey={config.apiKey}
          setApiKey={config.setApiKey}
          forceSkip={devSkip}
          onAutoLaunch={() => {
            autoLaunchRef.current = true;
            recorder.startRecording(recorderConfig);
          }}
        />

        <ShutdownOverlay
          active={system.rebootPhase === 'active'}
          onPlayRebootSfx={() => playSFX('SFX_REBOOT.mp3')}
          onCancel={system.handleCancelReboot}
          isRecording={recorder.isRecording}
          stopRecording={recorder.stopRecording}
        />

        {system.showTutorial && !devSkip && (
          <TutorialOverlay
            onComplete={() => {
              system.setShowTutorial(false);
              localStorage.setItem('neon_tutorial_complete', 'true');
              addNotification("TUTORIAL COMPLETE", "success");
            }}
            trackCount={player.tracks.length}
            isPlaying={player.isPlaying}
            visualizerConfig={config.visualizerConfig}
            setVisualizerConfig={config.setVisualizerConfig}
            setShowVisualizer={config.setShowVisualizer}
            isSettingsOpen={view.showLeftPanel}
            presetsCount={config.savedPresets.length}
          />
        )}

        <audio
          ref={player.audioRefA}
          onEnded={player.activeDeck === 'A' ? () => {
            if (system.rebootPhase === 'waiting') {
              player.setIsPlaying(false);
              system.setRebootPhase('active');
            } else {
              player.nextTrack();
            }
          } : undefined}
          onTimeUpdate={player.activeDeck === 'A' ? (e) => player.handleTimeUpdate(e, system.rebootPhase === 'waiting') : undefined}
          onLoadedMetadata={player.activeDeck === 'A' ? (e) => player.handleTimeUpdate(e, system.rebootPhase === 'waiting') : undefined}
          onPlay={player.onAudioPlay}
          onPause={player.onAudioPause}
          crossOrigin="anonymous"
        />
        <audio
          ref={player.audioRefB}
          onEnded={player.activeDeck === 'B' ? () => {
            if (system.rebootPhase === 'waiting') {
              player.setIsPlaying(false);
              system.setRebootPhase('active');
            } else {
              player.nextTrack();
            }
          } : undefined}
          onTimeUpdate={player.activeDeck === 'B' ? (e) => player.handleTimeUpdate(e, system.rebootPhase === 'waiting') : undefined}
          onLoadedMetadata={player.activeDeck === 'B' ? (e) => player.handleTimeUpdate(e, system.rebootPhase === 'waiting') : undefined}
          onPlay={player.onAudioPlay}
          onPause={player.onAudioPause}
          crossOrigin="anonymous"
        />

        {/* LEFT PANEL */}
        {view.viewMode !== 'mini' && (
          <div className={view.leftPanelClass}>
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
              ) : isTagEditorMode ? (
                <TagControls
                  onExit={handleToggleTagEditor}
                  onSaveAll={() => addNotification("All tags saved", "success")}
                />
              ) : (
                <SettingsPanel
                  showVisualizer={config.showVisualizer} setShowVisualizer={config.setShowVisualizer}
                  showVisualizer3D={config.showVisualizer3D} setShowVisualizer3D={config.setShowVisualizer3D}
                  showSineWave={config.showSineWave} setShowSineWave={config.setShowSineWave}
                  showDvd={config.showDvd} setShowDvd={config.setShowDvd}
                  marqueeConfig={config.marqueeConfig} setMarqueeConfig={config.setMarqueeConfig}
                  visualizerConfig={config.visualizerConfig} setVisualizerConfig={config.setVisualizerConfig}
                  reactorConfig={config.reactorConfig} setReactorConfig={config.setReactorConfig}
                  sineWaveConfig={config.sineWaveConfig} setSineWaveConfig={config.setSineWaveConfig}
                  dvdConfig={config.dvdConfig} setDvdConfig={config.setDvdConfig}
                  effectsConfig={config.effectsConfig} setEffectsConfig={config.setEffectsConfig}
                  watermarkConfig={config.watermarkConfig} setWatermarkConfig={config.setWatermarkConfig}
                  bgColor={config.bgColor} setBgColor={config.setBgColor}
                  bgPattern={config.bgPattern} setBgPattern={config.setBgPattern}
                  bgPatternConfig={config.bgPatternConfig} setBgPatternConfig={config.setBgPatternConfig}
                  onBgMediaUpload={(f: FileList) => { config.handleBgUpload(f); addNotification(`${f.length} backgrounds added`, "success"); }}
                  bgMedia={config.bgMedia}
                  bgList={config.bgList}
                  bgPlaylists={config.bgPlaylists}
                  activeBgPlaylistId={config.activeBgPlaylistId}
                  playingBgPlaylistId={config.playingBgPlaylistId}
                  setActiveBgPlaylistId={config.setActiveBgPlaylistId}
                  setPlayingBgPlaylistId={config.setPlayingBgPlaylistId}
                  addBgPlaylist={config.addBgPlaylist}
                  removeBgPlaylist={config.removeBgPlaylist}
                  renameBgPlaylist={config.renameBgPlaylist}
                  currentBgIndex={config.currentBgIndex}
                  onRemoveBg={config.removeBg}
                  onMoveBg={config.moveBg}
                  onSelectBg={config.selectBg}
                  onDeselectBg={config.deselectBg}
                  onClearBgMedia={config.handleClearBg}
                  onExportConfig={() => config.exportConfig(currentTheme, controlStyle)}
                  bgAutoplayInterval={config.bgAutoplayInterval}
                  setBgAutoplayInterval={config.setBgAutoplayInterval}
                  onScheduleReload={system.handleScheduleReload}
                  onGoHome={system.handleGoHome}
                  onAudioUpload={fileHandler.handleFilesSelected}
                  crossfadeDuration={player.crossfadeDuration}
                  setCrossfadeDuration={player.setCrossfadeDuration}
                  smoothStart={player.smoothStart}
                  setSmoothStart={player.setSmoothStart}
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
                  sfxVolume={sfxVolume}
                  setSfxVolume={setSfxVolume}
                  cursorStyle={config.cursorStyle}
                  setCursorStyle={config.setCursorStyle}
                  retroScreenCursorStyle={config.retroScreenCursorStyle}
                  setRetroScreenCursorStyle={config.setRetroScreenCursorStyle}
                  apiKey={config.apiKey}
                  setApiKey={config.setApiKey}
                  bgTransition={config.bgTransition}
                  setBgTransition={config.setBgTransition}
                  bgAnimation={config.bgAnimation}
                  setBgAnimation={config.setBgAnimation}
                  onRestartTutorial={() => system.setShowTutorial(true)}
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
                  isAdvancedMode={config.isAdvancedMode}
                  setAdvancedMode={config.setAdvancedMode}
                  useAlbumArtAsBackground={config.useAlbumArtAsBackground}
                  setUseAlbumArtAsBackground={config.setUseAlbumArtAsBackground}
                  streamMode={streamMode}
                  setStreamMode={setStreamMode}
                  shuffleBgList={config.shuffleBgList}
                />
              )}

              {!isEditorMode && !isTagEditorMode && (
                <div className="absolute bottom-0 left-0 right-0 z-50 bg-theme-bg border-t border-theme-border p-3">
                  <div className="flex items-center justify-between px-1 gap-2">
                    <span className="text-[9px] font-mono text-theme-muted tracking-widest opacity-40 select-none">
                      EXPANSION
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowRecModal(true)}
                        className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-[10px] font-mono text-gray-400 hover:text-white hover:border-theme-primary hover:bg-gray-800 transition-all flex items-center gap-2 group shadow-sm"
                        title="Recording Settings"
                      >
                        <Settings size={12} className="group-hover:text-theme-primary transition-colors" />
                        <span>Rec Setup</span>
                      </button>

                      <button
                        onClick={handleToggleTagEditor}
                        className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-[10px] font-mono text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-800 transition-all flex items-center gap-2 group shadow-sm"
                      >
                        <span>Tag Editor</span>
                      </button>
                      <button
                        onClick={handleToggleEditor}
                        className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-[10px] font-mono text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-800 transition-all flex items-center gap-2 group shadow-sm"
                      >
                        <span>Studio</span>
                        <span className="text-[9px] text-yellow-600 group-hover:text-yellow-500 transition-colors opacity-80">(Alpha)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CENTER: RETRO SCREEN OR EDITORS */}
        {view.viewMode !== 'mini' && (
          <div className={view.screenContainerClass}>
            {isEditorMode ? (
              <MusicEditor
                instruments={musicEngine.instruments}
                currentStep={musicEngine.currentStep}
                onToggleStep={musicEngine.toggleStep}
                isPlaying={musicEngine.isPlaying}
              />
            ) : isTagEditorMode ? (
              <TagEditor
                tracks={player.tracks}
                onUpdateTrack={handleUpdateTrackTags}
              />
            ) : (
              <RetroScreen
                analyser={player.analyser}
                isPlaying={player.isPlaying}
                currentTrack={player.currentTrack}
                tracks={player.tracks}
                onTrackSelect={player.selectTrack}
                bgMedia={config.bgMedia}
                bgColor={config.bgColor}
                bgPattern={config.bgPattern}
                bgPatternConfig={config.bgPatternConfig}

                videoStream={screenVideo}
                isSystemAudioActive={screenCapture.isAudioActive}
                streamMode={streamMode}

                visualizerConfig={config.visualizerConfig}
                setVisualizerConfig={config.setVisualizerConfig}
                reactorConfig={config.reactorConfig}
                setReactorConfig={config.setReactorConfig}
                sineWaveConfig={config.sineWaveConfig}

                showVisualizer={config.showVisualizer}
                showVisualizer3D={config.showVisualizer3D}
                showSineWave={config.showSineWave}

                dvdConfig={config.dvdConfig}
                showDvd={config.showDvd}
                effectsConfig={config.effectsConfig}
                marqueeConfig={config.marqueeConfig}
                watermarkConfig={config.watermarkConfig}

                progress={playbackPercentage}
                currentTime={player.currentTime}
                duration={player.duration}

                focusMode={view.focusMode}
                setFocusMode={view.toggleFocusMode}
                isDragging={fileHandler.isDragging}

                onDragOver={fileHandler.onDragOver}
                onDragEnter={fileHandler.onDragEnter}
                onDragLeave={fileHandler.onDragLeave}
                onDrop={fileHandler.onDrop}

                onScheduleReload={system.handleScheduleReload}
                rebootPhase={system.rebootPhase}

                onPlaySfx={playSFX}
                volume={player.volume}
                apiKey={config.apiKey}
                useAlbumArtAsBackground={config.useAlbumArtAsBackground}
                bgAnimation={config.bgAnimation}

                isRecording={recorder.isRecording}
                onStartRecording={() => recorder.startRecording(recorderConfig)}
                onStopRecording={recorder.stopRecording}
              />
            )}
          </div>
        )}

        {/* RIGHT PANEL: CONTROLS */}
        <div className={view.rightPanelClass}>
          <div className={`w-full h-full ${view.viewMode === 'mini' ? '' : 'md:w-[580px]'}`}>
            <Controls
              viewMode={view.viewMode}
              onToggleMiniMode={() => view.setViewMode(view.viewMode === 'mini' ? 'default' : 'mini')}
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
              onFilesSelected={fileHandler.handleFilesSelected}
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

        {view.viewMode !== 'mini' && (
          <ContextMenu
            onNextTrack={player.nextTrack}
            onPrevTrack={player.prevTrack}
            onNextBg={config.nextBg}
            onPrevBg={config.prevBg}
            onToggleFullScreen={() => view.toggleFocusMode()}
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
