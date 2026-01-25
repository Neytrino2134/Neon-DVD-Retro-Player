
import { useState, useRef, useEffect, useCallback } from 'react';
import { AudioTrack } from '../types';
import { getAllTracks, saveTrack, clearTracks } from '../lib/db';

type Deck = 'A' | 'B';

export const useAudioPlayer = () => {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Crossfade Settings (Persisted)
  const [crossfadeDuration, setCrossfadeDuration] = useState(() => {
    const saved = localStorage.getItem('neon_crossfade');
    return saved ? parseFloat(saved) : 4; // Default 4 seconds
  });

  // Volume
  const [volume, setVolume] = useState(() => {
    const savedVol = localStorage.getItem('neon_volume');
    return savedVol ? parseFloat(savedVol) : 0.5;
  });

  // Player State
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  // --- DUAL DECK ARCHITECTURE ---
  // We use two audio elements to allow true overlapping playback
  const audioRefA = useRef<HTMLAudioElement>(null);
  const audioRefB = useRef<HTMLAudioElement>(null);
  
  // Refs for logic
  const activeDeckRef = useRef<Deck>('A');
  const isCrossfadingRef = useRef(false);
  const hasTriggeredAutoMixRef = useRef(false); // Prevents double triggers near end
  
  // Refs for Web Audio API
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceARef = useRef<MediaElementAudioSourceNode | null>(null);
  const sourceBRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainARef = useRef<GainNode | null>(null);
  const gainBRef = useRef<GainNode | null>(null);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('neon_volume', volume.toString());
    // Apply master volume to active deck immediately if not fading
    if (gainARef.current && gainBRef.current && !isCrossfadingRef.current) {
        const now = audioContextRef.current?.currentTime || 0;
        const activeGain = activeDeckRef.current === 'A' ? gainARef.current : gainBRef.current;
        const inactiveGain = activeDeckRef.current === 'A' ? gainBRef.current : gainARef.current;
        
        activeGain.gain.setTargetAtTime(volume, now, 0.1);
        inactiveGain.gain.setTargetAtTime(0, now, 0.1);
    }
  }, [volume]);
  
  useEffect(() => {
     localStorage.setItem('neon_crossfade', crossfadeDuration.toString());
  }, [crossfadeDuration]);

  // Load tracks from DB
  useEffect(() => {
    const loadTracks = async () => {
      try {
        const savedTracks = await getAllTracks();
        if (savedTracks.length > 0) {
          const loadedTracks = savedTracks.map(t => ({ 
            id: t.id, 
            name: t.name, 
            url: URL.createObjectURL(t.file), 
            file: t.file 
          }));
          setTracks(loadedTracks);
          setCurrentTrackIndex(0);
          
          // Preload first track into Deck A
          if (audioRefA.current) {
             audioRefA.current.src = loadedTracks[0].url;
             audioRefA.current.load();
          }
          activeDeckRef.current = 'A';
          setIsPlaying(false);
        }
      } catch (err) {
        console.error("Error loading tracks:", err);
      }
    };
    loadTracks();
  }, []);

  // Initialize Web Audio API (Routing)
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const context = new AC();
      audioContextRef.current = context;
      
      const analyserNode = context.createAnalyser();
      analyserNode.smoothingTimeConstant = 0.8;
      setAnalyser(analyserNode);

      // Create Gain Nodes for Fading
      const gainA = context.createGain();
      const gainB = context.createGain();
      
      // Connect gains to analyser, analyser to output
      gainA.connect(analyserNode);
      gainB.connect(analyserNode);
      analyserNode.connect(context.destination);

      gainARef.current = gainA;
      gainBRef.current = gainB;

      // Connect HTML Audio Elements to Web Audio
      if (audioRefA.current) {
        try {
          const sourceA = context.createMediaElementSource(audioRefA.current);
          sourceA.connect(gainA);
          sourceARef.current = sourceA;
        } catch(e) { console.warn("Source A attach error", e); }
      }

      if (audioRefB.current) {
        try {
          const sourceB = context.createMediaElementSource(audioRefB.current);
          sourceB.connect(gainB);
          sourceBRef.current = sourceB;
        } catch(e) { console.warn("Source B attach error", e); }
      }
      
      // Initial State: Deck A full volume, Deck B silent
      gainA.gain.value = volume;
      gainB.gain.value = 0;
    }
    
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, [volume]);

  // --- CROSSFADE LOGIC ---
  const performCrossfade = useCallback((toTrackIndex: number) => {
      // Safety checks
      if (!tracks[toTrackIndex] || !audioContextRef.current || !gainARef.current || !gainBRef.current) return;
      if (isCrossfadingRef.current) return; // Prevent double fade

      const currentDeck = activeDeckRef.current;
      const nextDeck = currentDeck === 'A' ? 'B' : 'A';
      
      const activeAudio = currentDeck === 'A' ? audioRefA.current : audioRefB.current;
      const nextAudio = nextDeck === 'A' ? audioRefA.current : audioRefB.current;
      
      const activeGain = currentDeck === 'A' ? gainARef.current : gainBRef.current;
      const nextGain = nextDeck === 'A' ? gainARef.current : gainBRef.current;

      if (!activeAudio || !nextAudio) return;

      isCrossfadingRef.current = true;
      hasTriggeredAutoMixRef.current = true; // Mark as handled for this track
      
      // 1. Prepare Next Deck
      nextAudio.src = tracks[toTrackIndex].url;
      nextAudio.currentTime = 0;
      
      // 2. Play Next Deck (Silent initially)
      nextAudio.play().then(() => {
          // 3. Perform Constant Power Crossfade
          const now = audioContextRef.current!.currentTime;
          const fadeTime = crossfadeDuration; // seconds

          // Cancel any scheduled values
          activeGain.gain.cancelScheduledValues(now);
          nextGain.gain.cancelScheduledValues(now);

          // Simple Equal Power Crossfade using Cosine/Sine
          // We manually set curve values because setValueCurveAtTime is robust
          const steps = 20;
          const curveA = new Float32Array(steps);
          const curveB = new Float32Array(steps);
          
          for (let i = 0; i < steps; i++) {
              const x = i / (steps - 1);
              // Cosine for fading out, Sine for fading in = Constant Power
              curveA[i] = Math.cos(x * 0.5 * Math.PI) * volume;
              curveB[i] = Math.sin(x * 0.5 * Math.PI) * volume;
          }

          activeGain.gain.setValueCurveAtTime(curveA, now, fadeTime);
          nextGain.gain.setValueCurveAtTime(curveB, now, fadeTime);

          // Update State Logic immediately so UI reflects new track
          activeDeckRef.current = nextDeck;
          setCurrentTrackIndex(toTrackIndex);
          // Reset trigger for the new track (it hasn't finished yet)
          // We set it to false AFTER a small delay to ensure we don't trigger immediately if duration is buggy
          setTimeout(() => { 
             hasTriggeredAutoMixRef.current = false; 
          }, 1000);

          // Cleanup OLD deck after fade completes
          setTimeout(() => {
             activeAudio.pause();
             activeAudio.currentTime = 0;
             isCrossfadingRef.current = false;
          }, fadeTime * 1000 + 100); // Small buffer

      }).catch(e => {
          console.error("Crossfade play failed", e);
          isCrossfadingRef.current = false;
      });

  }, [tracks, volume, crossfadeDuration]);

  // Standard Play/Pause
  const togglePlay = useCallback(() => {
    initAudio();
    const activeAudio = activeDeckRef.current === 'A' ? audioRefA.current : audioRefB.current;
    
    if (isPlaying) {
      activeAudio?.pause();
      setIsPlaying(false);
    } else {
      activeAudio?.play().catch(console.warn);
      setIsPlaying(true);
      
      // Restore volume if we paused mid-fade (reset to deck volume)
      if (gainARef.current && gainBRef.current && !isCrossfadingRef.current) {
         const now = audioContextRef.current?.currentTime || 0;
         if (activeDeckRef.current === 'A') {
             gainARef.current.gain.setValueAtTime(volume, now);
             gainBRef.current.gain.setValueAtTime(0, now);
         } else {
             gainARef.current.gain.setValueAtTime(0, now);
             gainBRef.current.gain.setValueAtTime(volume, now);
         }
      }
    }
  }, [isPlaying, initAudio, volume]);

  const nextTrack = useCallback(() => {
    if (tracks.length === 0) return;
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    
    if (isPlaying) {
        performCrossfade(nextIndex);
    } else {
        // Instant switch if paused
        const nextDeck = activeDeckRef.current; // Keep same deck if paused
        const audio = nextDeck === 'A' ? audioRefA.current : audioRefB.current;
        if (audio) {
            audio.src = tracks[nextIndex].url;
            audio.currentTime = 0;
        }
        setCurrentTrackIndex(nextIndex);
        hasTriggeredAutoMixRef.current = false;
    }
  }, [tracks, currentTrackIndex, isPlaying, performCrossfade]);

  const prevTrack = useCallback(() => {
    if (tracks.length === 0) return;
    const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    
    if (isPlaying) {
        performCrossfade(prevIndex);
    } else {
        const audio = activeDeckRef.current === 'A' ? audioRefA.current : audioRefB.current;
        if (audio) {
            audio.src = tracks[prevIndex].url;
            audio.currentTime = 0;
        }
        setCurrentTrackIndex(prevIndex);
        hasTriggeredAutoMixRef.current = false;
    }
  }, [tracks, currentTrackIndex, isPlaying, performCrossfade]);

  const selectTrack = useCallback((index: number) => {
      if (index === currentTrackIndex) return;
      
      if (isPlaying) {
          performCrossfade(index);
      } else {
          const audio = activeDeckRef.current === 'A' ? audioRefA.current : audioRefB.current;
          if (audio) {
              audio.src = tracks[index].url;
              audio.currentTime = 0;
              initAudio();
              audio.play();
              setIsPlaying(true);
          }
          setCurrentTrackIndex(index);
          hasTriggeredAutoMixRef.current = false;
      }
  }, [currentTrackIndex, isPlaying, performCrossfade, tracks, initAudio]);

  const seek = useCallback((time: number) => {
    const audio = activeDeckRef.current === 'A' ? audioRefA.current : audioRefB.current;
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
      // Reset automix trigger if we seeked back before the trigger point
      if (audio.duration && time < audio.duration - crossfadeDuration) {
          hasTriggeredAutoMixRef.current = false;
      }
    }
  }, [crossfadeDuration]);

  const stop = useCallback(() => {
      [audioRefA.current, audioRefB.current].forEach(a => {
          if (a) {
              a.pause();
              a.currentTime = 0;
          }
      });
      setIsPlaying(false);
  }, []);
  
  // File processing
  const processAudioFiles = async (files: File[]) => {
    const newTracks = files.map(file => ({ id: crypto.randomUUID(), name: file.name, url: URL.createObjectURL(file), file }));
    for (const t of newTracks) await saveTrack({ id: t.id, name: t.name, file: t.file });
    const prevCount = tracks.length;
    setTracks(prev => [...prev, ...newTracks]);
    
    if (prevCount === 0) { 
      setCurrentTrackIndex(0); 
      if (audioRefA.current) {
          audioRefA.current.src = newTracks[0].url;
          audioRefA.current.load();
      }
      activeDeckRef.current = 'A';
      initAudio();
    }
  };

  const clearPlaylist = useCallback(async () => {
    stop();
    [audioRefA.current, audioRefB.current].forEach(a => {
        if (a) { a.removeAttribute('src'); a.load(); }
    });
    tracks.forEach(t => URL.revokeObjectURL(t.url));
    setTracks([]);
    setCurrentTrackIndex(-1);
    await clearTracks();
  }, [tracks, stop]);
  
  const sortTracks = useCallback(() => {
    setTracks(prev => {
      const currentId = prev[currentTrackIndex]?.id;
      const sorted = [...prev].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      if (currentId) {
        const newIndex = sorted.findIndex(t => t.id === currentId);
        if (newIndex !== -1) setCurrentTrackIndex(newIndex);
      }
      return sorted;
    });
  }, [currentTrackIndex]);

  const shuffleTracks = useCallback(() => {
    setTracks(prev => {
      const currentId = prev[currentTrackIndex]?.id;
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      if (currentId) {
        const newIndex = shuffled.findIndex(t => t.id === currentId);
        if (newIndex !== -1) setCurrentTrackIndex(newIndex);
      }
      return shuffled;
    });
  }, [currentTrackIndex]);

  // --- AUTOMATION LOOP ---
  // We use handleTimeUpdate to detect when to crossfade
  const handleTimeUpdate = () => {
      const active = activeDeckRef.current === 'A' ? audioRefA.current : audioRefB.current;
      if (active) {
          const ct = active.currentTime;
          const dur = active.duration;
          
          setCurrentTime(ct);
          if (dur) setDuration(dur);

          // AUTO-MIX LOGIC
          // If we are near end AND playing AND haven't triggered yet AND crossfade is enabled
          if (isPlaying && dur > 0 && crossfadeDuration > 0) {
              if (ct >= dur - crossfadeDuration && !hasTriggeredAutoMixRef.current && !isCrossfadingRef.current) {
                   // Calculate next index
                   const nextIndex = (currentTrackIndex + 1) % tracks.length;
                   // Only mix if we have more than 1 track or looping
                   if (tracks.length > 1) {
                       performCrossfade(nextIndex);
                   }
              }
          }
      }
  };

  return {
    audioRefA,
    audioRefB,
    tracks,
    currentTrackIndex,
    isPlaying,
    volume,
    currentTime,
    duration,
    analyser,
    crossfadeDuration,
    setCrossfadeDuration,
    setVolume,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    processAudioFiles,
    clearPlaylist,
    nextTrack,
    prevTrack,
    togglePlay,
    stop,
    selectTrack,
    seek,
    initAudio,
    sortTracks,
    shuffleTracks,
    handleTimeUpdate,
    activeDeck: activeDeckRef.current
  };
};
