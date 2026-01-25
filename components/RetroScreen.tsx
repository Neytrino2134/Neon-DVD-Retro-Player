

import React, { useRef, useEffect, forwardRef, useMemo, useState } from 'react';
import { Upload, Minimize, Maximize, Monitor, AlertTriangle, Power } from 'lucide-react';
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
import { useLanguage } from '../contexts/LanguageContext';

interface ReloadOverlayProps {
  phase: 'idle' | 'waiting' | 'countdown' | 'blackout';
  trackRemaining: number;
  finalSeconds: number;
}

function ReloadOverlay({ phase, trackRemaining, finalSeconds }: ReloadOverlayProps) {
  const { t } = useLanguage();
  const [animState, setAnimState] = useState<'spawn' | 'expandX' | 'expandY' | 'content'>('spawn');
  
  // Reset animation state when entering countdown
  useEffect(() => {
    if (phase === 'countdown') {
        setAnimState('spawn');
        
        const t1 = setTimeout(() => setAnimState('expandX'), 500);
        const t2 = setTimeout(() => setAnimState('expandY'), 1000);
        const t3 = setTimeout(() => setAnimState('content'), 1500);
        
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }
  }, [phase]);

  if (phase === 'idle') return null;

  // 1. REBOOT SCHEDULED (Waiting)
  if (phase === 'waiting') {
    return (
       <div className="absolute top-6 right-16 z-[60] flex flex-col items-end pointer-events-none animate-slide-in-right">
          <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse shadow-[0_0_5px_#00ff00]"></div>
                  <span className="font-mono font-bold text-xs text-neon-green tracking-widest uppercase drop-shadow-[0_0_5px_rgba(0,255,0,0.5)]">
                      {t('reboot_scheduled')}
                  </span>
              </div>
              <div className="font-mono text-[10px] text-gray-400 tracking-wider">
                  {t('waiting_stream')}
              </div>
          </div>
       </div>
    );
  }

  // 2. SYSTEM CRITICAL (Countdown) - Hologram Style with Full Overlay
  if (phase === 'countdown') {
    // Dynamic sizes for animation steps
    let width = '40px';
    let height = '40px';
    let opacity = 0;
    
    if (animState === 'spawn') {
        opacity = 1;
    } else if (animState === 'expandX') {
        opacity = 1;
        width = '400px';
    } else if (animState === 'expandY' || animState === 'content') {
        opacity = 1;
        width = '400px';
        height = 'auto'; // Let content dictate or set fixed
    }

    return (
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
          {/* Noise/Effect Layer on black bg */}
          <div className="absolute inset-0 bg-white/5 opacity-10 pointer-events-none scanlines"></div>
          
          {/* Hologram Container */}
          <div 
            className="relative bg-black border-2 border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.5)] overflow-hidden transition-all duration-500 ease-out"
            style={{ 
                width: width, 
                minHeight: height === 'auto' ? '250px' : height,
                height: height === 'auto' ? 'auto' : height,
                opacity: opacity 
            }}
          >
              {/* Background Grid inside box */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,0,0.1)_1px,transparent_1px)] bg-[length:100%_4px] pointer-events-none"></div>

              {/* Decorative Corners */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-500"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-red-500"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-red-500"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-red-500"></div>

              {/* Header - Always visible once expanded X */}
              <div className={`bg-red-600/20 border-b border-red-600/50 p-2 flex items-center justify-between transition-opacity duration-300 ${animState !== 'spawn' ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="flex items-center gap-2 text-red-500">
                      <AlertTriangle size={16} className="animate-pulse" />
                      <span className="font-mono text-xs font-bold tracking-widest uppercase">SYSTEM FAILURE</span>
                  </div>
                  <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                      <div className="w-1.5 h-1.5 bg-red-600/50 rounded-full"></div>
                  </div>
              </div>

              {/* Content - Only visible in final state */}
              <div className={`p-6 flex flex-col items-center justify-center text-center space-y-4 transition-opacity duration-500 ${animState === 'content' ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="font-mono text-red-500 font-bold text-sm tracking-[0.2em] animate-pulse border-b border-red-500/30 pb-2">
                      CRITICAL ERROR DETECTED
                  </div>
                  
                  <div className="text-7xl font-mono font-black text-red-600 animate-pulse tabular-nums drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">
                      00:0{finalSeconds}
                  </div>

                  <div className="font-mono text-[10px] text-red-400/70 max-w-[250px] leading-relaxed uppercase">
                      System integrity compromised.<br/>Initiating emergency shutdown protocol.
                  </div>
              </div>

              {/* Footer */}
              <div className={`absolute bottom-0 left-0 w-full border-t border-red-600/30 p-2 bg-red-900/10 flex justify-between items-center font-mono text-[9px] text-red-500/50 transition-opacity duration-300 ${animState === 'content' ? 'opacity-100' : 'opacity-0'}`}>
                  <span>ERR_CODE: 0xDEADBEEF</span>
                  <span>CORE_DUMP...</span>
              </div>
          </div>
      </div>
    );
  }

  // 3. BLACKOUT (TV Turn Off)
  if (phase === 'blackout') {
      return (
          <div className="fixed inset-0 z-[10000] bg-black overflow-hidden pointer-events-none">
              <div className="tv-off-container">
                  <div className="tv-off-flash-overlay"></div>
              </div>
          </div>
      );
  }

  return null;
}

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
  
  // Reboot State
  rebootPhase: 'idle' | 'waiting' | 'countdown' | 'blackout';
  trackRemaining: number;
  finalTimer: number;
  
  // Progress
  progress?: number;

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
  analyser, isPlaying, currentTrack, bgMedia, bgColor, bgPattern = 'none', bgPatternConfig,
  visualizerConfig, showVisualizer, dvdConfig, showDvd, effectsConfig, marqueeConfig,
  rebootPhase, trackRemaining, finalTimer, progress = 0,
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
        className={`cursor-hide-center relative w-full h-full bg-gray-900 transition-all duration-700 ${focusMode ? 'rounded-none border-0' : 'rounded-2xl border-4'} ${isDragging ? 'border-neon-blue shadow-[0_0_30px_#00f3ff]' : 'border-gray-800'} overflow-hidden group`}
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
                className="text-neon-green p-2 bg-transparent rounded-full transition-all border border-transparent hover:bg-neon-green/20 hover:shadow-[0_0_15px_rgba(0,255,0,0.5)]"
                title={focusMode ? "Exit Full Screen" : "Full Screen"}
              >
                  {focusMode ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>

            {/* Reload Overlay (Handles Waiting, Countdown, and Blackout phases) */}
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
                
                {/* 1.5 PATTERN OVERLAY (Z-1) */}
                <PatternOverlay pattern={bgPattern} config={bgPatternConfig} />
                
                {/* 2. TRANSITION MASK LAYER (Z-5) */}
                {/* Covers background but sits BEHIND visualizers */}
                <TransitionEffect phase={transitionPhase} />
                
                {/* 3. VISUALIZATION & UI LAYERS (Z-10+) */}
                {/* Force 120FPS for visualizer so it ignores the retro FPS limiter used elsewhere */}
                {showVisualizer && <Visualizer analyser={analyser} isPlaying={isPlaying} config={visualizerConfig} fps={120} />}
                {showDvd && <DvdLogo containerRef={containerRef} fps={effectsConfig.fps} effectsConfig={effectsConfig} config={dvdConfig} />}
                
                {/* Progress Bar (Retro Loading Style) */}
                <ProgressBar 
                    progress={progress} 
                    visible={marqueeConfig.enabled && marqueeConfig.showProgress} 
                    mode={marqueeConfig.progressMode}
                    height={marqueeConfig.progressHeight}
                    opacity={marqueeConfig.progressOpacity}
                    color="#00ff00"
                />

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