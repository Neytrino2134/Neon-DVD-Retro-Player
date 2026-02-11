
import { useState, useEffect, useRef, useMemo } from 'react';
import { BgTransitionType, AudioTrack } from '../types';

interface UseMediaTransitionProps {
  bgMedia: { type: 'image' | 'video', url: string, hotspots?: any[] } | null;
  videoStream?: MediaStream | null;
  streamMode?: 'bg' | 'window';
  useAlbumArtAsBackground?: boolean;
  currentTrack?: AudioTrack;
}

export const useMediaTransition = ({ 
  bgMedia, 
  videoStream, 
  streamMode, 
  useAlbumArtAsBackground, 
  currentTrack 
}: UseMediaTransitionProps) => {
  
  // Calculate Effective Media
  const effectiveMedia = useMemo(() => {
      if (useAlbumArtAsBackground && currentTrack?.artworkUrl) {
          return { type: 'image' as const, url: currentTrack.artworkUrl, hotspots: [] };
      }
      return bgMedia;
  }, [useAlbumArtAsBackground, currentTrack, bgMedia]);

  const [baseMedia, setBaseMedia] = useState(effectiveMedia);
  const [overlayMedia, setOverlayMedia] = useState<typeof effectiveMedia | null>(null);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const [bgTransition, setBgTransition] = useState<BgTransitionType>('glitch');
  
  // Store multiple timeout IDs to clear complex sequences
  const timeoutsRef = useRef<number[]>([]);

  const addTimeout = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms);
      timeoutsRef.current.push(id);
      return id;
  };

  const clearTimeouts = () => {
      timeoutsRef.current.forEach(window.clearTimeout);
      timeoutsRef.current = [];
  };

  // Sync transition type from storage
  useEffect(() => {
      const load = () => {
          const stored = localStorage.getItem('neon_bg_transition');
          if (stored) {
              try { 
                  setBgTransition(JSON.parse(stored)); 
              } catch (e) {
                  console.warn("Failed to parse transition type", e);
              }
          }
      };
      load();
      window.addEventListener('storage', load);
      return () => window.removeEventListener('storage', load);
  }, [effectiveMedia]); 

  // Main Transition Logic
  useEffect(() => {
    if (videoStream && streamMode === 'bg') {
        setBaseMedia(effectiveMedia);
        setOverlayMedia(null);
        setIsCrossfading(false);
        return;
    }

    const currentTarget = overlayMedia || baseMedia;
    
    // URL Check to prevent transitioning to same media
    if (effectiveMedia?.url === currentTarget?.url) {
        const currentHotspots = JSON.stringify(currentTarget?.hotspots || []);
        const newHotspots = JSON.stringify(effectiveMedia?.hotspots || []);
        
        if (currentHotspots !== newHotspots) {
            setBaseMedia(effectiveMedia);
        }
        return;
    }

    // Get fresh transition type
    const stored = localStorage.getItem('neon_bg_transition');
    const currentTransitionType = stored ? JSON.parse(stored) as BgTransitionType : 'glitch';
    setBgTransition(currentTransitionType);

    // Clear previous sequences
    clearTimeouts();

    if (currentTransitionType === 'leaks') {
        // --- LEAKS TRANSITION ---
        setOverlayMedia(effectiveMedia);
        
        // 1. Wait for Overlay to buffer
        addTimeout(() => {
             setIsCrossfading(true);
             
             // 2. Wait for Fade In to mostly complete
             addTimeout(() => {
                setBaseMedia(effectiveMedia);
                
                // 3. Wait for Base to buffer (Extended to prevent flash)
                addTimeout(() => {
                    // Fade out overlay
                    setIsCrossfading(false);
                    
                    // 4. Remove overlay after fade out
                    addTimeout(() => {
                        setOverlayMedia(null);
                    }, 1000); // 1s fade out duration
                    
                }, 1500); 
                
             }, 1200);
             
        }, 150); 

    } else if (currentTransitionType === 'crossfade') {
        // --- CROSSFADE TRANSITION (SMOOTH) ---
        setOverlayMedia(effectiveMedia);
        
        // 1. Buffer & Start Fade In
        addTimeout(() => {
             setIsCrossfading(true);
             
             // 2. Wait for Fade In (2s)
             addTimeout(() => {
                setBaseMedia(effectiveMedia);
                
                // 3. Wait for Base to buffer (Extended)
                // Keeping overlay opaque covering the base update
                addTimeout(() => {
                    // 4. Start Fade Out of Overlay (Reveal Base)
                    setIsCrossfading(false);
                    
                    // 5. Cleanup Overlay after fade out
                    addTimeout(() => {
                        setOverlayMedia(null);
                    }, 2000); // Matches CSS transition time
                    
                }, 1500); 
                
             }, 2000);
             
        }, 600); 

    } else if (currentTransitionType === 'black' || currentTransitionType === 'blur') {
        // --- BLACK / BLUR TRANSITIONS (Sequential) ---
        setTransitionPhase('out');

        addTimeout(() => {
            setBaseMedia(effectiveMedia); 
            
            // Buffer while hidden
            addTimeout(() => {
                setTransitionPhase('in'); 
                
                addTimeout(() => {
                    setTransitionPhase('idle');
                }, 1000);
                
            }, 500); // Increased buffer

        }, 1000); 

    } else if (currentTransitionType === 'none') {
        // --- NO TRANSITION ---
        setBaseMedia(effectiveMedia);
        setOverlayMedia(null);
        setIsCrossfading(false);
    } else {
        // --- GLITCH TRANSITION ---
        setOverlayMedia(effectiveMedia); 
        setTransitionPhase('out'); 
        
        requestAnimationFrame(() => {
             requestAnimationFrame(() => {
                 setIsCrossfading(true);
             });
        });

        const PHASE_DURATION = 1200; 

        addTimeout(() => {
            setBaseMedia(effectiveMedia); 
            setTransitionPhase('in'); 
            
            // Wait for Base to load before removing Overlay
            // Glitch overlay is messy so exact frame sync is less critical, 
            // but holding it longer is safer.
            addTimeout(() => {
                setOverlayMedia(null);
                setIsCrossfading(false);
                setTransitionPhase('idle');
            }, PHASE_DURATION);
            
        }, PHASE_DURATION); 
    }
    
    return () => clearTimeouts();
  }, [effectiveMedia, videoStream, streamMode]);

  return {
    baseMedia,
    overlayMedia,
    isCrossfading,
    transitionPhase,
    bgTransition,
    activeStream: (videoStream && streamMode === 'bg') ? videoStream : null
  };
};
