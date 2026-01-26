
import React, { useRef, useEffect, forwardRef, useMemo, useState } from 'react';
import { Upload, Minimize, Maximize, Monitor, Power, List, Music } from 'lucide-react';
import { AudioTrack, VisualizerConfig, EffectsConfig, DvdConfig, MarqueeConfig, PatternConfig, WatermarkConfig, BgTransitionType } from '../types';
import DvdLogo from './DvdLogo';
import Visualizer from './Visualizer';
import MediaRenderer from './MediaRenderer';
import NoiseOverlay from './NoiseOverlay';
import PatternOverlay from './PatternOverlay';
import ScanlineEffect from './effects/ScanlineEffect';
import GlitchEffect from './effects/GlitchEffect';
import CyberHackEffect from './effects/CyberHackEffect';
import DebugConsoleEffect from './effects/DebugConsoleEffect';
import ChromaticAberration from './effects/ChromaticAberration';
import TransitionEffect from './effects/TransitionEffect';
import HologramEffect from './effects/HologramEffect';
import GeminiChatEffect from './effects/GeminiChatEffect';
import LightLeaksEffect from './effects/LightLeaksEffect';
import Marquee from './Marquee';
import ProgressBar from './ProgressBar';
import NotificationOverlay from './ui/NotificationOverlay';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { Tooltip } from './ui/Tooltip';
import { useGestures } from '../hooks/useGestures';

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds) || seconds < 0) return "00:00";
  const totalSeconds = Math.floor(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

interface RetroScreenProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  currentTrack: AudioTrack | undefined;
  tracks: AudioTrack[];
  onTrackSelect: (index: number) => void;
  bgMedia: { type: 'image' | 'video', url: string } | null;
  bgColor: string;
  bgPattern?: string;
  bgPatternConfig?: PatternConfig;
  
  // Configs
  visualizerConfig: VisualizerConfig;
  showVisualizer: boolean;
  dvdConfig: DvdConfig;
  showDvd: boolean;
  effectsConfig: EffectsConfig;
  marqueeConfig: MarqueeConfig;
  watermarkConfig?: WatermarkConfig;
  
  // Progress
  progress?: number;
  currentTime: number;
  duration: number;

  // UI State
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  isDragging: boolean;
  
  // DnD Handlers
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;

  // Actions
  onScheduleReload: () => void;
  rebootPhase: 'idle' | 'waiting' | 'active';

  // SFX
  onPlaySfx?: (name: string) => void;
  volume: number; // ADDED
  
  // API
  apiKey?: string; // New Prop
}

const RetroScreen = forwardRef<HTMLDivElement, RetroScreenProps>(({
  analyser, isPlaying, currentTrack, tracks, onTrackSelect, bgMedia, bgColor, bgPattern = 'none', bgPatternConfig,
  visualizerConfig, showVisualizer, dvdConfig, showDvd, effectsConfig, marqueeConfig, watermarkConfig,
  progress = 0, currentTime, duration,
  focusMode, setFocusMode, isDragging,
  onDragOver, onDragEnter, onDragLeave, onDrop,
  onScheduleReload, rebootPhase,
  onPlaySfx, volume, apiKey
}, externalRef) => {
  
  const { t } = useLanguage();
  const { notifications } = useNotification();
  
  const [bgTransition, setBgTransition] = useState<BgTransitionType>('glitch');
  const [showPlaylist, setShowPlaylist] = useState(false);

  useEffect(() => {
      // Sync with storage on mount/update
      const load = () => {
          const stored = localStorage.getItem('neon_bg_transition');
          if (stored) {
              try { setBgTransition(JSON.parse(stored)); } catch {}
          }
      };
      load();
      window.addEventListener('storage', load); // Listen for cross-tab or self-updates
  }, [bgMedia]); // Re-check when BG changes

  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = (externalRef as React.RefObject<HTMLDivElement>) || internalRef;
  const signalLayerRef = useRef<HTMLDivElement>(null);
  const shakeRef = useRef<HTMLDivElement>(null);

  const hasNotifications = notifications.length > 0;

  // Gesture Controls
  const gestureHandlers = useGestures({
    onDoubleTap: () => {
        setFocusMode(!focusMode);
    },
  });

  // Transition State
  const [activeMedia, setActiveMedia] = useState(bgMedia);
  const [transitionPhase, setTransitionPhase] = useState<'idle' | 'out' | 'in'>('idle');

  useEffect(() => {
    if (activeMedia === bgMedia) return;

    // Refresh config setting before transition starts
    const stored = localStorage.getItem('neon_bg_transition');
    const currentTransition = stored ? JSON.parse(stored) as BgTransitionType : 'glitch';
    setBgTransition(currentTransition);

    if (currentTransition === 'none') {
        setActiveMedia(bgMedia);
        return;
    }

    setTransitionPhase('out');

    const timeout1 = setTimeout(() => {
      setActiveMedia(bgMedia); 
      setTransitionPhase('in'); 

      const timeout2 = setTimeout(() => {
        setTransitionPhase('idle');
      }, 800);

      return () => clearTimeout(timeout2);
    }, 800);

    return () => clearTimeout(timeout1);
  }, [bgMedia]); 

  // Screen Shake Loop (Only for Glitch)
  useEffect(() => {
    let aid: number;
    const loop = () => {
      let x = 0;
      let y = 0;

      if (effectsConfig.vhsJitter > 0) {
        x += (Math.random()-0.5) * effectsConfig.vhsJitter * 0.2;
        y += (Math.random()-0.5) * effectsConfig.vhsJitter * 2;
      }

      if (transitionPhase !== 'idle' && bgTransition === 'glitch') {
        const shakeIntensity = 8; 
        x += (Math.random() - 0.5) * shakeIntensity;
        y += (Math.random() - 0.5) * shakeIntensity;
      }

      if (signalLayerRef.current) {
        signalLayerRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }

      aid = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(aid);
  }, [effectsConfig.vhsJitter, transitionPhase, bgTransition]);

  const aberrationValue = effectsConfig.chromaticAberration || 0;

  const marqueeText = useMemo(() => {
    const chars = ["@", "#", "$", "%", "&", "*", "!", "?", "0x", "ERR", "//"];
    const dots = ".........";
    const brand = "► Neon Waves";
    
    const getRandomGlitch = () => {
       const r = () => chars[Math.floor(Math.random() * chars.length)];
       return `${r()}${r()}${r()}`;
    };

    if (currentTrack) {
        return `NOW PLAYING: ${currentTrack.name.toUpperCase()}  ${dots} ${brand} ${dots} ${getRandomGlitch()} ${dots}  ${currentTrack.name.toUpperCase()}  ${dots} ${brand} ${dots} `;
    }
    return `INSERT DISK  ${dots}  SYSTEM READY  ${dots}  ${brand}  ${dots}  WAITING FOR INPUT  ${dots} ${getRandomGlitch()} ${dots} `;
  }, [currentTrack]);

  // Determine marquee color based on style
  const getMarqueeColor = (style: string) => {
      switch (style) {
          case 'blue': return '#00f3ff';
          case 'pink': return '#ff00ff';
          case 'inferno': return '#ff3333';
          case 'retro': return '#f9f871'; // Yellow for Retro text
          case 'theme-blue': return '#3b82f6'; // Royal Blue
          case 'warm': return '#fbbf24';       // Amber
          case 'gray': return '#d4d4d4';       // Gray
          case 'ocean': return '#4B8CA8';      // Teal
          case 'matrix': default: return '#00ff00';
      }
  };

  const marqueeColor = getMarqueeColor(marqueeConfig.style || 'matrix');

  // Watermark Animation Calc
  const watermarkAnimClass = (watermarkConfig?.flashIntensity || 0) > 0 ? "animate-text-flash" : "";
  const watermarkAnimStyle: React.CSSProperties = {
      // Map intensity 0.1-1.0 to speed (e.g., 20s to 1s)
      animationDuration: watermarkConfig?.flashIntensity ? `${21 - (watermarkConfig.flashIntensity * 20)}s` : '0s'
  };

  // --- Dynamic Effects Config Calculation ---
  // If transition is 'leaks', we override light leaks settings during transition
  const activeLightLeaksConfig = useMemo(() => {
      if (transitionPhase !== 'idle' && bgTransition === 'leaks') {
          return {
              enabled: true,
              intensity: 1.0,
              speed: 2.0,
              number: 15
          };
      }
      return effectsConfig.lightLeaks;
  }, [effectsConfig.lightLeaks, transitionPhase, bgTransition]);

  // Media Opacity for Leaks Transition
  const mediaOpacity = (transitionPhase === 'out' && bgTransition === 'leaks') ? 0 : 1;
  // Use a CSS transition to smooth the opacity change
  const mediaStyle = {
      opacity: mediaOpacity,
      transition: bgTransition === 'leaks' ? 'opacity 0.8s ease-in-out' : 'none'
  };

  return (
    <div 
      className={`flex-grow flex items-center justify-center relative bg-gray-950 transition-all duration-500 ${focusMode ? 'p-0' : 'p-1 md:p-3'}`}
    >
      <div 
        ref={shakeRef}
        onDoubleClick={() => setFocusMode(!focusMode)} 
        {...gestureHandlers} 
        className={`cursor-hide-center relative w-full h-full bg-gray-900 transition-all duration-700 ${focusMode ? 'rounded-none border-0' : 'rounded-2xl border-4'} ${isDragging ? 'border-neon-blue shadow-[0_0_30px_#00f3ff]' : 'border-gray-800'} overflow-hidden group touch-action-manipulation`}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
         <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-black">
            {/* IN-SCREEN NOTIFICATION OVERLAY - Updated with Dynamic Color */}
            <NotificationOverlay color={marqueeColor} />

            {/* Screen Controls - Left (Reboot) */}
            <div className="absolute top-4 left-4 z-50 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Tooltip content={t('reboot')} position="right">
                <button 
                  onClick={onScheduleReload} 
                  className="text-gray-500 opacity-50 p-2 bg-transparent rounded-full transition-all border border-transparent hover:text-red-500 hover:opacity-100 hover:bg-red-500/20 hover:shadow-[0_0_15px_rgba(255,0,0,0.5)] active:scale-95"
                >
                    <Power size={20} />
                </button>
              </Tooltip>
            </div>

            {/* Screen Controls - Right */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
              
              {rebootPhase === 'waiting' && (
                <div className="flex items-center gap-3 animate-slide-in-right pointer-events-none pr-2">
                  <div className="flex flex-col items-end">
                     <div className="flex items-center gap-2">
                       <span 
                          className="text-[10px] font-mono font-bold tracking-widest leading-none"
                          style={{ color: marqueeColor, filter: `drop-shadow(0 0 5px ${marqueeColor})` }}
                       >
                         {t('reboot_scheduled')}
                       </span>
                       <div 
                          className="w-1.5 h-1.5 rounded-full animate-pulse"
                          style={{ backgroundColor: marqueeColor, boxShadow: `0 0 5px ${marqueeColor}` }}
                       ></div>
                     </div>
                     <span 
                        className="text-[8px] font-mono tracking-wider leading-none mt-1 animate-pulse"
                        style={{ color: marqueeColor, opacity: 0.7 }}
                     >
                       {t('waiting_stream')}
                     </span>
                  </div>
                  <div 
                      className="text-3xl font-mono font-bold tabular-nums leading-none"
                      style={{ color: marqueeColor, filter: `drop-shadow(0 0 8px ${marqueeColor}99)` }}
                  >
                    -{formatTime(Math.max(0, duration - currentTime))}
                  </div>
                </div>
              )}

              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2">
                <Tooltip content="PLAYLIST VIEW" position="left">
                  <button 
                    onClick={() => setShowPlaylist(!showPlaylist)} 
                    style={{ color: marqueeColor }}
                    className="p-2 bg-transparent rounded-full transition-all border border-transparent hover:shadow-[0_0_15px_currentColor] active:scale-95"
                  >
                      <List size={20} />
                  </button>
                </Tooltip>

                <Tooltip content={focusMode ? "EXIT FULL SCREEN" : "FULL SCREEN"} position="left">
                  <button 
                    onClick={() => setFocusMode(!focusMode)} 
                    // Dynamic styling for Fullscreen button
                    style={{ color: marqueeColor }}
                    className="p-2 bg-transparent rounded-full transition-all border border-transparent hover:shadow-[0_0_15px_currentColor] active:scale-95"
                  >
                      {focusMode ? <Minimize size={20} /> : <Maximize size={20} />}
                  </button>
                </Tooltip>
              </div>
            </div>

            <ChromaticAberration intensity={aberrationValue} />

            <div 
                ref={signalLayerRef} 
                className="absolute inset-0 w-full h-full"
                style={aberrationValue > 0 ? { filter: 'url(#chromatic-aberration-filter)' } : undefined}
            >
                {/* Media Wrapper for Opacity Transition */}
                <div className="absolute inset-0 w-full h-full" style={mediaStyle}>
                    <MediaRenderer type={activeMedia ? activeMedia.type : 'color'} url={activeMedia?.url} bgColor={bgColor} effects={effectsConfig} />
                </div>
                
                <PatternOverlay pattern={bgPattern} config={bgPatternConfig} />
                
                <TransitionEffect phase={transitionPhase} mode={bgTransition} />
                
                <LightLeaksEffect config={activeLightLeaksConfig} />

                {showVisualizer && <Visualizer analyser={analyser} isPlaying={isPlaying} config={visualizerConfig} fps={120} volume={volume} />}
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
                   <div className="absolute top-8 left-0 w-full h-24 z-20 pointer-events-none mix-blend-screen flex items-center">
                     <Marquee 
                        text={marqueeText}
                        speed={marqueeConfig.speed}
                        opacity={marqueeConfig.opacity}
                        fontSize={marqueeConfig.fontSize}
                        color={marqueeColor}
                        className="font-mono font-bold"
                     />
                   </div>
                )}

                {/* PLAYLIST OVERLAY (Big Screen Mode) */}
                {showPlaylist && (
                  <div className="absolute inset-0 z-[25] bg-black/90 backdrop-blur-md flex flex-col p-8 md:p-12 overflow-hidden animate-slide-in-right">
                     {/* Header */}
                     <div className="flex items-center justify-between border-b-2 border-theme-primary/50 pb-4 mb-4 shrink-0" style={{ borderColor: `${marqueeColor}80` }}>
                        <h2 className="text-2xl font-mono font-bold tracking-widest flex items-center gap-3" style={{ color: marqueeColor }}>
                           <Music className="animate-pulse" /> TRACK REPOSITORY
                        </h2>
                        <span className="font-mono text-theme-muted text-sm">{tracks.length} FILES FOUND</span>
                     </div>
                     
                     {/* List */}
                     <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                        {tracks.map((track, i) => (
                           <div 
                             key={track.id}
                             onClick={() => { onTrackSelect(i); setShowPlaylist(false); }}
                             className={`p-4 border-l-4 font-mono text-lg cursor-pointer transition-all flex items-center gap-4 group rounded-r
                               ${currentTrack?.id === track.id 
                                 ? 'bg-theme-secondary/20 shadow-[0_0_20px_var(--color-secondary)]' 
                                 : 'border-transparent text-theme-muted hover:bg-white/5 hover:text-theme-primary hover:border-theme-primary'}
                             `}
                             style={currentTrack?.id === track.id ? { 
                                borderColor: marqueeColor, 
                                color: marqueeColor,
                                textShadow: `0 0 10px ${marqueeColor}`
                             } : {}}
                           >
                              <span className="text-xs opacity-50 w-8">{String(i + 1).padStart(2, '0')}</span>
                              <span className="truncate flex-1">{track.name}</span>
                              {currentTrack?.id === track.id && (
                                  <div className="text-[10px] uppercase tracking-widest animate-pulse font-bold px-2 py-1 border border-current rounded">PLAYING</div>
                              )}
                           </div>
                        ))}
                        {tracks.length === 0 && (
                            <div className="text-center opacity-50 py-10 text-xl font-mono">NO TRACKS LOADED</div>
                        )}
                     </div>
                  </div>
                )}

                <GlitchEffect effects={effectsConfig} />
                <CyberHackEffect effects={effectsConfig} />
                <HologramEffect effects={effectsConfig} />
                <GeminiChatEffect effects={effectsConfig} apiKey={apiKey} />
            </div>
            
            <DebugConsoleEffect effects={effectsConfig} />
            <NoiseOverlay opacity={effectsConfig.noise} pixelation={effectsConfig.pixelation} />
            <ScanlineEffect config={effectsConfig} />
            
            {/* Flicker Effect - Disabled when notifications are present to keep screen static */}
            <div className={`absolute inset-0 z-30 pointer-events-none ${hasNotifications ? '' : 'flicker'} bg-white/5`}></div>

            {isDragging && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-neon-blue/20 backdrop-blur-sm pointer-events-none border-4 border-dashed border-neon-blue m-2 rounded-xl animate-pulse">
                <div className="flex flex-col items-center gap-4 text-neon-blue font-mono drop-shadow-[0_0_10px_#00f3ff]">
                  <Upload size={64} />
                  <span className="text-2xl font-bold">DROP FILES HERE</span>
                  <span className="text-sm opacity-70">AUDIO • IMAGES • VIDEO • NRP CONFIG</span>
                </div>
              </div>
            )}

            {!isPlaying && !currentTrack && !isDragging && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    {/* Dynamic color for INSERT DISK */}
                    <div 
                        className="font-mono text-xl border px-8 py-4 rounded bg-black/20 backdrop-blur-[2px]"
                        style={{ 
                            color: marqueeColor, 
                            borderColor: `${marqueeColor}80`, // 50% opacity border
                            boxShadow: `0 0 20px ${marqueeColor}20` // 12% opacity shadow
                        }}
                    >
                        INSERT DISK
                    </div>
                </div>
            )}
         </div>
         
         {/* Watermark Section - Updated with Dynamic Color */}
         <div 
            className="absolute bottom-6 right-8 z-50 flex flex-col items-end pointer-events-none select-none mix-blend-screen"
            style={{
                opacity: watermarkConfig?.opacity ?? 1,
                transform: `scale(${watermarkConfig?.scale ?? 1})`,
                transformOrigin: 'bottom right',
                color: marqueeColor // Apply color to container
            }}
         >
            <div className="flex flex-col items-end text-xs font-mono font-bold tracking-wider mb-1 space-y-0.5 opacity-80">
               <span 
                  className={watermarkAnimClass} 
                  style={{ animationDuration: watermarkAnimStyle.animationDuration, animationDelay: '2s', color: 'currentColor' }}
                >
                    By MeowMasterArt
                </span>
               <span 
                  className={watermarkAnimClass} 
                  style={{ animationDuration: watermarkAnimStyle.animationDuration, animationDelay: '4s', color: 'currentColor' }}
               >
                   MeowMasterArt@gmail.com
               </span>
            </div>
            <div 
                className={`flex items-center gap-2 font-black text-lg tracking-widest uppercase ${watermarkAnimClass}`}
                style={{ animationDuration: watermarkAnimStyle.animationDuration, color: 'currentColor' }}
            >
               <Monitor size={20} /> RETRO-SONIC ULTRA
            </div>
         </div>
      </div>
    </div>
  );
});

RetroScreen.displayName = "RetroScreen";
export default RetroScreen;
