
import { useState, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import { saveSFX, getAllSFX } from '../lib/db';

export const useSFX = () => {
  const [sfxMap, setSfxMap] = useState<Record<string, string>>({});
  const [isLoaded, setIsLoaded] = useState(false);

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
      const zip = new JSZip();
      const unzipped = await zip.loadAsync(file);
      
      const newMap: Record<string, string> = { ...sfxMap };
      
      const promises: Promise<void>[] = [];

      unzipped.forEach((relativePath: string, zipEntry: JSZip.JSZipObject) => {
        // Use relativePath to avoid TS unused error if we want, or just ignore it.
        // We use zipEntry.name which includes the path.
        if (relativePath && !zipEntry.dir && zipEntry.name.toLowerCase().endsWith('.wav')) {
           const p = zipEntry.async('blob').then(async (blob: Blob) => {
               // Determine ID (filename)
               // Note: We use the simple filename as ID for easier lookup
               const fileName = zipEntry.name.split('/').pop() || zipEntry.name;
               
               // Save to DB
               await saveSFX({ id: fileName, blob });
               
               // Update local state
               newMap[fileName] = URL.createObjectURL(blob);
           });
           promises.push(p);
        }
      });

      await Promise.all(promises);
      setSfxMap(newMap);
      alert("SFX Pack Loaded Successfully!");
    } catch (e) {
      console.error("Failed to unzip or save SFX", e);
      alert("Failed to process ZIP file.");
    }
  }, [sfxMap]);

  // Play SFX
  const playSFX = useCallback((filename: string) => {
    if (!sfxMap[filename]) {
        // Silently fail if file doesn't exist (per requirement)
        console.warn(`SFX missing: ${filename}`);
        return;
    }

    try {
        const audio = new Audio(sfxMap[filename]);
        audio.volume = 0.6; // Slightly lower than music
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // Autoplay policy or other error - silently fail
                console.warn("SFX playback failed (autoplay policy?)", error);
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
    playSFX
  };
};
