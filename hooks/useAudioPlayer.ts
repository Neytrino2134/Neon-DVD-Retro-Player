

import { useState, useRef, useEffect, useCallback, SyntheticEvent } from 'react';
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
  const crossfadeTimeoutRef = useRef<number | null>(null); // To clear cleanup timeouts on rapid switching
  
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
        
        // Immediate update if not fading
        activeGain.gain.setTargetAtTime(volume, now, 0.05);
        inactiveGain.gain.setTargetAtTime(0, now, 0.05);
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
      // CHANGED: Lower smoothing for punchier visuals
      analyserNode.smoothingTimeConstant = 0.6; 
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
      
      // Initial State
      gainA.gain.value = volume;
      gainB.gain.value = 0;
    }
    
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, [volume]);

  // --- CROSSFADE LOGIC ---
  const performCrossfade = useCallback((toTrackIndex: number) => {
      // Init audio if context is missing or suspended
      initAudio();

      if (!tracks[toTrackIndex] || !audioContextRef.current || !gainARef.current || !gainBRef.current) return;

      // --- CRITICAL FIX FOR RAPID SWITCHING ---
      // If a crossfade cleanup is pending, cancel it so we don't stop the wrong track mid-play
      if (crossfadeTimeoutRef.current) {
        clearTimeout(crossfadeTimeoutRef.current);
        crossfadeTimeoutRef.current = null;
      }

      const currentDeck = activeDeckRef.current;
      const nextDeck = currentDeck === 'A' ? 'B' : 'A';
      
      const activeAudio = currentDeck === 'A' ? audioRefA.current : audioRefB.current;
      const nextAudio = nextDeck === 'A' ? audioRefA.current : audioRefB.current;
      
      const activeGain = currentDeck === 'A' ? gainARef.current : gainBRef.current;
      const nextGain = nextDeck === 'A' ? gainARef.current : gainBRef.current;

      if (!activeAudio || !nextAudio) return;

      // 1. Prepare Next Deck
      nextAudio.src = tracks[toTrackIndex].url;
      nextAudio.currentTime = 0;

      // Mark as crossfading (prevents pause events from triggering UI changes)
      isCrossfadingRef.current = true;
      hasTriggeredAutoMixRef.current = true;

      // --- ZERO CROSSFADE: HARD CUT ---
      // This solves the bug where clicking rapidly or having 0 duration causes toggling/pausing
      if (crossfadeDuration === 0) {
         const now = audioContextRef.current.currentTime;
         
         // Instant Gain Switch
         activeGain.gain.cancelScheduledValues(now);
         nextGain.gain.cancelScheduledValues(now);
         activeGain.gain.setValueAtTime(0, now);
         nextGain.gain.setValueAtTime(volume, now);

         // Sync Switch
         nextAudio.play()
            .then(() => setIsPlaying(true))
            .catch(e => console.error("Hard play failed", e));
            
         activeAudio.pause();
         activeAudio.currentTime = 0;
         
         // Update State Instantly
         activeDeckRef.current = nextDeck;
         setCurrentTrackIndex(toTrackIndex);
         
         isCrossfadingRef.current = false;
         hasTriggeredAutoMixRef.current = false;
         return; 
      }

      // --- NORMAL CROSSFADE ---
      
      // 2. Play Next Deck
      nextAudio.play().then(() => {
          // Force state to playing immediately
          setIsPlaying(true);

          const now = audioContextRef.current!.currentTime;
          const fadeTime = crossfadeDuration; 

          // Cancel any scheduled automation (STOP previous fades)
          activeGain.gain.cancelScheduledValues(now);
          nextGain.gain.cancelScheduledValues(now);

          // 3. Perform Fade
          // Fade OUT active
          activeGain.gain.setValueAtTime(activeGain.gain.value, now);
          activeGain.gain.linearRampToValueAtTime(0, now + fadeTime);

          // Fade IN next
          nextGain.gain.setValueAtTime(nextGain.gain.value, now);
          nextGain.gain.linearRampToValueAtTime(volume, now + fadeTime);

          // Update pointers immediately so UI updates
          activeDeckRef.current = nextDeck;
          setCurrentTrackIndex(toTrackIndex);
          
          // Reset trigger lock after a delay
          setTimeout(() => { 
             hasTriggeredAutoMixRef.current = false; 
          }, 1000);

          // Cleanup Timer
          crossfadeTimeoutRef.current = window.setTimeout(() => {
             // Stop the old deck to save CPU
             activeAudio.pause();
             activeAudio.currentTime = 0;
             isCrossfadingRef.current = false;
             crossfadeTimeoutRef.current = null;
             
             // Ensure volumes are clean (snapped) at end
             const finalNow = audioContextRef.current?.currentTime || 0;
             activeGain.gain.setValueAtTime(0, finalNow);
             nextGain.gain.setValueAtTime(volume, finalNow);

          }, fadeTime * 1000 + 100); 

      }).catch(e => {
          console.error("Crossfade play failed", e);
          isCrossfadingRef.current = false;
      });

  }, [tracks, volume, crossfadeDuration, initAudio]);

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
      
      // Restore volume if we paused mid-fade
      if (gainARef.current && gainBRef.current) {
         const now = audioContextRef.current?.currentTime || 0;
         const activeGain = activeDeckRef.current === 'A' ? gainARef.current : gainBRef.current;
         const inactiveGain = activeDeckRef.current === 'A' ? gainBRef.current : gainARef.current;
         
         // Snap to correct volumes
         activeGain.gain.cancelScheduledValues(now);
         inactiveGain.gain.cancelScheduledValues(now);
         activeGain.gain.setValueAtTime(volume, now);
         inactiveGain.gain.setValueAtTime(0, now);
      }
    }
  }, [isPlaying, initAudio, volume]);

  const nextTrack = useCallback(() => {
    if (tracks.length === 0) return;
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    
    // Always perform crossfade/switch logic, even if paused, to load next track
    if (isPlaying) {
        performCrossfade(nextIndex);
    } else {
        // Simple swap without fade
        setCurrentTrackIndex(nextIndex);
        const nextDeck = activeDeckRef.current; // Reuse same deck if paused
        const audio = nextDeck === 'A' ? audioRefA.current : audioRefB.current;
        if (audio) {
            audio.src = tracks[nextIndex].url;
            audio.currentTime = 0;
        }
        hasTriggeredAutoMixRef.current = false;
    }
  }, [tracks, currentTrackIndex, isPlaying, performCrossfade]);

  const prevTrack = useCallback(() => {
    if (tracks.length === 0) return;
    const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    
    if (isPlaying) {
        performCrossfade(prevIndex);
    } else {
        setCurrentTrackIndex(prevIndex);
        const nextDeck = activeDeckRef.current;
        const audio = nextDeck === 'A' ? audioRefA.current : audioRefB.current;
        if (audio) {
            audio.src = tracks[prevIndex].url;
            audio.currentTime = 0;
        }
        hasTriggeredAutoMixRef.current = false;
    }
  }, [tracks, currentTrackIndex, isPlaying, performCrossfade]);

  const selectTrack = useCallback((index: number) => {
      if (index === currentTrackIndex) return;
      
      if (isPlaying) {
          performCrossfade(index);
      } else {
          // If paused, we switch AND play
          const nextDeck = activeDeckRef.current;
          const audio = nextDeck === 'A' ? audioRefA.current : audioRefB.current;
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
      if (crossfadeTimeoutRef.current) clearTimeout(crossfadeTimeoutRef.current);
      [audioRefA.current, audioRefB.current].forEach(a => {
          if (a) {
              a.pause();
              a.currentTime = 0;
          }
      });
      setIsPlaying(false);
      isCrossfadingRef.current = false;
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
  // Added preventAutoMix flag to support reboot logic
  const handleTimeUpdate = (e: any, preventAutoMix = false) => {
      const active = activeDeckRef.current === 'A' ? audioRefA.current : audioRefB.current;
      if (active) {
          const ct = active.currentTime;
          const dur = active.duration;
          
          setCurrentTime(ct);
          if (dur) setDuration(dur);

          // AUTO-MIX LOGIC
          // If we are near end AND playing AND haven't triggered yet AND crossfade is enabled
          // AND we are NOT preventing auto mix (e.g. waiting for scheduled reboot)
          if (!preventAutoMix && isPlaying && dur > 0 && crossfadeDuration > 0) {
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

  // --- MEDIA SESSION API INTEGRATION ---
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrackIndex >= 0 && tracks[currentTrackIndex]) {
      const track = tracks[currentTrackIndex];
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.name,
        artist: 'Neon Retro Player',
        album: 'Retro Mix',
        // You can add artwork here if you extract cover art
        artwork: [
            { src: 'https://cdn-icons-png.flaticon.com/512/3204/3204362.png', sizes: '512x512', type: 'image/png' }
        ]
      });

      // Update handlers
      navigator.mediaSession.setActionHandler('play', () => {
         togglePlay();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
         togglePlay();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
         prevTrack();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
         nextTrack();
      });
    }
  }, [currentTrackIndex, tracks, togglePlay, prevTrack, nextTrack]);

  // --- SYNC UI STATE WITH AUDIO EVENT ---
  // If the browser (global media key) plays the audio natively without invoking our React handlers,
  // we need to listen to the DOM event to update UI state (Visualizer, Pause button, etc.)
  const onAudioPlay = useCallback(() => {
      if (!isPlaying) setIsPlaying(true);
      initAudio(); // Ensure context is running
  }, [isPlaying, initAudio]);

  const onAudioPause = useCallback((e: SyntheticEvent<HTMLAudioElement>) => {
      // Determine which deck caused the pause event
      // If it's the inactive deck (e.g. from crossfade cleanup), ignore it
      const activeElement = activeDeckRef.current === 'A' ? audioRefA.current : audioRefB.current;
      
      // If we can determine the source event target, compare it.
      // If e.target is not the active deck's audio element, we return early.
      if (activeElement && e.target !== activeElement) {
         return;
      }

      // Only set to false if we are not in the middle of a crossfade operation
      // The old deck pausing during a fade shouldn't trigger global pause state
      if (isPlaying && !isCrossfadingRef.current) setIsPlaying(false);
  }, [isPlaying]);


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
    activeDeck: activeDeckRef.current,
    onAudioPlay,
    onAudioPause
  };
};
