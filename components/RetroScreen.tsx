
import React, { useRef, useEffect, forwardRef, useMemo, useState } from 'react';
import { Upload, Minimize, Maximize, Monitor } from 'lucide-react';
import { AudioTrack, VisualizerConfig, EffectsConfig, DvdConfig, MarqueeConfig } from '../types';
import DvdLogo from './DvdLogo';
import Visualizer from './Visualizer';
import MediaRenderer from './MediaRenderer';
import NoiseOverlay from './NoiseOverlay';
import ScanlineEffect from './effects/ScanlineEffect';
import GlitchEffect from './effects/GlitchEffect';
import CyberHackEffect from './effects/CyberHackEffect';
import DebugConsoleEffect from './effects/DebugConsoleEffect';
import ChromaticAberration from './effects/ChromaticAberration';
import TransitionEffect from './effects/TransitionEffect';
import HologramEffect from './effects/HologramEffect';
import Marquee from './Marquee';
import { useLanguage } from '../contexts/LanguageContext';

interface ReloadOverlayProps {
  phase: 'idle' | 'waiting' | 'countdown';
  trackRemaining: number;
  finalSeconds: number;
}

function ReloadOverlay({ phase, trackRemaining, finalSeconds }: ReloadOverlayProps) {
  const { t } = useLanguage();
  
  if (phase === 'idle') return null;

  const formatTime = (totalSeconds: number) => {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "00:00";
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isCritical = phase === 'countdown';

  return (
     <div className="absolute top-6 right-6 z-[60] flex justify-end pointer-events-none">
        <div className={`
          px-5 py-2 rounded-sm border backdrop-blur-sm 
          flex flex-row items-center gap-6 transition-all duration-500
          animate-pulse
          ${isCritical 
            ? 'border-red-600/60 bg-red-900/30 shadow-[0_0_20px_rgba(220,38,38,0.4)]' 
            : 'border-neon-yellow/60 bg-gray-900/40 shadow-[0_0_20px_rgba(249,248,113,0.2)]'}
        `}>
           <div className="flex flex-col items-start mr-2">
               <div className={`font-mono font-bold text-[10px] uppercase tracking-[0.1em] whitespace-nowrap ${isCritical ? 'text-red-400' : 'text-neon-yellow'}`}>
                 {isCritical ? t('system_critical') : t('reboot_scheduled')}
               </div>
               
               {!isCritical && (
                   <div className="text-gray-300 font-mono text-[9px] tracking-wider opacity-80 whitespace-nowrap">
                       {t('waiting_stream')}
                   </div>
               )}
           </div>

           <div className={`font-mono font-black text-2xl tabular-nums leading-none ${isCritical ? 'text-red-500' : 'text-neon-yellow'}`}>
             {isCritical 
                ? `00:${finalSeconds.toString().padStart(2, '0')}` 
                : formatTime(trackRemaining)
             }
           </div>
        </div>
     </div>
  );
}

interface RetroScreenProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  currentTrack: AudioTrack | undefined;
  bgMedia: { type: 'image' | 'video', url: string } | null;
  bgColor: string;
  
  // Configs
  visualizerConfig: VisualizerConfig;
  showVisualizer: boolean;
  dvdConfig: DvdConfig;
  showDvd: boolean;
  effectsConfig: EffectsConfig;
  marqueeConfig: MarqueeConfig;
  
  // Reboot State
  rebootPhase: 'idle' | 'waiting' | 'countdown';
  trackRemaining: number;
  finalTimer: number;
  
  // UI State
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  isDragging: boolean;
  
  // DnD Handlers
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

const RetroScreen = forwardRef<HTMLDivElement, RetroScreenProps>(({
  analyser, isPlaying, currentTrack, bgMedia, bgColor,
  visualizerConfig, showVisualizer, dvdConfig, showDvd, effectsConfig, marqueeConfig,
  rebootPhase, trackRemaining, finalTimer,
  focusMode, setFocusMode, isDragging,
  onDragOver, onDragEnter, onDragEnter: onDragEnterProp, onDragLeave, onDrop
}, externalRef) => {
  
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = (externalRef as React.RefObject<HTMLDivElement>) || internalRef;
  const signalLayerRef = useRef<HTMLDivElement>(null);
  const shakeRef = useRef<HTMLDivElement>(null);

  // Transition State
  const [activeMedia, setActiveMedia] = useState(bgMedia);
  const [transitionPhase, setTransitionPhase] = useState<'idle' | 'out' | 'in'>('idle');

  // Handle Background Transition Logic
  useEffect(() => {
    // If it's the very first load or explicit null to null, just sync
    if (activeMedia === bgMedia) return;

    // Start Exit Animation (Fill with blocks)
    setTransitionPhase('out');

    // Wait for screen to be sufficiently covered (800ms - Faster, but allows gradual fill)
    const timeout1 = setTimeout(() => {
      setActiveMedia(bgMedia); // Swap the actual media behind the mask
      setTransitionPhase('in'); // Start Reveal Animation (Remove blocks)

      // Wait for reveal to finish (800ms)
      const timeout2 = setTimeout(() => {
        setTransitionPhase('idle');
      }, 800);

      return () => clearTimeout(timeout2);
    }, 800);

    return () => clearTimeout(timeout1);
  }, [bgMedia]); 

  // Screen Shake Loop (Combines VHS Jitter + Transition Shake)
  useEffect(() => {
    let aid: number;
    const loop = () => {
      // Base VHS Jitter
      let x = 0;
      let y = 0;

      if (effectsConfig.vhsJitter > 0) {
        x += (Math.random()-0.5) * effectsConfig.vhsJitter * 0.2;
        y += (Math.random()-0.5) * effectsConfig.vhsJitter * 2;
      }

      // Transition Shake (subtle rumble during swap)
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

  // Prepare Marquee Text
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
        className={`relative w-full h-full bg-gray-900 transition-all duration-700 ${focusMode ? 'rounded-none border-0' : 'rounded-2xl border-4'} ${isDragging ? 'border-neon-blue shadow-[0_0_30px_#00f3ff]' : 'border-gray-800'} overflow-hidden group`}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
         <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-black">
            {/* Screen Controls */}
            <div className="absolute top-4 right-4 z-50 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button 
                onClick={() => setFocusMode(!focusMode)} 
                className="text-white/60 hover:text-neon-blue p-2 bg-black/40 backdrop-blur rounded-full transition-colors border border-transparent hover:border-neon-blue/50"
                title={focusMode ? "Exit Full Screen" : "Full Screen"}
              >
                  {focusMode ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>

            {/* Reload Overlay */}
            <ReloadOverlay 
              phase={rebootPhase} 
              trackRemaining={trackRemaining} 
              finalSeconds={finalTimer} 
            />
            
            {/* Chromatic Filter Definition */}
            <ChromaticAberration intensity={aberrationValue} />

            <div 
                ref={signalLayerRef} 
                className="absolute inset-0 w-full h-full"
                style={aberrationValue > 0 ? { filter: 'url(#chromatic-aberration-filter)' } : undefined}
            >
                {/* 1. BACKGROUND LAYER (Z-0) */}
                <MediaRenderer type={activeMedia ? activeMedia.type : 'color'} url={activeMedia?.url} bgColor={bgColor} effects={effectsConfig} />
                
                {/* 2. TRANSITION MASK LAYER (Z-5) */}
                {/* Covers background but sits BEHIND visualizers */}
                <TransitionEffect phase={transitionPhase} />
                
                {/* 3. VISUALIZATION & UI LAYERS (Z-10+) */}
                {showVisualizer && <Visualizer analyser={analyser} isPlaying={isPlaying} config={visualizerConfig} fps={effectsConfig.fps} />}
                {showDvd && <DvdLogo containerRef={containerRef} fps={effectsConfig.fps} effectsConfig={effectsConfig} config={dvdConfig} />}
                
                {/* Marquee Overlay */}
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
            <div className="absolute inset-0 z-30 pointer-events-none flicker bg-white/5"></div>

            {/* Drag and Drop Overlay */}
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
                    <div className="text-neon-blue font-mono text-xl animate-pulse border-2 border-neon-blue px-8 py-4 rounded bg-black/50">INSERT DISK</div>
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
