
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
  
  const transitionTimerRef = useRef<number | null>(null);

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

    // Clear previous timers
    if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
    }

    if (currentTransitionType === 'leaks') {
        // --- LEAKS TRANSITION ---
        setOverlayMedia(effectiveMedia);
        
        // CRITICAL FIX: Give video element 150ms to mount and start playing before fading in.
        // This prevents the "jerk" or black frame on video switch.
        transitionTimerRef.current = window.setTimeout(() => {
             setIsCrossfading(true);
             
             // Swap after fade is mostly done
             window.setTimeout(() => {
                setBaseMedia(effectiveMedia);
                
                // Cleanup overlay after swap
                window.setTimeout(() => {
                    setOverlayMedia(null);
                    setIsCrossfading(false);
                }, 800);
                
             }, 1200);
             
        }, 150); 

    } else if (currentTransitionType === 'crossfade') {
        // --- CROSSFADE TRANSITION ---
        // 1. Set overlay to new media (opacity 0 initially)
        setOverlayMedia(effectiveMedia);
        
        // 2. Trigger opacity fade to 1 after buffering delay
        transitionTimerRef.current = window.setTimeout(() => {
             setIsCrossfading(true);
             
             // 3. Swap after fade duration (standard 2s for smoothness)
             window.setTimeout(() => {
                setBaseMedia(effectiveMedia);
                setOverlayMedia(null);
                setIsCrossfading(false); // Reset crossfade trigger
             }, 2000);
             
        }, 150); // 150ms pre-buffer delay

    } else if (currentTransitionType === 'black' || currentTransitionType === 'blur') {
        // --- BLACK / BLUR TRANSITIONS (Sequential) ---
        // 1. Fade OUT existing media (handled by CSS in RetroScreen based on phase)
        setTransitionPhase('out');

        // 2. Wait for fade out
        transitionTimerRef.current = window.setTimeout(() => {
            // Swap source while invisible/blurred
            setBaseMedia(effectiveMedia); 
            
            // Give the new media a moment to load while hidden
            window.setTimeout(() => {
                // 3. Fade IN new media
                setTransitionPhase('in'); 
                
                // 4. Reset to Idle
                window.setTimeout(() => {
                    setTransitionPhase('idle');
                }, 1000);
                
            }, 200); // Buffer while hidden

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
        
        // Slight delay for glitch overlay to initialize
        requestAnimationFrame(() => {
             requestAnimationFrame(() => {
                 setIsCrossfading(true);
             });
        });

        const PHASE_DURATION = 1200; 

        transitionTimerRef.current = window.setTimeout(() => {
            setBaseMedia(effectiveMedia); 
            setTransitionPhase('in'); 
            
            window.setTimeout(() => {
                setOverlayMedia(null);
                setIsCrossfading(false);
                setTransitionPhase('idle');
            }, PHASE_DURATION);
            
        }, PHASE_DURATION); 
    }
    
    return () => {
        if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
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
