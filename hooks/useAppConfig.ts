
import { useState, useEffect, useCallback } from 'react';
import { VisualizerConfig, DvdConfig, EffectsConfig, MarqueeConfig, BackgroundMedia } from '../types';
import { getAllBackgrounds, saveBackground, clearBackgrounds, deleteBackground } from '../lib/db';

const STORAGE_KEYS = {
  VISUALIZER: 'neon_visualizer_config',
  DVD: 'neon_dvd_config',
  EFFECTS: 'neon_effects_config',
  BG_COLOR: 'neon_bg_color',
  SHOW_VISUALIZER: 'neon_show_visualizer',
  SHOW_DVD: 'neon_show_dvd',
  MARQUEE: 'neon_marquee_config',
  BG_AUTOPLAY: 'neon_bg_autoplay_interval'
};

const getInitial = <T,>(key: string, defaultValue: T): T => {
  const saved = localStorage.getItem(key);
  if (!saved) return defaultValue;
  try { return JSON.parse(saved); } catch { return defaultValue; }
};

export const useAppConfig = () => {
  const [showVisualizer, setShowVisualizer] = useState(() => getInitial(STORAGE_KEYS.SHOW_VISUALIZER, true));
  const [showDvd, setShowDvd] = useState(() => getInitial(STORAGE_KEYS.SHOW_DVD, true));
  
  const [marqueeConfig, setMarqueeConfig] = useState<MarqueeConfig>(() => {
    const initial = getInitial(STORAGE_KEYS.MARQUEE, {
      enabled: true, speed: 1, opacity: 0.9, fontSize: 40
    });
    // Merge with defaults to ensure fontSize exists if loading old config
    return {
      enabled: true, 
      speed: 1, 
      opacity: 0.9, 
      fontSize: 40,
      ...initial
    };
  });

  const [visualizerConfig, setVisualizerConfig] = useState<VisualizerConfig>(() => getInitial(STORAGE_KEYS.VISUALIZER, {
    style: 'blue', position: 'bottom', barCount: 128, sensitivity: 1.5, fillOpacity: 0.3,
    strokeEnabled: true, strokeOpacity: 0.8, normalize: false, minFrequency: 0, maxFrequency: 100, 
    barGap: 2, mirror: false,
  }));

  const [dvdConfig, setDvdConfig] = useState<DvdConfig>(() => getInitial(STORAGE_KEYS.DVD, { size: 120, speed: 2, opacity: 1.0 }));

  const [effectsConfig, setEffectsConfig] = useState<EffectsConfig>(() => {
      const initial = getInitial(STORAGE_KEYS.EFFECTS, {
        fps: 60, pixelation: 1, noise: 0, chromaticAberration: 0, vhsJitter: 0, scanlineEnabled: true, scanlineIntensity: 0.2, scanlineThickness: 4,
        glitch: { enabled: false, intensity: 0.5, speed: 0.2, opacity: 1.0, variant: 'v1' },
        cyberHack: { enabled: false, speed: 5, opacity: 0.7, density: 0.5, scale: 1.0, backgroundOpacity: 0.4 },
        debugConsole: { enabled: false, opacity: 0.9, scale: 1.0 },
        holograms: { 
          enabled: false, 
          opacity: 0.8, 
          speed: 1.0, 
          interval: 15, 
          scale: 1.0,
          categories: {
            system: true,
            interactive: true,
            music: true,
            motivational: true,
            philosophy: false,
            space: false
          }
        }
      });
      // Ensure new properties exist for old saves
      return {
          ...initial,
          debugConsole: initial.debugConsole || { enabled: false, opacity: 0.9, scale: 1.0 },
          holograms: { 
            enabled: false, 
            opacity: 0.8, 
            speed: 1.0, 
            interval: 15, 
            scale: 1.0, 
            ...initial.holograms,
            // Deep merge categories to ensure new ones appear if config is old
            categories: {
                system: true,
                interactive: true,
                music: true,
                motivational: true,
                philosophy: false,
                space: false,
                ...(initial.holograms?.categories || {})
            }
          }
      }
  });
  
  const [bgColor, setBgColor] = useState(() => localStorage.getItem(STORAGE_KEYS.BG_COLOR) || '#0f172a');
  
  // Background State: List + Current Index
  const [bgList, setBgList] = useState<BackgroundMedia[]>([]);
  const [currentBgIndex, setCurrentBgIndex] = useState<number>(0);
  
  // Autoplay Interval in Minutes (default 5)
  const [bgAutoplayInterval, setBgAutoplayInterval] = useState<number>(() => getInitial(STORAGE_KEYS.BG_AUTOPLAY, 5));

  // Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VISUALIZER, JSON.stringify(visualizerConfig));
    localStorage.setItem(STORAGE_KEYS.DVD, JSON.stringify(dvdConfig));
    localStorage.setItem(STORAGE_KEYS.EFFECTS, JSON.stringify(effectsConfig));
    localStorage.setItem(STORAGE_KEYS.BG_COLOR, bgColor);
    localStorage.setItem(STORAGE_KEYS.SHOW_VISUALIZER, JSON.stringify(showVisualizer));
    localStorage.setItem(STORAGE_KEYS.SHOW_DVD, JSON.stringify(showDvd));
    localStorage.setItem(STORAGE_KEYS.MARQUEE, JSON.stringify(marqueeConfig));
    localStorage.setItem(STORAGE_KEYS.BG_AUTOPLAY, JSON.stringify(bgAutoplayInterval));
  }, [visualizerConfig, dvdConfig, effectsConfig, bgColor, showVisualizer, showDvd, marqueeConfig, bgAutoplayInterval]);

  // Load Backgrounds from DB
  useEffect(() => {
    const hydrate = async () => {
      const savedBgs = await getAllBackgrounds();
      if (savedBgs.length > 0) {
        const processed = savedBgs.map(bg => ({
            ...bg,
            url: URL.createObjectURL(bg.file)
        }));
        setBgList(processed);
        setCurrentBgIndex(0);
      }
    };
    hydrate();
  }, []);

  const handleBgUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newItems: BackgroundMedia[] = [];

    for (const file of fileArray) {
        const type = file.type.startsWith('video') ? 'video' : 'image';
        const id = crypto.randomUUID();
        const newItem: BackgroundMedia = { id, type, file, url: URL.createObjectURL(file) };
        
        await saveBackground({ id, type, file });
        newItems.push(newItem);
    }

    setBgList(prev => {
        const updated = [...prev, ...newItems];
        // If we were empty, start at 0. If not, stay where we are.
        if (prev.length === 0) setCurrentBgIndex(0);
        return updated;
    });
  };

  const removeBg = async (id: string) => {
    const index = bgList.findIndex(item => item.id === id);
    if (index === -1) return;
    
    // Revoke URL
    if (bgList[index].url) URL.revokeObjectURL(bgList[index].url);
    
    // Update List
    const newList = bgList.filter(item => item.id !== id);
    setBgList(newList);
    
    // Update Index
    if (newList.length === 0) {
        setCurrentBgIndex(0);
    } else if (currentBgIndex >= newList.length) {
        setCurrentBgIndex(newList.length - 1);
    } else if (currentBgIndex > index) {
        setCurrentBgIndex(currentBgIndex - 1);
    }
    
    await deleteBackground(id);
  };

  const moveBg = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
        const newList = [...bgList];
        [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
        setBgList(newList);
        
        if (currentBgIndex === index) setCurrentBgIndex(index - 1);
        else if (currentBgIndex === index - 1) setCurrentBgIndex(index);
    } else if (direction === 'down' && index < bgList.length - 1) {
        const newList = [...bgList];
        [newList[index + 1], newList[index]] = [newList[index], newList[index + 1]];
        setBgList(newList);
        
        if (currentBgIndex === index) setCurrentBgIndex(index + 1);
        else if (currentBgIndex === index + 1) setCurrentBgIndex(index);
    }
  };

  const selectBg = (index: number) => {
      if (index >= 0 && index < bgList.length) {
        setCurrentBgIndex(index);
      }
  };

  const handleClearBg = async () => {
    // Revoke URLs to free memory
    bgList.forEach(bg => URL.revokeObjectURL(bg.url));
    await clearBackgrounds();
    setBgList([]);
    setCurrentBgIndex(0);
  };

  const nextBg = useCallback(() => {
    if (bgList.length === 0) return;
    setCurrentBgIndex(prev => (prev + 1) % bgList.length);
  }, [bgList.length]);

  const prevBg = useCallback(() => {
    if (bgList.length === 0) return;
    setCurrentBgIndex(prev => (prev - 1 + bgList.length) % bgList.length);
  }, [bgList.length]);

  // Autoplay Logic
  useEffect(() => {
    if (bgList.length <= 1 || bgAutoplayInterval <= 0) return;

    const intervalMs = bgAutoplayInterval * 60 * 1000;
    const intervalId = setInterval(() => {
      nextBg();
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [bgList.length, bgAutoplayInterval, nextBg]);

  const exportConfig = () => {
    const config = {
      visualizerConfig, dvdConfig, effectsConfig, bgColor, showVisualizer, showDvd, marqueeConfig, bgAutoplayInterval, version: '1.0'
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const date = new Date();
    const fileName = `Neon_Retro_Player_Config_${date.toISOString().split('T')[0]}.NRP`;
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = JSON.parse(event.target?.result as string);
        if (content.visualizerConfig) setVisualizerConfig(content.visualizerConfig);
        if (content.dvdConfig) setDvdConfig(content.dvdConfig);
        if (content.effectsConfig) setEffectsConfig(content.effectsConfig);
        if (content.bgColor) setBgColor(content.bgColor);
        if (typeof content.showVisualizer === 'boolean') setShowVisualizer(content.showVisualizer);
        if (typeof content.showDvd === 'boolean') setShowDvd(content.showDvd);
        if (content.marqueeConfig) setMarqueeConfig(content.marqueeConfig);
        if (typeof content.bgAutoplayInterval === 'number') setBgAutoplayInterval(content.bgAutoplayInterval);
      } catch (err) {
        console.error("Failed to parse NRP config file", err);
      }
    };
    reader.readAsText(file);
  };

  return {
    showVisualizer, setShowVisualizer,
    showDvd, setShowDvd,
    marqueeConfig, setMarqueeConfig,
    visualizerConfig, setVisualizerConfig,
    dvdConfig, setDvdConfig,
    effectsConfig, setEffectsConfig,
    bgColor, setBgColor,
    bgMedia: bgList[currentBgIndex] || null, 
    bgList,
    currentBgIndex,
    bgAutoplayInterval, setBgAutoplayInterval,
    handleBgUpload, handleClearBg,
    removeBg, moveBg, selectBg,
    nextBg, prevBg,
    bgCount: bgList.length,
    exportConfig, importConfig
  };
};
