
import { useState, useRef, useEffect, useCallback, SyntheticEvent } from 'react';
import { AudioTrack, Playlist } from '../types';
import { getAllTracks, saveTrack, getAllPlaylists, savePlaylist, deletePlaylistAndTracks, clearTracksInPlaylist, deleteTracksBulk, saveTracksBulk } from '../lib/db';

type Deck = 'A' | 'B';

const RESUME_KEY = 'neon_player_resume_state';

// Simple function to parse basic ID3v2 tags for APIC frame (Cover Art)
// This is a simplified parser to avoid heavy external dependencies
const extractCoverArt = async (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
        // Only process MP3s for now
        if (!file.type.includes('audio/mpeg') && !file.name.toLowerCase().endsWith('.mp3')) {
            resolve(undefined);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const buffer = e.target?.result as ArrayBuffer;
            if (!buffer) { resolve(undefined); return; }
            
            const view = new DataView(buffer);
            // Check for ID3 header
            if (view.getUint8(0) !== 0x49 || view.getUint8(1) !== 0x44 || view.getUint8(2) !== 0x33) {
                resolve(undefined);
                return;
            }

            const version = view.getUint8(3);
            const size = ((view.getUint8(6) & 0x7f) << 21) | ((view.getUint8(7) & 0x7f) << 14) | ((view.getUint8(8) & 0x7f) << 7) | (view.getUint8(9) & 0x7f);
            
            let offset = 10;
            const limit = offset + size;

            while (offset < limit) {
                // Read frame header
                let frameId = '';
                let frameSize = 0;
                
                if (version === 2) {
                    // ID3v2.2
                    if (offset + 6 > limit) break;
                    frameId = String.fromCharCode(view.getUint8(offset), view.getUint8(offset+1), view.getUint8(offset+2));
                    frameSize = (view.getUint8(offset+3) << 16) | (view.getUint8(offset+4) << 8) | view.getUint8(offset+5);
                    offset += 6;
                } else if (version === 3 || version === 4) {
                    // ID3v2.3 / ID3v2.4
                    if (offset + 10 > limit) break;
                    frameId = String.fromCharCode(view.getUint8(offset), view.getUint8(offset+1), view.getUint8(offset+2), view.getUint8(offset+3));
                    frameSize = (view.getUint8(offset+4) << 24) | (view.getUint8(offset+5) << 16) | (view.getUint8(offset+6) << 8) | view.getUint8(offset+7);
                    // Handle unsynchronization scheme in v2.4 size if necessary (omitted for simplicity in this basic parser)
                    if (version === 4 && (frameSize & 0x80808080)) {
                         // Basic synchsafe decode
                         frameSize = ((view.getUint8(offset+4) & 0x7f) << 21) | ((view.getUint8(offset+5) & 0x7f) << 14) | ((view.getUint8(offset+6) & 0x7f) << 7) | (view.getUint8(offset+7) & 0x7f);
                    }
                    offset += 10;
                } else {
                    break;
                }

                if (frameId === 'APIC' || frameId === 'PIC') {
                    const mimeStart = offset + 1; // Skip encoding byte
                    let mimeEnd = mimeStart;
                    while (view.getUint8(mimeEnd) !== 0 && mimeEnd < limit) mimeEnd++;
                    const mimeType = new TextDecoder().decode(buffer.slice(mimeStart, mimeEnd)) || 'image/jpeg';
                    
                    let contentStart = mimeEnd + 1;
                    // Skip picture type byte
                    contentStart++; 
                    // Skip description (search for null terminator)
                    while (view.getUint8(contentStart) !== 0 && contentStart < limit) contentStart++;
                    contentStart++; // Skip the null terminator

                    const imageBuffer = buffer.slice(contentStart, offset + frameSize);
                    const blob = new Blob([imageBuffer], { type: mimeType });
                    resolve(URL.createObjectURL(blob));
                    return;
                }

                offset += frameSize;
            }
            resolve(undefined);
        };
        
        // Read first 500KB (usually enough for headers + art)
        const slice = file.slice(0, 500 * 1024);
        reader.readAsArrayBuffer(slice);
    });
};

export const useAudioPlayer = () => {
  // Playlist State
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string>(''); // What user sees
  const [playingPlaylistId, setPlayingPlaylistId] = useState<string>(''); // What audio plays
  
  // Track State
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
  const audioRefA = useRef<HTMLAudioElement>(null);
  const audioRefB = useRef<HTMLAudioElement>(null);
  
  // Refs for logic
  const activeDeckRef = useRef<Deck>('A');
  const isCrossfadingRef = useRef(false);
  const hasTriggeredAutoMixRef = useRef(false); 
  const crossfadeTimeoutRef = useRef<number | null>(null); 
  
  // Refs for Web Audio API
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceARef = useRef<MediaElementAudioSourceNode | null>(null);
  const sourceBRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainARef = useRef<GainNode | null>(null);
  const gainBRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null); // New Master Gain
  const analyserRef = useRef<AnalyserNode | null>(null); // Analyser Ref for immediate access
  
  // --- AUX INPUT (System Audio) ---
  const auxSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const auxGainRef = useRef<GainNode | null>(null);

  // Helper to get tracks of currently PLAYING playlist (for audio engine)
  const getPlayingTracks = useCallback(() => {
      const p = playlists.find(pl => pl.id === playingPlaylistId);
      return p ? p.tracks : [];
  }, [playlists, playingPlaylistId]);

  // Helper to get tracks of currently VISIBLE playlist (for UI list)
  const getVisibleTracks = useCallback(() => {
      const p = playlists.find(pl => pl.id === activePlaylistId);
      return p ? p.tracks : [];
  }, [playlists, activePlaylistId]);

  // Persist settings & Update Master Volume
  useEffect(() => {
    localStorage.setItem('neon_volume', volume.toString());
    if (masterGainRef.current && audioContextRef.current) {
        const now = audioContextRef.current.currentTime;
        masterGainRef.current.gain.setTargetAtTime(volume, now, 0.05);
    }
  }, [volume]);
  
  useEffect(() => {
     localStorage.setItem('neon_crossfade', crossfadeDuration.toString());
  }, [crossfadeDuration]);

  // --- PERSISTENCE: Save State on Change ---
  useEffect(() => {
      // Only save if we have loaded playlists
      if (playlists.length > 0) {
          const state = {
              activePlaylistId,
              playingPlaylistId,
              currentTrackIndex,
              currentTime
          };
          localStorage.setItem(RESUME_KEY, JSON.stringify(state));
      }
  }, [activePlaylistId, playingPlaylistId, currentTrackIndex, currentTime, playlists]);

  // INITIAL LOAD (Existing logic preserved...)
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedPlaylists = await getAllPlaylists();
        const savedTracks = await getAllTracks();
        
        let hydratedPlaylists: Playlist[] = [];

        if (savedPlaylists.length === 0) {
            const defaultId = crypto.randomUUID();
            const defaultPl = { id: defaultId, name: 'MAIN DECK', order: 0 };
            await savePlaylist(defaultPl);
            
            // Process saved tracks to get artwork if needed (lazy load or just map)
            // For now, we don't re-extract on load to save time, we assume user adds files
            // or we could store artwork in DB (not implemented to save space in this demo)
            
            const migratedTracks: AudioTrack[] = [];
            for (const t of savedTracks) {
                // Attempt to re-extract cover art on load since we don't store blob URL permanently in DB text
                const artUrl = await extractCoverArt(t.file);
                
                const updated = { 
                    ...t, 
                    playlistId: defaultId, 
                    url: URL.createObjectURL(t.file),
                    artworkUrl: artUrl
                };
                await saveTrack({ id: updated.id, playlistId: defaultId, name: updated.name, file: updated.file });
                migratedTracks.push(updated);
            }
            
            hydratedPlaylists = [{ ...defaultPl, tracks: migratedTracks }];
        } else {
            // Re-hydrate playlists
            // We need to re-extract art for saved files
            const processedTracks = await Promise.all(savedTracks.map(async t => ({
                ...t,
                url: URL.createObjectURL(t.file),
                artworkUrl: await extractCoverArt(t.file)
            })));

            hydratedPlaylists = savedPlaylists.map(pl => ({
                ...pl,
                tracks: processedTracks.filter(t => t.playlistId === pl.id)
            }));
        }
        
        setPlaylists(hydratedPlaylists);

        const savedStateStr = localStorage.getItem(RESUME_KEY);
        let restoreSuccess = false;

        if (savedStateStr) {
            try {
                const savedState = JSON.parse(savedStateStr);
                const { activePlaylistId: sActive, playingPlaylistId: sPlaying, currentTrackIndex: sIndex, currentTime: sTime } = savedState;

                const activeExists = hydratedPlaylists.some(p => p.id === sActive);
                const playingPl = hydratedPlaylists.find(p => p.id === sPlaying);
                
                if (activeExists && playingPl) {
                    setActivePlaylistId(sActive);
                    setPlayingPlaylistId(sPlaying);
                    
                    if (playingPl.tracks[sIndex]) {
                        setCurrentTrackIndex(sIndex);
                        if (audioRefA.current) {
                            audioRefA.current.src = playingPl.tracks[sIndex].url;
                            audioRefA.current.currentTime = sTime || 0;
                            setCurrentTime(sTime || 0);
                        }
                        restoreSuccess = true;
                    }
                }
            } catch (e) {
                console.warn("Failed to restore player state", e);
            }
        }

        if (!restoreSuccess) {
            setActivePlaylistId(hydratedPlaylists[0].id);
            setPlayingPlaylistId(hydratedPlaylists[0].id);
            const initialTracks = hydratedPlaylists[0].tracks;
            if (initialTracks.length > 0) {
                setCurrentTrackIndex(0);
                if (audioRefA.current) {
                    audioRefA.current.src = initialTracks[0].url;
                    audioRefA.current.load();
                }
            }
        }
        
        activeDeckRef.current = 'A';
        setIsPlaying(false);
      } catch (err) {
        console.error("Error loading data:", err);
      }
    };
    loadData();
  }, []);

  // Initialize Web Audio API
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const context = new AC();
      audioContextRef.current = context;
      
      const analyserNode = context.createAnalyser();
      analyserNode.smoothingTimeConstant = 0.6; 
      setAnalyser(analyserNode);
      analyserRef.current = analyserNode; // Sync ref

      const gainA = context.createGain();
      const gainB = context.createGain();
      const masterGain = context.createGain();
      
      // --- ROUTING FIX FOR SYSTEM AUDIO ---
      // We split into two parallel paths:
      
      // 1. AUDIO OUTPUT PATH (To Speakers)
      // Only the internal decks (A & B) go to the master gain and speakers.
      gainA.connect(masterGain);
      gainB.connect(masterGain);
      masterGain.connect(context.destination);

      // 2. VISUALIZATION PATH (To Analyser)
      // Decks A & B also go to the analyser.
      // Important: Analyser is NOT connected to destination anymore.
      gainA.connect(analyserNode);
      gainB.connect(analyserNode);

      gainARef.current = gainA;
      gainBRef.current = gainB;
      masterGainRef.current = masterGain;

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
      
      // Initialize Gains
      masterGain.gain.value = volume;
      gainA.gain.value = activeDeckRef.current === 'A' ? 1 : 0;
      gainB.gain.value = activeDeckRef.current === 'B' ? 1 : 0;
    }
    
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, [volume]);

  // --- CONNECT SYSTEM AUDIO (AUX) ---
  const connectAuxSource = useCallback((stream: MediaStream | null) => {
      initAudio(); // Ensure context exists
      const ctx = audioContextRef.current;
      const analyserNode = analyserRef.current; // Get from ref for guaranteed access

      if (!ctx) return;

      // Disconnect previous
      if (auxSourceRef.current) {
          auxSourceRef.current.disconnect();
          auxSourceRef.current = null;
      }
      if (auxGainRef.current) {
          auxGainRef.current.disconnect();
          auxGainRef.current = null;
      }

      if (stream) {
          try {
              const source = ctx.createMediaStreamSource(stream);
              const gain = ctx.createGain();
              
              // FORCE 100% Volume for Analyser Input
              gain.gain.value = 1.0;

              // Connect Source -> Gain
              source.connect(gain);

              // 1. Connect Gain -> Analyser (For Visualization)
              if (analyserNode) {
                  gain.connect(analyserNode);
              }

              // 2. DO NOT Connect to Destination (Speakers)
              // Since the routing logic in initAudio now decouples Analyser from Destination,
              // simply connecting to Analyser here will visualize the sound without playing it back.
              
              auxSourceRef.current = source;
              auxGainRef.current = gain;

          } catch (e) {
              console.error("Failed to connect AUX source", e);
          }
      }
  }, [initAudio]);

  // Empty placeholder to keep interface consistent
  const updateAuxVolume = useCallback((_volume: number) => {}, []);
  const updateAuxMonitor = useCallback((_monitor: boolean) => {}, []);


  // --- CROSSFADE LOGIC (Existing...) ---
  const performCrossfade = useCallback((toTrackIndex: number, specificTracks?: AudioTrack[]) => {
      initAudio();
      const tracksToUse = specificTracks || getPlayingTracks();
      if (!tracksToUse[toTrackIndex] || !audioContextRef.current || !gainARef.current || !gainBRef.current) return;

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

      nextAudio.src = tracksToUse[toTrackIndex].url;
      nextAudio.currentTime = 0;

      isCrossfadingRef.current = true;
      hasTriggeredAutoMixRef.current = true;

      if (crossfadeDuration === 0) {
         const now = audioContextRef.current.currentTime;
         activeGain.gain.cancelScheduledValues(now);
         nextGain.gain.cancelScheduledValues(now);
         activeGain.gain.setValueAtTime(0, now);
         nextGain.gain.setValueAtTime(1, now); 

         nextAudio.play()
            .then(() => setIsPlaying(true))
            .catch(e => console.error("Hard play failed", e));
            
         activeAudio.pause();
         activeAudio.currentTime = 0;
         
         activeDeckRef.current = nextDeck;
         setCurrentTrackIndex(toTrackIndex);
         
         isCrossfadingRef.current = false;
         hasTriggeredAutoMixRef.current = false;
         return; 
      }

      nextAudio.play().then(() => {
          setIsPlaying(true);
          const now = audioContextRef.current!.currentTime;
          const fadeTime = crossfadeDuration; 

          activeGain.gain.cancelScheduledValues(now);
          nextGain.gain.cancelScheduledValues(now);

          activeGain.gain.setValueAtTime(activeGain.gain.value, now);
          activeGain.gain.linearRampToValueAtTime(0, now + fadeTime);

          nextGain.gain.setValueAtTime(nextGain.gain.value, now);
          nextGain.gain.linearRampToValueAtTime(1, now + fadeTime); 

          activeDeckRef.current = nextDeck;
          setCurrentTrackIndex(toTrackIndex);
          
          setTimeout(() => { 
             hasTriggeredAutoMixRef.current = false; 
          }, 1000);

          crossfadeTimeoutRef.current = window.setTimeout(() => {
             activeAudio.pause();
             activeAudio.currentTime = 0;
             isCrossfadingRef.current = false;
             crossfadeTimeoutRef.current = null;
             
             const finalNow = audioContextRef.current?.currentTime || 0;
             activeGain.gain.setValueAtTime(0, finalNow);
             nextGain.gain.setValueAtTime(1, finalNow);

          }, fadeTime * 1000 + 100); 

      }).catch(e => {
          console.error("Crossfade play failed", e);
          isCrossfadingRef.current = false;
      });

  }, [getPlayingTracks, volume, crossfadeDuration, initAudio]);

  const togglePlay = useCallback(() => {
    initAudio();
    const activeAudio = activeDeckRef.current === 'A' ? audioRefA.current : audioRefB.current;
    
    if (!activeAudio?.src || activeAudio.src === window.location.href) {
        const tracks = getPlayingTracks();
        if (tracks.length > 0) {
            selectTrack(0);
            return;
        }
    }

    if (isPlaying) {
      activeAudio?.pause();
      setIsPlaying(false);
    } else {
      activeAudio?.play().catch(console.warn);
      setIsPlaying(true);
      
      if (gainARef.current && gainBRef.current) {
         const now = audioContextRef.current?.currentTime || 0;
         const activeGain = activeDeckRef.current === 'A' ? gainARef.current : gainBRef.current;
         const inactiveGain = activeDeckRef.current === 'A' ? gainBRef.current : gainARef.current;
         activeGain.gain.cancelScheduledValues(now);
         inactiveGain.gain.cancelScheduledValues(now);
         activeGain.gain.setValueAtTime(1, now);
         inactiveGain.gain.setValueAtTime(0, now);
      }
    }
  }, [isPlaying, initAudio, volume, getPlayingTracks]);

  const nextTrack = useCallback(() => {
    if (activePlaylistId !== playingPlaylistId) {
        const newPlaylist = playlists.find(p => p.id === activePlaylistId);
        if (newPlaylist && newPlaylist.tracks.length > 0) {
            setPlayingPlaylistId(activePlaylistId);
            
            if (isPlaying) {
                performCrossfade(0, newPlaylist.tracks);
            } else {
                setCurrentTrackIndex(0);
                const nextDeck = activeDeckRef.current;
                const audio = nextDeck === 'A' ? audioRefA.current : audioRefB.current;
                if (audio) {
                    audio.src = newPlaylist.tracks[0].url;
                    audio.currentTime = 0;
                }
            }
            hasTriggeredAutoMixRef.current = false;
            return;
        }
    }

    const currentTracks = getPlayingTracks();
    if (currentTracks.length === 0) return;
    
    const nextIndex = (currentTrackIndex + 1) % currentTracks.length;
    
    if (isPlaying) {
        performCrossfade(nextIndex);
    } else {
        setCurrentTrackIndex(nextIndex);
        const nextDeck = activeDeckRef.current; 
        const audio = nextDeck === 'A' ? audioRefA.current : audioRefB.current;
        if (audio) {
            audio.src = currentTracks[nextIndex].url;
            audio.currentTime = 0;
        }
        hasTriggeredAutoMixRef.current = false;
    }
  }, [getPlayingTracks, currentTrackIndex, isPlaying, performCrossfade, activePlaylistId, playingPlaylistId, playlists]);

  const prevTrack = useCallback(() => {
    const currentTracks = getPlayingTracks();
    if (currentTracks.length === 0) return;
    const prevIndex = (currentTrackIndex - 1 + currentTracks.length) % currentTracks.length;
    
    if (isPlaying) {
        performCrossfade(prevIndex);
    } else {
        setCurrentTrackIndex(prevIndex);
        const nextDeck = activeDeckRef.current;
        const audio = nextDeck === 'A' ? audioRefA.current : audioRefB.current;
        if (audio) {
            audio.src = currentTracks[prevIndex].url;
            audio.currentTime = 0;
        }
        hasTriggeredAutoMixRef.current = false;
    }
  }, [getPlayingTracks, currentTrackIndex, isPlaying, performCrossfade]);

  const selectTrack = useCallback((index: number) => {
      let tracksToPlay = getPlayingTracks();
      
      if (activePlaylistId !== playingPlaylistId) {
          const newPlaylist = playlists.find(p => p.id === activePlaylistId);
          if (newPlaylist) {
              setPlayingPlaylistId(activePlaylistId);
              tracksToPlay = newPlaylist.tracks;
          }
      }

      if (!tracksToPlay[index]) return;

      if (index === currentTrackIndex && activePlaylistId === playingPlaylistId) {
          if (!isPlaying) togglePlay();
          return;
      }
      
      if (isPlaying) {
          performCrossfade(index, tracksToPlay);
      } else {
          const nextDeck = activeDeckRef.current;
          const audio = nextDeck === 'A' ? audioRefA.current : audioRefB.current;
          if (audio) {
              audio.src = tracksToPlay[index].url;
              audio.currentTime = 0;
              initAudio();
              audio.play();
              setIsPlaying(true);
              
              if (gainARef.current && gainBRef.current) {
                 const now = audioContextRef.current?.currentTime || 0;
                 const activeGain = activeDeckRef.current === 'A' ? gainARef.current : gainBRef.current;
                 const inactiveGain = activeDeckRef.current === 'A' ? gainBRef.current : gainARef.current;
                 activeGain.gain.cancelScheduledValues(now);
                 inactiveGain.gain.cancelScheduledValues(now);
                 activeGain.gain.setValueAtTime(1, now);
                 inactiveGain.gain.setValueAtTime(0, now);
              }
          }
          setCurrentTrackIndex(index);
          hasTriggeredAutoMixRef.current = false;
      }
  }, [currentTrackIndex, isPlaying, performCrossfade, getPlayingTracks, activePlaylistId, playingPlaylistId, playlists, initAudio, togglePlay]);

  const seek = useCallback((time: number) => {
    const audio = activeDeckRef.current === 'A' ? audioRefA.current : audioRefB.current;
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
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
  
  // --- FILE MANAGEMENT ---
  const processAudioFiles = async (files: File[]) => {
    let targetPlaylistId = activePlaylistId;
    if (!targetPlaylistId) {
        const plId = crypto.randomUUID();
        const pl = { id: plId, name: 'NEW DECK', order: playlists.length };
        await savePlaylist(pl);
        setPlaylists(prev => [...prev, { ...pl, tracks: [] }]);
        setActivePlaylistId(plId);
        setPlayingPlaylistId(plId);
        targetPlaylistId = plId;
    }

    const newTracks: AudioTrack[] = [];
    for (const file of files) {
        const artUrl = await extractCoverArt(file);
        newTracks.push({ 
            id: crypto.randomUUID(), 
            playlistId: targetPlaylistId,
            name: file.name, 
            url: URL.createObjectURL(file), 
            file,
            artworkUrl: artUrl
        });
    }

    for (const t of newTracks) {
        await saveTrack({ id: t.id, playlistId: t.playlistId, name: t.name, file: t.file });
    }

    setPlaylists(prev => prev.map(pl => {
        if (pl.id === targetPlaylistId) {
            const updatedTracks = [...pl.tracks, ...newTracks];
            if (pl.id === playingPlaylistId && pl.tracks.length === 0 && updatedTracks.length > 0) {
                 setCurrentTrackIndex(0);
                 if (audioRefA.current) {
                     audioRefA.current.src = updatedTracks[0].url;
                     audioRefA.current.load();
                 }
                 initAudio();
            }
            return { ...pl, tracks: updatedTracks };
        }
        return pl;
    }));
  };

  const insertAudioFiles = async (files: File[], insertIndex: number) => {
      if (!activePlaylistId) {
          // If no playlist exists, fall back to simple append which creates one
          processAudioFiles(files);
          return;
      }

      const newTracks: AudioTrack[] = [];
      for (const file of files) {
          const artUrl = await extractCoverArt(file);
          newTracks.push({
              id: crypto.randomUUID(),
              playlistId: activePlaylistId,
              name: file.name,
              url: URL.createObjectURL(file),
              file,
              artworkUrl: artUrl
          });
      }

      await saveTracksBulk(newTracks.map(t => ({ id: t.id, playlistId: t.playlistId, name: t.name, file: t.file })));

      setPlaylists(prev => prev.map(pl => {
          if (pl.id === activePlaylistId) {
              const updatedTracks = [...pl.tracks];
              // Insert new tracks at specific index
              updatedTracks.splice(insertIndex, 0, ...newTracks);
              
              // Handle first track logic if playlist was empty
              if (pl.id === playingPlaylistId && pl.tracks.length === 0 && updatedTracks.length > 0) {
                  setCurrentTrackIndex(0);
                  if (audioRefA.current) {
                      audioRefA.current.src = updatedTracks[0].url;
                      audioRefA.current.load();
                  }
                  initAudio();
              }
              // Adjust current index if we inserted ABOVE the current playing track
              else if (pl.id === playingPlaylistId && currentTrackIndex >= insertIndex) {
                  setCurrentTrackIndex(prevIndex => prevIndex + newTracks.length);
              }

              return { ...pl, tracks: updatedTracks };
          }
          return pl;
      }));
  };

  const createPlaylistFromFiles = async (files: File[]) => {
      const plId = crypto.randomUUID();
      const plName = `DECK ${playlists.length + 1}`;
      const newPlaylist: Playlist = { id: plId, name: plName, order: playlists.length, tracks: [] };
      
      await savePlaylist(newPlaylist);
      
      const newTracks: AudioTrack[] = [];
      for (const file of files) {
          const artUrl = await extractCoverArt(file);
          newTracks.push({ 
              id: crypto.randomUUID(), 
              playlistId: plId,
              name: file.name, 
              url: URL.createObjectURL(file), 
              file,
              artworkUrl: artUrl
          });
      }

      await saveTracksBulk(newTracks.map(t => ({ id: t.id, playlistId: t.playlistId, name: t.name, file: t.file })));

      setPlaylists(prev => [...prev, { ...newPlaylist, tracks: newTracks }]);
      setActivePlaylistId(plId);
  };

  const clearPlaylist = useCallback(async () => {
    if (activePlaylistId === playingPlaylistId) {
        stop();
        [audioRefA.current, audioRefB.current].forEach(a => {
            if (a) { a.removeAttribute('src'); a.load(); }
        });
        setCurrentTrackIndex(-1);
    }
    
    const visibleTracks = getVisibleTracks();
    visibleTracks.forEach(t => URL.revokeObjectURL(t.url));

    await clearTracksInPlaylist(activePlaylistId);

    setPlaylists(prev => prev.map(pl => {
        if (pl.id === activePlaylistId) return { ...pl, tracks: [] };
        return pl;
    }));
  }, [activePlaylistId, playingPlaylistId, getVisibleTracks, stop]);
  
  const sortTracks = useCallback(() => {
    setPlaylists(prev => prev.map(pl => {
        if (pl.id === activePlaylistId) {
            const shouldUpdateIndex = pl.id === playingPlaylistId;
            const currentId = shouldUpdateIndex ? pl.tracks[currentTrackIndex]?.id : null;
            
            const sorted = [...pl.tracks].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
            
            if (currentId) {
                const newIndex = sorted.findIndex(t => t.id === currentId);
                if (newIndex !== -1) setCurrentTrackIndex(newIndex);
            }
            return { ...pl, tracks: sorted };
        }
        return pl;
    }));
  }, [activePlaylistId, playingPlaylistId, currentTrackIndex]);

  const shuffleTracks = useCallback(() => {
    setPlaylists(prev => prev.map(pl => {
        if (pl.id === activePlaylistId) {
            const shouldUpdateIndex = pl.id === playingPlaylistId;
            const currentId = shouldUpdateIndex ? pl.tracks[currentTrackIndex]?.id : null;
            
            const shuffled = [...pl.tracks];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            
            if (currentId) {
                const newIndex = shuffled.findIndex(t => t.id === currentId);
                if (newIndex !== -1) setCurrentTrackIndex(newIndex);
            }
            return { ...pl, tracks: shuffled };
        }
        return pl;
    }));
  }, [activePlaylistId, playingPlaylistId, currentTrackIndex]);

  const removeTracks = useCallback(async (playlistId: string, trackIds: string[]) => {
      if (playlistId === playingPlaylistId) {
          const currentTrack = playlists.find(p => p.id === playlistId)?.tracks[currentTrackIndex];
          if (currentTrack && trackIds.includes(currentTrack.id)) {
              stop();
              setCurrentTrackIndex(-1);
          }
      }
      await deleteTracksBulk(trackIds);
      setPlaylists(prev => prev.map(pl => {
          if (pl.id === playlistId) {
              const remaining = pl.tracks.filter(t => {
                  if (trackIds.includes(t.id)) { URL.revokeObjectURL(t.url); return false; }
                  return true;
              });
              if (pl.id === playingPlaylistId && currentTrackIndex > -1) {
                  const currentId = pl.tracks[currentTrackIndex]?.id;
                  if (currentId && !trackIds.includes(currentId)) {
                      const newIndex = remaining.findIndex(t => t.id === currentId);
                      setCurrentTrackIndex(newIndex);
                  }
              }
              return { ...pl, tracks: remaining };
          }
          return pl;
      }));
  }, [playlists, playingPlaylistId, currentTrackIndex, stop]);

  const reorderTracks = useCallback((playlistId: string, sourceIndices: number[], targetIndex: number) => {
      setPlaylists(prev => prev.map(pl => {
          if (pl.id === playlistId) {
              const tracks = [...pl.tracks];
              const movedItems = sourceIndices.sort((a, b) => a - b).map(i => tracks[i]);
              for (let i = sourceIndices.length - 1; i >= 0; i--) { tracks.splice(sourceIndices[i], 1); }
              let insertAt = targetIndex;
              const itemsBeforeTarget = sourceIndices.filter(i => i < targetIndex).length;
              insertAt -= itemsBeforeTarget;
              tracks.splice(insertAt, 0, ...movedItems);
              if (pl.id === playingPlaylistId) {
                  const currentId = pl.tracks[currentTrackIndex]?.id;
                  if (currentId) {
                      const newIndex = tracks.findIndex(t => t.id === currentId);
                      setCurrentTrackIndex(newIndex);
                  }
              }
              return { ...pl, tracks };
          }
          return pl;
      }));
  }, [playingPlaylistId, currentTrackIndex]);

  const moveTracksToPlaylist = useCallback(async (sourcePlaylistId: string, trackIds: string[], targetPlaylistId: string) => {
      const sourcePl = playlists.find(p => p.id === sourcePlaylistId);
      const targetPl = playlists.find(p => p.id === targetPlaylistId);
      if (!sourcePl || !targetPl) return;
      const movingTracks = sourcePl.tracks.filter(t => trackIds.includes(t.id));
      const tracksToSave = movingTracks.map(t => ({ id: t.id, playlistId: targetPlaylistId, name: t.name, file: t.file }));
      await saveTracksBulk(tracksToSave);
      setPlaylists(prev => prev.map(pl => {
          if (pl.id === sourcePlaylistId) {
              const remaining = pl.tracks.filter(t => !trackIds.includes(t.id));
              if (pl.id === playingPlaylistId && currentTrackIndex > -1) {
                  const currentId = pl.tracks[currentTrackIndex]?.id;
                  if (currentId && trackIds.includes(currentId)) { stop(); setCurrentTrackIndex(-1); } 
                  else if (currentId) {
                      const newIndex = remaining.findIndex(t => t.id === currentId);
                      setCurrentTrackIndex(newIndex);
                  }
              }
              return { ...pl, tracks: remaining };
          }
          if (pl.id === targetPlaylistId) { return { ...pl, tracks: [...pl.tracks, ...movingTracks] }; }
          return pl;
      }));
  }, [playlists, playingPlaylistId, currentTrackIndex, stop]);

  const createPlaylistFromMove = useCallback(async (trackIds: string[], sourcePlaylistId: string) => {
      const sourcePl = playlists.find(p => p.id === sourcePlaylistId);
      if (!sourcePl) return;
      const plId = crypto.randomUUID();
      const plName = `DECK ${playlists.length + 1}`;
      const newPlaylist: Playlist = { id: plId, name: plName, order: playlists.length, tracks: [] };
      await savePlaylist(newPlaylist);
      const movingTracks = sourcePl.tracks.filter(t => trackIds.includes(t.id));
      const tracksToSave = movingTracks.map(t => ({ id: t.id, playlistId: plId, name: t.name, file: t.file }));
      await saveTracksBulk(tracksToSave);
      setPlaylists(prev => {
          const newPlState = { ...newPlaylist, tracks: movingTracks };
          return prev.map(pl => {
              if (pl.id === sourcePlaylistId) {
                  const remaining = pl.tracks.filter(t => !trackIds.includes(t.id));
                  return { ...pl, tracks: remaining };
              }
              return pl;
          }).concat(newPlState);
      });
      setActivePlaylistId(plId);
  }, [playlists]);

  const addPlaylist = async () => {
      const id = crypto.randomUUID();
      const name = `DECK ${playlists.length + 1}`;
      const newPl: Playlist = { id, name, order: playlists.length, tracks: [] };
      await savePlaylist(newPl);
      setPlaylists(prev => [...prev, newPl]);
      // Immediately switch to the new playlist
      setActivePlaylistId(id);
  };

  const removePlaylist = async (id: string) => {
      if (playlists.length <= 1) return; 
      const plToDelete = playlists.find(p => p.id === id);
      if (plToDelete) { plToDelete.tracks.forEach(t => URL.revokeObjectURL(t.url)); }
      await deletePlaylistAndTracks(id);
      setPlaylists(prev => {
          const filtered = prev.filter(p => p.id !== id);
          if (id === activePlaylistId) { const nextActive = filtered[0]; setActivePlaylistId(nextActive.id); }
          if (id === playingPlaylistId) {
             stop();
             const nextPlaying = filtered[0];
             setPlayingPlaylistId(nextPlaying.id);
             setCurrentTrackIndex(0);
             if (nextPlaying.tracks.length > 0 && audioRefA.current) {
                 audioRefA.current.src = nextPlaying.tracks[0].url;
                 audioRefA.current.load();
             }
          }
          return filtered;
      });
  };

  const renamePlaylist = async (id: string, newName: string) => {
      setPlaylists(prev => prev.map(p => {
          if (p.id === id) {
              const updated = { ...p, name: newName };
              savePlaylist({ id: updated.id, name: updated.name, order: updated.order });
              return updated;
          }
          return p;
      }));
  };

  const reorderPlaylists = async (dragIndex: number, hoverIndex: number) => {
      const cloned = [...playlists];
      const [removed] = cloned.splice(dragIndex, 1);
      cloned.splice(hoverIndex, 0, removed);
      const updated = cloned.map((p, idx) => ({ ...p, order: idx }));
      setPlaylists(updated);
      for (const p of updated) { await savePlaylist({ id: p.id, name: p.name, order: p.order }); }
  };

  const switchPlaylist = (id: string) => {
      if (id === activePlaylistId) return;
      setActivePlaylistId(id);
      if (!isPlaying) {
          setPlayingPlaylistId(id);
          const targetPl = playlists.find(p => p.id === id);
          if (targetPl && targetPl.tracks.length > 0) {
              setCurrentTrackIndex(0);
              const nextDeck = activeDeckRef.current;
              const audio = nextDeck === 'A' ? audioRefA.current : audioRefB.current;
              if (audio) { audio.src = targetPl.tracks[0].url; audio.currentTime = 0; audio.load(); }
          } else { setCurrentTrackIndex(-1); }
      }
  };

  // --- AUTOMATION LOOP ---
  const handleTimeUpdate = (_e: any, preventAutoMix = false) => {
      const active = activeDeckRef.current === 'A' ? audioRefA.current : audioRefB.current;
      if (active) {
          const ct = active.currentTime;
          const dur = active.duration;
          setCurrentTime(ct);
          if (dur) setDuration(dur);
          if (!preventAutoMix && isPlaying && dur > 0 && crossfadeDuration > 0) {
              if (ct >= dur - crossfadeDuration && !hasTriggeredAutoMixRef.current && !isCrossfadingRef.current) { nextTrack(); }
          }
      }
  };

  const onAudioPlay = useCallback(() => {
      if (!isPlaying) setIsPlaying(true);
      initAudio(); 
  }, [isPlaying, initAudio]);

  const onAudioPause = useCallback((e: SyntheticEvent<HTMLAudioElement>) => {
      const activeElement = activeDeckRef.current === 'A' ? audioRefA.current : audioRefB.current;
      if (activeElement && e.target !== activeElement) { return; }
      if (isPlaying && !isCrossfadingRef.current) setIsPlaying(false);
  }, [isPlaying]);

  const visibleTracks = getVisibleTracks();
  const currentTrack = getPlayingTracks()[currentTrackIndex];

  return {
    audioRefA,
    audioRefB,
    tracks: visibleTracks, // UI List
    playlists,
    activePlaylistId,
    playingPlaylistId,
    currentTrackIndex,
    currentTrack,
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
    insertAudioFiles, // Exposed new function
    createPlaylistFromFiles,
    createPlaylistFromMove,
    clearPlaylist,
    addPlaylist,
    removePlaylist,
    renamePlaylist,
    reorderPlaylists,
    switchPlaylist,
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
    onAudioPause,
    removeTracks,
    reorderTracks,
    moveTracksToPlaylist,
    connectAuxSource,
    updateAuxVolume,
    updateAuxMonitor
  };
};
