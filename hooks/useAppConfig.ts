
import { useState, useEffect } from 'react';
import { VisualizerConfig, DvdConfig, EffectsConfig, MarqueeConfig } from '../types';
import { getBackground, saveBackground, clearBackground } from '../lib/db';

const STORAGE_KEYS = {
  VISUALIZER: 'neon_visualizer_config',
  DVD: 'neon_dvd_config',
  EFFECTS: 'neon_effects_config',
  BG_COLOR: 'neon_bg_color',
  SHOW_VISUALIZER: 'neon_show_visualizer',
  SHOW_DVD: 'neon_show_dvd',
  MARQUEE: 'neon_marquee_config'
};

const getInitial = <T,>(key: string, defaultValue: T): T => {
  const saved = localStorage.getItem(key);
  if (!saved) return defaultValue;
  try { return JSON.parse(saved); } catch { return defaultValue; }
};

export const useAppConfig = () => {
  const [showVisualizer, setShowVisualizer] = useState(() => getInitial(STORAGE_KEYS.SHOW_VISUALIZER, true));
  const [showDvd, setShowDvd] = useState(() => getInitial(STORAGE_KEYS.SHOW_DVD, true));
  
  const [marqueeConfig, setMarqueeConfig] = useState<MarqueeConfig>(() => getInitial(STORAGE_KEYS.MARQUEE, {
    enabled: true, speed: 5, opacity: 0.9
  }));

  const [visualizerConfig, setVisualizerConfig] = useState<VisualizerConfig>(() => getInitial(STORAGE_KEYS.VISUALIZER, {
    style: 'blue', position: 'bottom', barCount: 128, sensitivity: 1.5, fillOpacity: 0.3,
    strokeEnabled: true, strokeOpacity: 0.8, normalize: false, minFrequency: 0, maxFrequency: 100, 
    barGap: 2, mirror: false,
  }));

  const [dvdConfig, setDvdConfig] = useState<DvdConfig>(() => getInitial(STORAGE_KEYS.DVD, { size: 120, speed: 2, opacity: 1.0 }));

  const [effectsConfig, setEffectsConfig] = useState<EffectsConfig>(() => getInitial(STORAGE_KEYS.EFFECTS, {
    fps: 60, pixelation: 1, noise: 0, vhsJitter: 0, scanlineEnabled: true, scanlineIntensity: 0.2, scanlineThickness: 4,
    glitch: { enabled: false, intensity: 0.5, speed: 0.2, opacity: 1.0, variant: 'v1' },
    cyberHack: { enabled: false, speed: 5, opacity: 0.7, density: 0.5, scale: 1.0, backgroundOpacity: 0.4 }
  }));
  
  const [bgColor, setBgColor] = useState(() => localStorage.getItem(STORAGE_KEYS.BG_COLOR) || '#0f172a');
  const [bgMedia, setBgMedia] = useState<{ type: 'image' | 'video', url: string } | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VISUALIZER, JSON.stringify(visualizerConfig));
    localStorage.setItem(STORAGE_KEYS.DVD, JSON.stringify(dvdConfig));
    localStorage.setItem(STORAGE_KEYS.EFFECTS, JSON.stringify(effectsConfig));
    localStorage.setItem(STORAGE_KEYS.BG_COLOR, bgColor);
    localStorage.setItem(STORAGE_KEYS.SHOW_VISUALIZER, JSON.stringify(showVisualizer));
    localStorage.setItem(STORAGE_KEYS.SHOW_DVD, JSON.stringify(showDvd));
    localStorage.setItem(STORAGE_KEYS.MARQUEE, JSON.stringify(marqueeConfig));
  }, [visualizerConfig, dvdConfig, effectsConfig, bgColor, showVisualizer, showDvd, marqueeConfig]);

  // Load Background from DB
  useEffect(() => {
    const hydrate = async () => {
      const savedBg = await getBackground();
      if (savedBg) setBgMedia({ type: savedBg.type, url: URL.createObjectURL(savedBg.file) });
    };
    hydrate();
  }, []);

  const handleBgUpload = async (file: File) => {
    if (bgMedia?.url) URL.revokeObjectURL(bgMedia.url);
    const type = file.type.startsWith('video') ? 'video' : 'image';
    await saveBackground({ id: 'current', type, file });
    setBgMedia({ type, url: URL.createObjectURL(file) });
  };

  const handleClearBg = async () => {
    if (bgMedia?.url) URL.revokeObjectURL(bgMedia.url);
    await clearBackground();
    setBgMedia(null);
  };

  const exportConfig = () => {
    const config = {
      visualizerConfig, dvdConfig, effectsConfig, bgColor, showVisualizer, showDvd, marqueeConfig, version: '1.0'
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
    bgMedia, handleBgUpload, handleClearBg,
    exportConfig, importConfig
  };
};
