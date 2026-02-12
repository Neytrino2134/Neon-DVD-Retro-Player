
import React, { useRef, useEffect, forwardRef, useState } from 'react';
import { AudioTrack, VisualizerConfig, EffectsConfig, DvdConfig, MarqueeConfig, PatternConfig, WatermarkConfig, BgAnimationType, FitMode, ScreenAlignment, TerrainConfig, CursorStyle } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { useGestures } from '../hooks/useGestures';
import { useTheme } from '../contexts/ThemeContext';
import { useMediaTransition } from '../hooks/useMediaTransition';
import { useScreenHotkeys } from '../hooks/useScreenHotkeys';
import { Monitor, VolumeX, Volume2 } from 'lucide-react';

// Core Components
import DvdLogo from './DvdLogo';
import Visualizer from './Visualizer';
import Visualizer3D from './Visualizer3D'; 
import VisualizerSpectrum3D from './VisualizerSpectrum3D'; 
import VisualizerTerrain3D from './VisualizerTerrain3D'; 
import SineWave from './SineWave'; 
import MediaRenderer from './MediaRenderer';
import NoiseOverlay from './NoiseOverlay';
import PatternOverlay from './PatternOverlay';
import Marquee from './Marquee';
import ProgressBar from './ProgressBar';
import NotificationOverlay from './ui/NotificationOverlay';
import HologramHelp from './ui/HologramHelp'; 
import FpsCounter from './ui/FpsCounter'; 

// Effects
import ScanlineEffect from './effects/ScanlineEffect';
import GlitchEffect from './effects/GlitchEffect';
import CyberHackEffect from './effects/CyberHackEffect';
import DebugConsoleEffect from './effects/DebugConsoleEffect';
import ChromaticAberration from './effects/ChromaticAberration';
import TransitionEffect from './effects/TransitionEffect';
import HologramEffect from './effects/HologramEffect';
import GeminiChatEffect from './effects/GeminiChatEffect';
import LightLeaksEffect from './effects/LightLeaksEffect';
import RainEffect from './effects/RainEffect'; 
import TronEffect from './effects/TronEffect'; 
import LifeEffect from './effects/LifeEffect'; // NEW
import VignetteEffect from './effects/VignetteEffect'; 
import LightFlickerEffect from './effects/LightFlickerEffect'; 

// New Sub-Components
import ScreenTopBar from './screen/ScreenTopBar';
import ScreenPlaylist from './screen/ScreenPlaylist';
import ScreenQuickSettings from './screen/ScreenQuickSettings';
import ScreenStatus from './screen/ScreenStatus';

interface RetroScreenProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  currentTrack: AudioTrack | undefined;
  tracks: AudioTrack[];
  onTrackSelect: (index: number) => void;
  bgMedia: { type: 'image' | 'video', url: string, hotspots?: any[] } | null;
  bgColor: string;
  bgPattern?: string;
  bgPatternConfig?: PatternConfig;
  
  videoStream?: MediaStream | null; 
  isSystemAudioActive?: boolean;
  isMicActive?: boolean; 
  streamMode?: 'bg' | 'window';
  screenFitMode?: FitMode; 
  screenAlignment?: ScreenAlignment; 

  // Global Config for HUD
  globalWaveformConfig?: VisualizerConfig;
  setGlobalWaveformConfig?: (key: keyof VisualizerConfig, val: any) => void;

  visualizerConfig: VisualizerConfig;
  setVisualizerConfig?: (c: VisualizerConfig) => void; 
  reactorConfig?: VisualizerConfig; 
  setReactorConfig?: (c: VisualizerConfig) => void; 
  sineWaveConfig?: VisualizerConfig; 
  terrainConfig?: TerrainConfig; 
  
  showVisualizer: boolean;
  showVisualizer3D?: boolean; 
  showSineWave?: boolean; 
  showVisualizerTerrain?: boolean; 
  
  dvdConfig: DvdConfig;
  showDvd: boolean;
  effectsConfig: EffectsConfig;
  marqueeConfig: MarqueeConfig;
  watermarkConfig?: WatermarkConfig;
  
  progress?: number;
  currentTime: number;
  duration: number;

  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  isDragging: boolean;
  
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;

  onScheduleReload: () => void;
  rebootPhase: 'idle' | 'waiting' | 'active';

  onPlaySfx?: (name: string) => void;
  volume: number; 
  onVolumeChange?: (vol: number) => void; 
  apiKey?: string; 
  useAlbumArtAsBackground?: boolean;
  bgAnimation?: BgAnimationType;

  // Recording
  isRecording?: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;

  // Resizing State
  isResizing?: boolean;

  // Lock State
  isPlaylistLocked?: boolean;

  // Cursor
  retroScreenCursorStyle?: CursorStyle;
}

// Internal Component for Volume OSD
const VolumeOSD: React.FC<{ volume: number; visible: boolean }> = ({ volume, visible }) => {
    const isMuted = volume === 0;
    if (!visible && !isMuted) return null;

    const percent = Math.round(volume * 100);
    const color = isMuted ? 'text-red-500' : 'text-theme-primary';
    const borderColor = isMuted ? 'border-red-500' : 'border-theme-primary';
    const bgClass = isMuted ? 'bg-red-500/10' : 'bg-theme-primary/10';

    return (
        <div className={`absolute top-20 right-4 z-50 flex items-center gap-3 transition-opacity duration-300 ${visible || isMuted ? 'opacity-100' : 'opacity-0'}`}>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded border backdrop-blur-md shadow-lg ${borderColor} ${bgClass} ${color}`}>
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                {(visible || !isMuted) && (
                    <span className="font-mono text-xs font-bold tracking-widest min-w-[30px] text-right">
                        {isMuted ? 'MUTE' : `${percent}%`}
                    </span>
                )}
            </div>
        </div>
    );
};

const RetroScreen = forwardRef<HTMLDivElement, RetroScreenProps>((props, externalRef) => {
  const {
    analyser, isPlaying, currentTrack, tracks, onTrackSelect, bgMedia, bgColor, bgPattern = 'none', bgPatternConfig,
    videoStream, isSystemAudioActive, isMicActive, streamMode = 'bg', screenFitMode = 'cover', screenAlignment = 'center',
    globalWaveformConfig, setGlobalWaveformConfig,
    visualizerConfig, setVisualizerConfig, reactorConfig, sineWaveConfig, terrainConfig, showVisualizer, showVisualizer3D, showSineWave, showVisualizerTerrain, dvdConfig, showDvd, effectsConfig, marqueeConfig, watermarkConfig,
    progress = 0, currentTime, duration,
    focusMode, setFocusMode, isDragging,
    onDragOver, onDragEnter, onDragLeave, onDrop,
    onScheduleReload, rebootPhase,
    onPlaySfx, volume, onVolumeChange, apiKey,
    useAlbumArtAsBackground = false,
    bgAnimation = 'none',
    isRecording, onStartRecording, onStopRecording,
    isResizing = false,
    isPlaylistLocked = false,
    retroScreenCursorStyle
  } = props;
  
  const { notifications } = useNotification();
  const { colors } = useTheme();
  
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showHelp, setShowHelp] = useState(false); 
  
  const [isVolOSDVisible, setIsVolOSDVisible] = useState(false);
  const volOSDTimerRef = useRef<number | null>(null);

  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = (externalRef as React.RefObject<HTMLDivElement>) || internalRef;
  const signalLayerRef = useRef<HTMLDivElement>(null);
  const imageLayerRef = useRef<HTMLDivElement>(null); 
  const shakeRef = useRef<HTMLDivElement>(null);
  
  const { activePanel, setActivePanel, panelPos, handleMouseMove } = useScreenHotkeys({
      containerRef,
      // Use Global Config for hotkeys logic if available, otherwise fallback to local
      visualizerConfig: globalWaveformConfig || visualizerConfig,
      setVisualizerConfig: (c) => {
          // Shim to map full object update to key-value updater
          if (setGlobalWaveformConfig && globalWaveformConfig) {
             // Find changed keys
             Object.keys(c).forEach(k => {
                 const key = k as keyof VisualizerConfig;
                 if (c[key] !== globalWaveformConfig[key]) {
                     setGlobalWaveformConfig(key, c[key]);
                 }
             })
          } else if (setVisualizerConfig) {
              setVisualizerConfig(c);
          }
      },
      setShowHelp
  });

  const handleWheel = (e: React.WheelEvent) => {
      if ((e.target as HTMLElement).closest('.custom-scrollbar')) return;

      if (onVolumeChange) {
          const step = 0.05;
          const direction = e.deltaY > 0 ? -1 : 1;
          const newVol = Math.max(0, Math.min(1, volume + (step * direction)));
          onVolumeChange(newVol);
          
          setIsVolOSDVisible(true);
          if (volOSDTimerRef.current) clearTimeout(volOSDTimerRef.current);
          volOSDTimerRef.current = window.setTimeout(() => {
              setIsVolOSDVisible(false);
          }, 1500);
      }
  };

  const { baseMedia, overlayMedia, isCrossfading, transitionPhase, bgTransition, activeStream } = useMediaTransition({
      bgMedia,
      videoStream,
      streamMode,
      useAlbumArtAsBackground,
      currentTrack
  });

  const gestureHandlers = useGestures({
    onDoubleTap: () => { setFocusMode(!focusMode); },
  });

  const isSignalEnabled = effectsConfig.signalEnabled;
  const isChromaticEnabled = effectsConfig.chromaticEnabled;
  
  const effectiveNoise = isSignalEnabled ? effectsConfig.noise : 0;
  const effectivePixelation = isSignalEnabled ? effectsConfig.pixelation : 1;
  const effectiveVhsJitter = isSignalEnabled ? effectsConfig.vhsJitter : 0;
  const effectiveChromatic = isChromaticEnabled ? (effectsConfig.chromaticAberration || 0) : 0;

  const isAudioProcessing = isPlaying || isSystemAudioActive || isMicActive || false;

  useEffect(() => {
    let aid: number;
    const loop = () => {
      let x = 0; let y = 0;
      if (effectiveVhsJitter > 0) {
        x += (Math.random()-0.5) * effectiveVhsJitter * 0.2;
        y += (Math.random()-0.5) * effectiveVhsJitter * 2;
      }
      if (transitionPhase === 'out' && bgTransition === 'glitch') {
        const shakeIntensity = 20; 
        x += (Math.random() - 0.5) * shakeIntensity;
        y += (Math.random() - 0.5) * shakeIntensity;
      }
      
      if (imageLayerRef.current) {
        imageLayerRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
      aid = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(aid);
  }, [effectiveVhsJitter, transitionPhase, bgTransition]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.code === 'KeyL' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) { 
              const target = e.target as HTMLElement;
              if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
              
              setShowPlaylist(prev => {
                  const newState = !prev;
                  return newState;
              });
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const resolvedBgColor = bgColor === 'theme-sync' ? colors.bg : bgColor;
  const hasNotifications = notifications.length > 0;

  const marqueeColor = React.useMemo(() => {
      const s = marqueeConfig.style || 'matrix';
      switch (s) {
          case 'blue': return '#00f3ff';
          case 'pink': return '#ff00ff';
          case 'inferno': return '#ff3333';
          case 'retro': return '#f9f871'; 
          case 'theme-blue': return '#3b82f6'; 
          case 'warm': return '#fbbf24';       
          case 'gray': return '#d4d4d4';       
          case 'ocean': return '#4B8CA8';      
          case 'theme-sync': return colors.primary; 
          case 'matrix': default: return '#00ff00';
      }
  }, [marqueeConfig.style, colors.primary]);

  const marqueeText = React.useMemo(() => {
    const chars = ["@", "#", "$", "%", "&", "*", "!", "?", "0x", "ERR", "//"];
    const dots = ".........";
    const channelName = marqueeConfig.channelName || "Neon Waves";
    const brand = `► ${channelName}`;
    const r = () => chars[Math.floor(Math.random() * chars.length)];
    const gl = `${r()}${r()}${r()}`;

    if (isSystemAudioActive) {
        return `STREAM AUDIO ACTIVE  ${dots}  LIVE SIGNAL DETECTED  ${dots}  ${brand}  ${dots}  ${gl}  ${dots} `;
    }

    if (currentTrack) {
        const t = currentTrack.tags || {};
        const trackNum = t.trackNumber ? `[#${t.trackNumber}]` : "";
        const title = t.title ? t.title.toUpperCase() : currentTrack.name.toUpperCase();
        const artist = t.artist ? t.artist.toUpperCase() : "UNKNOWN ARTIST";
        const album = t.album ? `// ${t.album.toUpperCase()}` : "";
        const trackInfo = `${trackNum} ${artist} — ${title} ${album}`.trim();
        return `NOW PLAYING: ${trackInfo}  ${dots}  ${brand}  ${dots}  ${gl}  ${dots}  ${trackInfo}  ${dots} `;
    }

    return `INSERT DISK  ${dots}  SYSTEM READY  ${dots}  ${brand}  ${dots}  WAITING FOR INPUT  ${dots} ${gl} ${dots} `;
  }, [currentTrack, isSystemAudioActive, marqueeConfig.channelName]);

  const watermarkAnimClass = (watermarkConfig?.flashIntensity || 0) > 0 ? "animate-text-flash" : "";
  const watermarkAnimStyle: any = { animationDuration: watermarkConfig?.flashIntensity ? `${21 - (watermarkConfig.flashIntensity * 20)}s` : '0s' };

  const transitionLeaksConfig = React.useMemo(() => {
      const active = isCrossfading && bgTransition === 'leaks';
      return { 
          enabled: active, 
          intensity: 1.0, 
          speed: 3.0, 
          number: 20 
      };
  }, [isCrossfading, bgTransition]);

  const animClass = (bgAnimation && bgAnimation !== 'none' && !activeStream) ? `bg-anim-${bgAnimation}` : '';
  
  let transitionDuration = '2.0s';
  if (bgTransition === 'leaks') transitionDuration = '1.0s'; 
  else if (bgTransition === 'glitch') transitionDuration = '1.2s';
  else if (bgTransition === 'crossfade') transitionDuration = '2.0s'; 

  const overlayTransitionStyle = `opacity ${transitionDuration} ease-in-out`;

  const mediaEffectsConfig = React.useMemo(() => ({
      ...effectsConfig,
      pixelation: effectivePixelation
  }), [effectsConfig, effectivePixelation]);

  const marqueeBorderStyle = marqueeConfig.borderEnabled ? {
      borderTop: `2px solid ${marqueeColor}`,
      borderBottom: `2px solid ${marqueeColor}`,
      backgroundColor: `color-mix(in srgb, ${marqueeColor}, transparent 90%)`
  } : {};

  let baseLayerStyle: React.CSSProperties = { opacity: 1, zIndex: 0, transition: 'opacity 1s ease-in-out, filter 1s ease-in-out' };
  
  if (bgTransition === 'black' && transitionPhase === 'out') {
      baseLayerStyle.opacity = 0;
  }
  if (bgTransition === 'blur') {
      if (transitionPhase === 'out') {
          baseLayerStyle.opacity = 0;
          baseLayerStyle.filter = 'blur(40px)';
      } else {
          baseLayerStyle.filter = 'blur(0px)';
      }
  }

  // Force hide system cursor unless 'system' style is selected
  // We use inline style for maximum specificity
  const shouldHideCursor = retroScreenCursorStyle !== 'system';

  return (
    <div className={`flex-grow flex items-center justify-center relative bg-gray-950 transition-all duration-500 ${focusMode ? 'p-0' : 'p-1 md:p-3'}`}>
      <div 
        id="tutorial-screen"
        ref={shakeRef}
        onDoubleClick={() => setFocusMode(!focusMode)} 
        onMouseMove={handleMouseMove}
        onWheel={handleWheel} 
        {...gestureHandlers} 
        className={`cursor-hide-center cursor-target-screen relative w-full h-full bg-gray-900 ${isResizing ? 'transition-none' : 'transition-all duration-700'} ${focusMode ? 'rounded-none border-0' : 'rounded-xl border-2'} ${isDragging ? 'border-neon-blue shadow-[0_0_30px_#00f3ff]' : 'border-theme-border shadow-md'} overflow-hidden group touch-action-manipulation ${shouldHideCursor ? 'cursor-none' : ''}`}
        // Explicit inline style to enforce cursor hiding
        style={shouldHideCursor ? { cursor: 'none' } : undefined}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
         <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-black">
            <NotificationOverlay color={marqueeColor} />
            <VolumeOSD volume={volume} visible={isVolOSDVisible} />

            <ScreenTopBar 
                rebootPhase={rebootPhase}
                onScheduleReload={onScheduleReload}
                duration={duration}
                currentTime={currentTime}
                marqueeColor={marqueeColor}
                showHelp={showHelp}
                setShowHelp={setShowHelp}
                showPlaylist={showPlaylist}
                setShowPlaylist={setShowPlaylist}
                focusMode={focusMode}
                setFocusMode={setFocusMode}
                isRecording={isRecording}
                onStartRecording={onStartRecording}
                onStopRecording={onStopRecording}
                isPlaylistLocked={isPlaylistLocked}
            />

            {effectsConfig.showFps && <FpsCounter />}

            <ChromaticAberration intensity={effectiveChromatic} />

            <div 
                ref={signalLayerRef} 
                className="absolute inset-0 w-full h-full"
                style={effectiveChromatic > 0 ? { filter: 'url(#chromatic-aberration-filter)' } : undefined}
            >
                {/* IMAGE LAYER */}
                <div ref={imageLayerRef} className="absolute inset-0 w-full h-full will-change-transform">
                    <div className="absolute inset-0 w-full h-full transition-colors duration-700 ease-in-out" style={{ backgroundColor: resolvedBgColor }}></div>

                    {/* MEDIA LAYERS */}
                    <div className={`absolute inset-0 w-full h-full ${animClass}`}>
                        <div className="absolute inset-0 w-full h-full" style={baseLayerStyle}>
                            {(activeStream || baseMedia) && (
                                <MediaRenderer type={baseMedia ? baseMedia.type : 'video'} url={baseMedia?.url} stream={activeStream} bgColor={'transparent'} effects={mediaEffectsConfig} fitMode={screenFitMode} alignment={screenAlignment} />
                            )}
                        </div>
                        {overlayMedia && (
                            <div className="absolute inset-0 w-full h-full" style={{ opacity: isCrossfading ? 1 : 0, transition: overlayTransitionStyle, zIndex: 1 }}>
                                <MediaRenderer type={overlayMedia.type} url={overlayMedia.url} bgColor={'transparent'} effects={mediaEffectsConfig} fitMode={screenFitMode} alignment={screenAlignment} />
                            </div>
                        )}
                    </div>
                </div>
                
                <PatternOverlay pattern={bgPattern} config={bgPatternConfig} />
                <TransitionEffect phase={transitionPhase} mode={bgTransition} />
                <RainEffect config={effectsConfig.rain} />
                
                <LifeEffect config={effectsConfig.life} /> {/* NEW: Game of Life */}
                
                <TronEffect 
                    config={effectsConfig.tron} 
                    analyser={analyser} 
                    isPlaying={isAudioProcessing} 
                    visualizerConfig={visualizerConfig} 
                    volume={volume}
                    currentTime={currentTime}
                    duration={duration}
                    isResizing={isResizing} 
                />
                
                <LightLeaksEffect config={effectsConfig.lightLeaks} />
                <LightLeaksEffect config={transitionLeaksConfig} />

                {showVisualizer && (
                    <Visualizer analyser={analyser} isPlaying={isAudioProcessing} config={visualizerConfig} fps={120} volume={volume} />
                )}

                {showVisualizer3D && reactorConfig && (
                    reactorConfig.threeDMode === 'spectrum' ? (
                        <VisualizerSpectrum3D analyser={analyser} isPlaying={isAudioProcessing} config={reactorConfig} volume={volume} />
                    ) : (
                        <Visualizer3D analyser={analyser} isPlaying={isAudioProcessing} config={reactorConfig} volume={volume} />
                    )
                )}

                {showVisualizerTerrain && terrainConfig && (
                    <VisualizerTerrain3D analyser={analyser} isPlaying={isAudioProcessing} config={terrainConfig} volume={volume} />
                )}

                {showSineWave && sineWaveConfig && (
                    <SineWave analyser={analyser} isPlaying={isAudioProcessing} config={sineWaveConfig} volume={volume} />
                )}
                
                {showDvd && <DvdLogo containerRef={containerRef} fps={effectsConfig.fps} effectsConfig={effectsConfig} config={dvdConfig} onPlaySfx={onPlaySfx} />}
                
                <ProgressBar 
                    progress={progress} 
                    visible={marqueeConfig.enabled && marqueeConfig.showProgress} 
                    mode={marqueeConfig.progressMode}
                    height={marqueeConfig.progressHeight}
                    opacity={marqueeConfig.progressOpacity}
                    color={marqueeColor}
                />

                {marqueeConfig.enabled && (
                   <div 
                        className="absolute top-8 left-0 w-full h-24 z-20 pointer-events-none mix-blend-screen flex items-center"
                        style={marqueeBorderStyle}
                   >
                     <Marquee text={marqueeText} speed={marqueeConfig.speed} opacity={marqueeConfig.opacity} fontSize={marqueeConfig.fontSize} color={marqueeColor} className="font-mono font-bold" />
                   </div>
                )}

                <GlitchEffect effects={effectsConfig} />
                <CyberHackEffect effects={effectsConfig} />
                <HologramEffect effects={effectsConfig} bgMedia={baseMedia} />
                <GeminiChatEffect effects={effectsConfig} apiKey={apiKey} />
                <LightFlickerEffect config={effectsConfig.lightFlicker} />
                
                <VignetteEffect config={effectsConfig.vignette} />
            </div>
            
            {/* UI PANELS - MOVED OUTSIDE SIGNAL LAYER TO PREVENT LAYOUT SHIFTS AND FILTER ARTIFACTS */}
            <ScreenPlaylist 
                visible={showPlaylist}
                tracks={tracks}
                currentTrack={currentTrack}
                onTrackSelect={onTrackSelect}
                onClose={() => setShowPlaylist(false)}
                marqueeColor={marqueeColor}
                isLocked={isPlaylistLocked}
            />

            <ScreenQuickSettings 
                activePanel={activePanel}
                panelPos={panelPos}
                onClose={() => setActivePanel(null)}
                // Pass the GLOBAL config props if available (from parent)
                visualizerConfig={globalWaveformConfig || visualizerConfig}
                setVisualizerConfig={setGlobalWaveformConfig}
            />

            <DebugConsoleEffect effects={effectsConfig} />
            <NoiseOverlay opacity={effectiveNoise} pixelation={effectivePixelation} />
            <ScanlineEffect config={effectsConfig} />
            
            <div className={`absolute inset-0 z-30 pointer-events-none ${hasNotifications ? '' : 'flicker'} bg-white/5`}></div>

            {showHelp && <HologramHelp onClose={() => setShowHelp(false)} />}

            <ScreenStatus 
                isPlaying={isPlaying}
                currentTrack={currentTrack}
                isDragging={isDragging}
                isSystemAudioActive={isSystemAudioActive}
                videoStream={videoStream}
                marqueeColor={marqueeColor}
            />
         </div>
         
         <div 
            className="absolute bottom-16 right-16 z-50 flex flex-col items-end pointer-events-none select-none mix-blend-screen whitespace-nowrap"
            style={{
                opacity: watermarkConfig?.opacity ?? 1,
                transform: `scale(${watermarkConfig?.scale ?? 1})`,
                transformOrigin: 'bottom right',
                color: marqueeColor 
            }}
         >
            <div className="flex flex-col items-end text-xs font-mono font-bold tracking-wider mb-1 space-y-0.5 opacity-80 whitespace-nowrap">
               <span className={watermarkAnimClass} style={{ animationDuration: watermarkAnimStyle.animationDuration, animationDelay: '2s', color: 'currentColor' }}>By MeowMasterArt</span>
               <span className={watermarkAnimClass} style={{ animationDuration: watermarkAnimStyle.animationDuration, animationDelay: '4s', color: 'currentColor' }}>MeowMasterArt@gmail.com</span>
            </div>
            <div className={`flex items-center gap-2 font-black text-lg tracking-widest uppercase whitespace-nowrap ${watermarkAnimClass}`} style={{ animationDuration: watermarkAnimStyle.animationDuration, color: 'currentColor' }}>
               <Monitor size={20} /> RETRO-SONIC ULTRA
            </div>
         </div>
      </div>
    </div>
  );
});

RetroScreen.displayName = "RetroScreen";
export default RetroScreen;
