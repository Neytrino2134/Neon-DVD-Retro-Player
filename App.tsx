
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AudioTrack, VisualizerConfig } from './types';
import DvdLogo from './components/DvdLogo';
import Visualizer from './components/Visualizer';
import Controls from './components/Controls';
import SettingsPanel from './components/SettingsPanel';
import { Monitor } from 'lucide-react';

function App() {
  // State
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  
  // Settings State
  const [showVisualizer, setShowVisualizer] = useState(true);
  const [showDvd, setShowDvd] = useState(true);
  
  // Visualizer Configuration
  const [visualizerConfig, setVisualizerConfig] = useState<VisualizerConfig>({
    style: 'retro',
    position: 'center',
    barCount: 128,
    sensitivity: 1.5,
    fillOpacity: 0.8,
    strokeEnabled: false,
    strokeOpacity: 1.0,
  });
  
  // Background State
  const [bgColor, setBgColor] = useState('#0f172a'); // Default dark blue-gray
  const [bgMedia, setBgMedia] = useState<{ type: 'image' | 'video', url: string } | null>(null);

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const screenContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Audio Context (Web Audio API)
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      // fftSize is now updated in Visualizer.tsx based on config, but set initial here
      analyserRef.current.fftSize = 256; 

      if (audioRef.current) {
        sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      }
    } else if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const handleFilesSelected = (fileList: FileList) => {
    const newTracks: AudioTrack[] = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      url: URL.createObjectURL(file),
      file,
    }));

    setTracks((prev) => [...prev, ...newTracks]);
    
    // Auto-select first track if none selected
    if (currentTrackIndex === -1 && newTracks.length > 0) {
      setCurrentTrackIndex(0);
    }
  };

  const handleBgMediaUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('video') ? 'video' : 'image';
    setBgMedia({ type, url });
  };

  const handleClearBgMedia = () => {
    setBgMedia(null);
  };

  const playTrack = useCallback(async () => {
    if (audioRef.current && currentTrackIndex >= 0 && tracks[currentTrackIndex]) {
      // Ensure context is running
      initAudioContext();
      
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("Playback failed", err);
      }
    }
  }, [currentTrackIndex, tracks]);

  const pauseTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const stopTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const nextTrack = () => {
    if (tracks.length === 0) return;
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    setCurrentTrackIndex(nextIndex);
  };

  const prevTrack = () => {
    if (tracks.length === 0) return;
    const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    setCurrentTrackIndex(prevIndex);
  };

  const selectTrack = (index: number) => {
    setCurrentTrackIndex(index);
  };

  // Effect to load audio source when track index changes
  useEffect(() => {
    if (currentTrackIndex >= 0 && tracks[currentTrackIndex] && audioRef.current) {
      const wasPlaying = isPlaying;
      audioRef.current.src = tracks[currentTrackIndex].url;
      // Volume is applied here too in case src resets it
      audioRef.current.volume = volume;
      if (wasPlaying) {
        playTrack();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrackIndex]);

  // Handle Track Ending
  const handleTrackEnded = () => {
    nextTrack();
  };

  // Handle Volume Change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-black overflow-hidden">
      
      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef} 
        onEnded={handleTrackEnded}
        crossOrigin="anonymous" 
      />

      {/* Left Panel: Settings */}
      <div className="w-full md:w-64 h-auto md:h-full shrink-0 z-20">
        <SettingsPanel 
          showVisualizer={showVisualizer}
          setShowVisualizer={setShowVisualizer}
          showDvd={showDvd}
          setShowDvd={setShowDvd}
          visualizerConfig={visualizerConfig}
          setVisualizerConfig={setVisualizerConfig}
          bgColor={bgColor}
          setBgColor={setBgColor}
          onBgMediaUpload={handleBgMediaUpload}
          bgMedia={bgMedia}
          onClearBgMedia={handleClearBgMedia}
        />
      </div>

      {/* Center: TV Screen (Stretches to fill available space) */}
      <div className="flex-grow flex items-center justify-center relative p-2 md:p-4 bg-gray-950">
        {/* Retro TV Frame - Now fills height and width */}
        <div className="relative w-full h-full bg-gray-900 rounded-2xl border-4 md:border-8 border-gray-800 shadow-2xl overflow-hidden ring-4 ring-gray-900/50">
           {/* Screen Bezel Glow */}
           <div className="absolute inset-0 rounded-xl pointer-events-none z-40 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] border border-gray-700/50"></div>
           
           {/* Screen Content Container */}
           <div 
             ref={screenContainerRef}
             className="relative w-full h-full overflow-hidden"
             style={{ backgroundColor: bgMedia ? '#000' : bgColor }}
           >
              {/* Layer 0: Custom Background Media */}
              {bgMedia?.type === 'image' && (
                <img 
                  src={bgMedia.url} 
                  alt="Background" 
                  className="absolute inset-0 w-full h-full object-cover z-0"
                />
              )}
              {bgMedia?.type === 'video' && (
                <video
                  src={bgMedia.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover z-0"
                />
              )}

              {/* Scanlines Overlay */}
              <div className="absolute inset-0 z-30 pointer-events-none scanlines opacity-30"></div>
              
              {/* Screen Flicker */}
              <div className="absolute inset-0 z-30 pointer-events-none flicker" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}></div>

              {/* Layer 1: Visualizer (Bottom) */}
              {showVisualizer && (
                <Visualizer 
                  analyser={analyserRef.current} 
                  isPlaying={isPlaying} 
                  config={visualizerConfig}
                />
              )}

              {/* Layer 2: DVD Logo (Top) */}
              {showDvd && (
                <DvdLogo containerRef={screenContainerRef} />
              )}
              
              {/* Status Overlay */}
              {!isPlaying && currentTrackIndex === -1 && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                      <div className="text-neon-blue font-mono text-xl md:text-3xl opacity-50 animate-pulse border-2 border-neon-blue px-8 py-4 rounded bg-black/50 backdrop-blur-sm">
                          INSERT DISK
                      </div>
                  </div>
              )}
           </div>

           {/* TV Brand Label */}
           <div className="absolute bottom-2 right-4 text-gray-700 font-bold tracking-widest text-xs z-50 flex items-center gap-1">
              <Monitor size={12} /> RETRO-SONIC
           </div>
        </div>
      </div>

      {/* Right Side: Controls */}
      <div className="w-full md:w-80 h-1/3 md:h-full shrink-0 z-20">
        <Controls
          tracks={tracks}
          currentTrackIndex={currentTrackIndex}
          isPlaying={isPlaying}
          volume={volume}
          onVolumeChange={setVolume}
          onPlay={playTrack}
          onPause={pauseTrack}
          onStop={stopTrack}
          onNext={nextTrack}
          onPrev={prevTrack}
          onTrackSelect={selectTrack}
          onFilesSelected={handleFilesSelected}
        />
      </div>
    </div>
  );
}

export default App;
