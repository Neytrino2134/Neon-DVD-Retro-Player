
import React, { useRef, useEffect, forwardRef } from 'react';
import { Upload, Minimize, Maximize, Monitor } from 'lucide-react';
import { AudioTrack, VisualizerConfig, EffectsConfig, DvdConfig, MarqueeConfig } from '../types';
import DvdLogo from './DvdLogo';
import Visualizer from './Visualizer';
import MediaRenderer from './MediaRenderer';
import NoiseOverlay from './NoiseOverlay';
import ScanlineEffect from './effects/ScanlineEffect';
import GlitchEffect from './effects/GlitchEffect';
import CyberHackEffect from './effects/CyberHackEffect';

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
  focusMode, setFocusMode, isDragging,
  onDragOver, onDragEnter, onDragLeave, onDrop
}, externalRef) => {
  
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = (externalRef as React.RefObject<HTMLDivElement>) || internalRef;
  const signalLayerRef = useRef<HTMLDivElement>(null);

  // VHS Jitter Loop
  useEffect(() => {
    let aid: number;
    const loop = () => {
      if (signalLayerRef.current && effectsConfig.vhsJitter > 0) {
        signalLayerRef.current.style.transform = `translate3d(${(Math.random()-0.5)*effectsConfig.vhsJitter*0.2}px, ${(Math.random()-0.5)*effectsConfig.vhsJitter*2}px, 0)`;
      } else if (signalLayerRef.current) {
        signalLayerRef.current.style.transform = 'none';
      }
      aid = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(aid);
  }, [effectsConfig.vhsJitter]);

  return (
    <div 
      className={`flex-grow flex items-center justify-center relative bg-gray-950 transition-all duration-500 ${focusMode ? 'p-0' : 'p-1 md:p-3'}`}
    >
      <div 
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
            
            <div ref={signalLayerRef} className="absolute inset-0 w-full h-full">
                <MediaRenderer type={bgMedia ? bgMedia.type : 'color'} url={bgMedia?.url} bgColor={bgColor} effects={effectsConfig} />
                {showVisualizer && <Visualizer analyser={analyser} isPlaying={isPlaying} config={visualizerConfig} fps={effectsConfig.fps} />}
                {showDvd && <DvdLogo containerRef={containerRef} fps={effectsConfig.fps} effectsConfig={effectsConfig} config={dvdConfig} />}
                
                {/* Marquee Overlay */}
                {marqueeConfig.enabled && currentTrack && (
                   <div className="absolute top-8 left-0 w-full h-12 z-20 overflow-hidden pointer-events-none mix-blend-screen" style={{ opacity: marqueeConfig.opacity }}>
                     <div 
                      className="whitespace-nowrap animate-marquee flex items-center h-full"
                      style={{ animationDuration: `${30 / marqueeConfig.speed}s` }}
                     >
                       <span className="text-neon-green font-mono text-xl font-bold drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] px-10">
                         NOW PLAYING: {currentTrack.name.toUpperCase()}
                       </span>
                       <span className="text-neon-green font-mono text-xl font-bold drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] px-10">
                         /// {currentTrack.name.toUpperCase()} ///
                       </span>
                       <span className="text-neon-green font-mono text-xl font-bold drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] px-10">
                         NOW PLAYING: {currentTrack.name.toUpperCase()}
                       </span>
                       <span className="text-neon-green font-mono text-xl font-bold drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] px-10">
                         /// {currentTrack.name.toUpperCase()} ///
                       </span>
                     </div>
                   </div>
                )}

                <GlitchEffect effects={effectsConfig} />
                <CyberHackEffect effects={effectsConfig} />
            </div>
            
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
         <div className="absolute bottom-2 right-4 text-gray-700 font-bold text-xs z-50 flex items-center gap-1 uppercase pointer-events-none">
            <Monitor size={12} /> RETRO-SONIC ULTRA
         </div>
      </div>
    </div>
  );
});

RetroScreen.displayName = "RetroScreen";
export default RetroScreen;
