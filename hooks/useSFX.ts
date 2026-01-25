

import { useState, useEffect, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import { saveSFX, getAllSFX } from '../lib/db';
import { useNotification } from '../contexts/NotificationContext';

export const REQUIRED_SFX_FILES = [
  'Binary_Code_Sound_Effects_Reboot',
  'Binary_Code_Sound_Effects_Start',
  'Boing_0',
  'Boing_1',
  'Boing_2'
];

export const useSFX = () => {
  const [sfxMap, setSfxMap] = useState<Record<string, string>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const activeAudioRef = useRef<HTMLAudioElement[]>([]);
  const { addNotification } = useNotification();

  // Load SFX from DB on mount
  useEffect(() => {
    const loadFromDB = async () => {
      try {
        const storedSFX = await getAllSFX();
        const newMap: Record<string, string> = {};
        
        storedSFX.forEach(item => {
          newMap[item.id] = URL.createObjectURL(item.blob);
        });

        setSfxMap(newMap);
        setIsLoaded(true);
      } catch (e) {
        console.error("Failed to load SFX from DB", e);
      }
    };
    loadFromDB();
  }, []);

  // Handle ZIP upload
  const handleZipUpload = useCallback(async (file: File) => {
    try {
      addNotification("Processing SFX Archive...", "info");
      const zip = new JSZip();
      const unzipped = await zip.loadAsync(file);
      
      const newMap: Record<string, string> = { ...sfxMap };
      let count = 0;
      
      const promises: Promise<void>[] = [];

      unzipped.forEach((relativePath: string, zipEntry: JSZip.JSZipObject) => {
        const name = zipEntry.name.toLowerCase();
        if (relativePath && !zipEntry.dir && (
            name.endsWith('.wav') || 
            name.endsWith('.mp3') || 
            name.endsWith('.m4a') || 
            name.endsWith('.ogg')
        )) {
           const p = zipEntry.async('blob').then(async (blob: Blob) => {
               // Determine ID (filename)
               const fileName = zipEntry.name.split('/').pop() || zipEntry.name;
               
               // Save to DB
               await saveSFX({ id: fileName, blob });
               
               // Update local state
               newMap[fileName] = URL.createObjectURL(blob);
               count++;
           });
           promises.push(p);
        }
      });

      await Promise.all(promises);
      setSfxMap(newMap);
      
      if (count > 0) {
        addNotification(`SFX Pack Loaded: ${count} files`, "success");
      } else {
        addNotification("No audio files (wav/mp3/m4a) found", "warning");
      }
      
    } catch (e) {
      console.error("Failed to unzip or save SFX", e);
      addNotification("Failed to process SFX ZIP", "error");
    }
  }, [sfxMap, addNotification]);

  // Stop all currently playing SFX
  const stopAllSFX = useCallback(() => {
    activeAudioRef.current.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    activeAudioRef.current = [];
  }, []);

  // Play SFX with fuzzy matching for extensions
  const playSFX = useCallback((filenameWithExtension: string) => {
    // 1. Try exact match
    let url = sfxMap[filenameWithExtension];

    // 2. Fallback: Try matching base name if exact match fails
    // (e.g. system asks for 'Start.wav' but user uploaded 'Start.mp3')
    if (!url) {
        const baseName = filenameWithExtension.substring(0, filenameWithExtension.lastIndexOf('.'));
        const foundKey = Object.keys(sfxMap).find(k => k.startsWith(baseName));
        if (foundKey) {
            url = sfxMap[foundKey];
        }
    }

    if (!url) {
        return;
    }

    try {
        const audio = new Audio(url);
        audio.volume = 0.6; // Slightly lower than music
        
        activeAudioRef.current.push(audio);
        
        // Remove from tracking when ended
        audio.onended = () => {
          activeAudioRef.current = activeAudioRef.current.filter(a => a !== audio);
        };

        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // Autoplay policy or other error - silently fail
                console.warn("SFX playback failed (autoplay policy?)", error);
                activeAudioRef.current = activeAudioRef.current.filter(a => a !== audio);
            });
        }
    } catch (e) {
        console.warn("Error playing SFX", e);
    }
  }, [sfxMap]);

  return {
    sfxMap,
    isLoaded,
    handleZipUpload,
    playSFX,
    stopAllSFX
  };
};