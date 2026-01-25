

import React, { useRef, useEffect, forwardRef, useMemo, useState } from 'react';
import { Upload, Minimize, Maximize, Monitor, Power } from 'lucide-react';
import { AudioTrack, VisualizerConfig, EffectsConfig, DvdConfig, MarqueeConfig, PatternConfig } from '../types';
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
}

const RetroScreen = forwardRef<HTMLDivElement, RetroScreenProps>(({
  analyser, isPlaying, currentTrack, bgMedia, bgColor, bgPattern = 'none', bgPatternConfig,
  visualizerConfig, showVisualizer, dvdConfig, showDvd, effectsConfig, marqueeConfig,
  progress = 0, currentTime, duration,
  focusMode, setFocusMode, isDragging,
  onDragOver, onDragEnter, onDragLeave, onDrop,
  onScheduleReload, rebootPhase,
  onPlaySfx
}, externalRef) => {
  
  const { t } = useLanguage();
  const { notifications } = useNotification();
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

  // Screen Shake Loop
  useEffect(() => {
    let aid: number;
    const loop = () => {
      let x = 0;
      let y = 0;

      if (effectsConfig.vhsJitter > 0) {
        x += (Math.random()-0.5) * effectsConfig.vhsJitter * 0.2;
        y += (Math.random()-0.5) * effectsConfig.vhsJitter * 2;
      }

      if (transitionPhase !== 'idle') {
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
  }, [effectsConfig.vhsJitter, transitionPhase]);

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
            {/* IN-SCREEN NOTIFICATION OVERLAY */}
            <NotificationOverlay />

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
                       <span className="text-[10px] font-mono font-bold text-neon-green tracking-widest leading-none drop-shadow-[0_0_5px_rgba(0,255,0,0.8)]">
                         {t('reboot_scheduled')}
                       </span>
                       <div className="w-1.5 h-1.5 bg-neon-green rounded-full shadow-[0_0_5px_#00ff00] animate-pulse"></div>
                     </div>
                     <span className="text-[8px] font-mono text-neon-green/70 tracking-wider leading-none mt-1 animate-pulse">
                       {t('waiting_stream')}
                     </span>
                  </div>
                  <div className="text-3xl font-mono font-bold text-neon-green tabular-nums leading-none drop-shadow-[0_0_8px_rgba(0,255,0,0.6)]">
                    -{formatTime(Math.max(0, duration - currentTime))}
                  </div>
                </div>
              )}

              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Tooltip content={focusMode ? "EXIT FULL SCREEN" : "FULL SCREEN"} position="left">
                  <button 
                    onClick={() => setFocusMode(!focusMode)} 
                    className="text-neon-green p-2 bg-transparent rounded-full transition-all border border-transparent hover:bg-neon-green/20 hover:shadow-[0_0_15px_rgba(0,255,0,0.5)] active:scale-95"
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
                <MediaRenderer type={activeMedia ? activeMedia.type : 'color'} url={activeMedia?.url} bgColor={bgColor} effects={effectsConfig} />
                
                <PatternOverlay pattern={bgPattern} config={bgPatternConfig} />
                
                <TransitionEffect phase={transitionPhase} />
                
                {showVisualizer && <Visualizer analyser={analyser} isPlaying={isPlaying} config={visualizerConfig} fps={120} />}
                {showDvd && <DvdLogo containerRef={containerRef} fps={effectsConfig.fps} effectsConfig={effectsConfig} config={dvdConfig} onPlaySfx={onPlaySfx} />}
                
                <ProgressBar 
                    progress={progress} 
                    visible={marqueeConfig.enabled && marqueeConfig.showProgress} 
                    mode={marqueeConfig.progressMode}
                    height={marqueeConfig.progressHeight}
                    opacity={marqueeConfig.progressOpacity}
                    color="#00ff00"
                />

                {marqueeConfig.enabled && (
                   <div className="absolute top-8 left-0 w-full h-24 z-20 pointer-events-none mix-blend-screen flex items-center">
                     <Marquee 
                        text={marqueeText}
                        speed={marqueeConfig.speed}
                        opacity={marqueeConfig.opacity}
                        fontSize={marqueeConfig.fontSize}
                        className="text-neon-green font-mono font-bold drop-shadow-[0_0_8px_rgba(0,255,0,0.8)]"
                     />
                   </div>
                )}

                <GlitchEffect effects={effectsConfig} />
                <CyberHackEffect effects={effectsConfig} />
                <HologramEffect effects={effectsConfig} />
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
                    <div className="text-neon-blue font-mono text-xl border border-neon-blue/50 px-8 py-4 rounded bg-black/20 backdrop-blur-[2px] shadow-[0_0_20px_rgba(0,243,255,0.1)]">INSERT DISK</div>
                </div>
            )}
         </div>
         <div className="absolute bottom-6 right-8 z-50 flex flex-col items-end pointer-events-none select-none mix-blend-screen">
            <div className="flex flex-col items-end text-xs font-mono font-bold tracking-wider text-gray-600 mb-1 space-y-0.5">
               <span className="animate-text-flash" style={{ animationDuration: '7s', animationDelay: '2s' }}>By MeowMasterArt</span>
               <span className="animate-text-flash" style={{ animationDuration: '11s', animationDelay: '4s' }}>MeowMasterArt@gmail.com</span>
            </div>
            <div className="flex items-center gap-2 font-black text-lg tracking-widest uppercase animate-text-flash text-gray-700">
               <Monitor size={20} /> RETRO-SONIC ULTRA
            </div>
         </div>
      </div>
    </div>
  );
});

RetroScreen.displayName = "RetroScreen";
export default RetroScreen;