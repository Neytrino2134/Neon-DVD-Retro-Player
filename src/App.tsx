
import { useState, useRef, useEffect, useCallback } from 'react';
import { AudioTrack, VisualizerConfig } from './types';
import DvdLogo from './components/DvdLogo';
import Visualizer from './components/Visualizer';
import Controls from './components/Controls';
import SettingsPanel from './components/SettingsPanel';
import { Monitor, Maximize, Minimize } from 'lucide-react';
import { CatalogItem } from './data/catalog';
import { 
  loadTracksFromDB, 
  saveTracksToDB, 
  loadBackgroundFromDB, 
  saveBackgroundToDB,
  saveLibraryBackgroundToDB,
  clearBackgroundFromDB,
  loadSettings, 
  saveSettings 
} from './utils/db';

function App() {
  // State initialization with defaults
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Load initial settings or defaults
  const initialSettings = loadSettings();
  
  const [volume, setVolume] = useState(initialSettings?.volume ?? 0.5);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Settings State
  const [showVisualizer, setShowVisualizer] = useState(initialSettings?.showVisualizer ?? true);
  const [showDvd, setShowDvd] = useState(initialSettings?.showDvd ?? true);
  
  // Visualizer Configuration
  const [visualizerConfig, setVisualizerConfig] = useState<VisualizerConfig>(initialSettings?.visualizerConfig ?? {
    style: 'blue',
    position: 'bottom',
    barCount: 128,
    sensitivity: 1.5,
    fillOpacity: 0.3,
    strokeEnabled: true,
    strokeOpacity: 1.0,
  });
  
  // Background State
  const [bgColor, setBgColor] = useState(initialSettings?.bgColor ?? '#0f172a');
  const [bgMedia, setBgMedia] = useState<{ type: 'image' | 'video', url: string } | null>(null);

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const screenContainerRef = useRef<HTMLDivElement>(null);
  const tvFrameRef = useRef<HTMLDivElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const isLoadedRef = useRef(false);

  // --- PERSISTENCE: LOAD DATA ON MOUNT ---
  useEffect(() => {
    const restoreState = async () => {
      try {
        // 1. Load Tracks
        const savedTracks = await loadTracksFromDB();
        if (savedTracks.length > 0) {
          setTracks(savedTracks);
          setCurrentTrackIndex(0); // Select first track by default if exists
        }

        // 2. Load Background Media
        const savedBg = await loadBackgroundFromDB();
        if (savedBg) {
          setBgMedia({ type: savedBg.type, url: savedBg.url });
        }
      } catch (e) {
        console.error("Failed to restore state from DB", e);
      } finally {
        isLoadedRef.current = true;
      }
    };
    restoreState();
  }, []);

  // --- PERSISTENCE: SAVE SETTINGS ON CHANGE ---
  useEffect(() => {
    // Only save if we have finished initial load to avoid overwriting with defaults
    if (isLoadedRef.current) {
        saveSettings({
            volume,
            showVisualizer,
            showDvd,
            visualizerConfig,
            bgColor
        });
    }
  }, [volume, showVisualizer, showDvd, visualizerConfig, bgColor]);

  // --- PERSISTENCE: SAVE TRACKS ON CHANGE ---
  useEffect(() => {
      if (isLoadedRef.current && tracks.length > 0) {
          saveTracksToDB(tracks);
      }
  }, [tracks]);

  // Initialize Audio Context (Web Audio API)
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      analyserRef.current = audioContextRef.current.createAnalyser();
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

    setTracks((prev) => {
        const updated = [...prev, ...newTracks];
        return updated;
    });
    
    if (currentTrackIndex === -1 && newTracks.length > 0) {
      setCurrentTrackIndex(0);
    }
  };

  const handleLibraryTracksSelected = (items: CatalogItem[]) => {
      const newTracks: AudioTrack[] = items.map(item => ({
          id: crypto.randomUUID(),
          name: item.name,
          url: item.path || '',
          isLibraryAsset: true
      }));

      setTracks((prev) => {
        const updated = [...prev, ...newTracks];
        return updated;
      });

      if (currentTrackIndex === -1 && newTracks.length > 0) {
        setCurrentTrackIndex(0);
      }
  };

  const handleBgMediaUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('video') ? 'video' : 'image';
    setBgMedia({ type, url });
    // Save to DB
    saveBackgroundToDB(type, file);
  };

  const handleLibraryBgSelect = (item: CatalogItem) => {
     if (!item.path) return;
     setBgMedia({ type: item.type as 'image'|'video', url: item.path });
     saveLibraryBackgroundToDB(item.type as 'image'|'video', item.path);
  };

  const handleClearBgMedia = () => {
    setBgMedia(null);
    clearBackgroundFromDB();
  };

  // Video Playback Reliability
  useEffect(() => {
    if (bgMedia?.type === 'video' && bgVideoRef.current) {
      bgVideoRef.current.defaultMuted = true;
      bgVideoRef.current.muted = true;
      
      const attemptPlay = () => {
        bgVideoRef.current?.play().catch(e => {
            console.warn("Background video playback failed:", e);
        });
      };

      attemptPlay();

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
           attemptPlay();
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () => {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }
  }, [bgMedia]);

  const playTrack = useCallback(async () => {
    if (audioRef.current && currentTrackIndex >= 0 && tracks[currentTrackIndex]) {
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

  // Fullscreen Logic
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      tvFrameRef.current?.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Effect to load audio source when track index changes
  useEffect(() => {
    if (currentTrackIndex >= 0 && tracks[currentTrackIndex] && audioRef.current) {
      const wasPlaying = isPlaying;
      audioRef.current.src = tracks[currentTrackIndex].url;
      audioRef.current.volume = volume;
      if (wasPlaying) {
        playTrack();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrackIndex]);

  const handleTrackEnded = () => {
    nextTrack();
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-black overflow-hidden">
      
      <audio 
        ref={audioRef} 
        onEnded={handleTrackEnded}
        crossOrigin="anonymous" 
      />

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
          onSelectLibraryBg={handleLibraryBgSelect}
        />
      </div>

      {/* Main Screen Area - Reduced padding for max screen size */}
      <div className="flex-grow flex items-center justify-center relative p-1 bg-gray-950 overflow-hidden">
        <div 
          ref={tvFrameRef}
          className="relative w-full h-full bg-gray-900 rounded-lg md:rounded-xl border-2 md:border-4 border-gray-800 shadow-2xl overflow-hidden ring-2 ring-gray-900/50 group"
        >
           <div className="absolute inset-0 rounded-lg pointer-events-none z-40 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] border border-gray-700/50"></div>
           
           <button
             onClick={toggleFullscreen}
             className="absolute top-4 right-4 z-50 text-gray-500 hover:text-neon-blue transition-all duration-300 p-2 bg-black/40 rounded-full backdrop-blur-sm border border-transparent hover:border-neon-blue/50 opacity-0 group-hover:opacity-100 focus:opacity-100"
             title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
           >
             {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
           </button>

           <div 
             ref={screenContainerRef}
             className="relative w-full h-full overflow-hidden"
             style={{ backgroundColor: bgMedia ? '#000' : bgColor }}
           >
              {bgMedia?.type === 'image' && (
                <img 
                  src={bgMedia.url} 
                  alt="Background" 
                  className="absolute inset-0 w-full h-full object-cover z-0"
                />
              )}
              {bgMedia?.type === 'video' && (
                <video
                  ref={bgVideoRef}
                  key={bgMedia.url}
                  src={bgMedia.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover z-0"
                />
              )}

              <div className="absolute inset-0 z-30 pointer-events-none scanlines opacity-30"></div>
              <div className="absolute inset-0 z-30 pointer-events-none flicker" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}></div>

              {showVisualizer && (
                <Visualizer 
                  analyser={analyserRef.current} 
                  isPlaying={isPlaying} 
                  config={visualizerConfig}
                />
              )}

              {showDvd && (
                <DvdLogo containerRef={screenContainerRef} />
              )}
              
              {!isPlaying && currentTrackIndex === -1 && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                      <div className="text-neon-blue font-mono text-xl md:text-3xl opacity-50 animate-pulse border-2 border-neon-blue px-8 py-4 rounded bg-black/50 backdrop-blur-sm">
                          {tracks.length > 0 ? "READY" : "INSERT DISK"}
                      </div>
                  </div>
              )}
           </div>

           <div className="absolute bottom-2 right-4 text-gray-700 font-bold tracking-widest text-xs z-50 flex items-center gap-1">
              <Monitor size={12} /> RETRO-SONIC
           </div>
        </div>
      </div>

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
          onLibraryTracksSelected={handleLibraryTracksSelected}
        />
      </div>
    </div>
  );
}

export default App;
