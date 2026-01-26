
import { useState, useEffect, useCallback } from 'react';
import { VisualizerConfig, DvdConfig, EffectsConfig, MarqueeConfig, BackgroundMedia, PatternConfig, AppPreset, CursorStyle, WatermarkConfig, ThemeType, ControlStyle, BgTransitionType } from '../types';
import { getAllBackgrounds, saveBackground, clearBackgrounds, deleteBackground } from '../lib/db';

const STORAGE_KEYS = {
  VISUALIZER: 'neon_visualizer_config',
  DVD: 'neon_dvd_config',
  EFFECTS: 'neon_effects_config',
  BG_COLOR: 'neon_bg_color',
  BG_PATTERN: 'neon_bg_pattern',
  BG_PATTERN_CONFIG: 'neon_bg_pattern_config',
  SHOW_VISUALIZER: 'neon_show_visualizer',
  SHOW_DVD: 'neon_show_dvd',
  MARQUEE: 'neon_marquee_config',
  WATERMARK: 'neon_watermark_config',
  BG_AUTOPLAY: 'neon_bg_autoplay_interval',
  PRESETS: 'neon_config_presets',
  CURSOR: 'neon_cursor_style',
  API_KEY: 'neon_gemini_api_key',
  BG_TRANSITION: 'neon_bg_transition'
};

// --- DEFAULT CONFIGURATIONS (Source of Truth) ---

const DEFAULT_VISUALIZER_CONFIG: VisualizerConfig = {
  style: 'blue', position: 'bottom', barCount: 128, sensitivity: 1.5, fillOpacity: 0.3,
  strokeEnabled: true, strokeOpacity: 0.8, showTips: true, normalize: false, preventVolumeScaling: false, minFrequency: 0, maxFrequency: 100, 
  barGap: 2, mirror: false, segmented: false, segmentHeight: 4, segmentGap: 2,
  tipHeight: 2, tipSpeed: 15, highlightLastBrick: false, tipColor: 'white', tipGlow: false, barGravity: 5
};

const DEFAULT_DVD_CONFIG: DvdConfig = { 
  size: 150, speed: 2, opacity: 0.7, enableSfx: false, logoType: 'neon_waves' 
};

const DEFAULT_EFFECTS_CONFIG: EffectsConfig = {
  fps: 60, pixelation: 1, noise: 0, chromaticAberration: 0, vhsJitter: 0, scanlineEnabled: true, scanlineIntensity: 0.2, scanlineThickness: 4,
  glitch: { enabled: false, intensity: 0.5, speed: 0.2, opacity: 1.0, variant: 'v1' },
  cyberHack: { enabled: false, speed: 5, opacity: 0.7, density: 0.5, scale: 1.0, backgroundOpacity: 0.4 },
  debugConsole: { enabled: false, opacity: 0.9, scale: 1.0 },
  holograms: { 
    enabled: false, opacity: 0.8, speed: 1.0, interval: 15, scale: 1.0, enableIcons: false,
    categories: { system: true, interactive: true, music: true, motivational: true, philosophy: false, space: false }
  },
  geminiChat: {
    enabled: false, opacity: 0.9, scale: 1.0, width: 350, typingSpeed: 1.0,
    categories: { system: false, interactive: true, music: true, motivational: true, philosophy: true, space: true }
  },
  lightLeaks: { enabled: false, intensity: 0.5, speed: 0.5, number: 6 }
};

const DEFAULT_MARQUEE_CONFIG: MarqueeConfig = {
  enabled: true, style: 'matrix', showProgress: true, progressMode: 'blocks', progressHeight: 20, progressOpacity: 0.6,
  speed: 1, opacity: 0.9, fontSize: 40
};

const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = { 
  scale: 1.0, opacity: 1.0, flashIntensity: 0.5 
};

const DEFAULT_PRESETS: AppPreset[] = [
  {
    id: 'default_system',
    name: 'Default System',
    createdAt: Date.now(),
    config: {
      visualizerConfig: DEFAULT_VISUALIZER_CONFIG,
      dvdConfig: DEFAULT_DVD_CONFIG,
      effectsConfig: DEFAULT_EFFECTS_CONFIG,
      marqueeConfig: DEFAULT_MARQUEE_CONFIG,
      watermarkConfig: DEFAULT_WATERMARK_CONFIG,
      bgColor: '#0f172a',
      bgPattern: 'none',
      bgPatternConfig: { intensity: 0.25, scale: 1.0 },
      showVisualizer: true,
      showDvd: true,
      bgAutoplayInterval: 5,
      cursorStyle: 'default',
      theme: 'neon-retro',
      controlStyle: 'default',
      bgTransition: 'glitch'
    }
  },
  // ... (Other presets can be reconstructed similarly using defaults + overrides if needed)
];

// --- HELPER: SAFE MERGE ---
// Recursively merges 'source' into 'defaults'. 
// If a key is missing in 'source', 'defaults' value is kept.
// If type mismatches, 'defaults' value is kept.
// Extra keys in 'source' are ignored.
const safeMerge = <T>(defaults: T, source: any): T => {
  if (source === undefined || source === null) return defaults;
  
  // Primitives: strict type check (allow number <-> float, ignore strings for numbers)
  if (typeof defaults !== 'object' || defaults === null) {
      // Special case: allow older configs to load if simple types match
      return (typeof source === typeof defaults) ? source : defaults;
  }

  // Arrays: Replace entirely (assuming arrays are lists of items, not settings structures)
  if (Array.isArray(defaults)) {
      return Array.isArray(source) ? source as unknown as T : defaults;
  }

  // Objects: Recursive merge
  const result: any = { ...defaults }; 
  for (const key in defaults) {
      if (Object.prototype.hasOwnProperty.call(defaults, key)) {
          // If source has the key, try to merge it
          if (Object.prototype.hasOwnProperty.call(source, key)) {
              result[key] = safeMerge(defaults[key], source[key]);
          }
          // Else: keep default value (already in result)
      }
  }
  
  return result as T;
};

const getInitial = <T,>(key: string, defaultValue: T): T => {
  const saved = localStorage.getItem(key);
  if (!saved) return defaultValue;
  try { 
      const parsed = JSON.parse(saved);
      // Validate/Repair on load to prevent crashes from bad localStorage data
      return safeMerge(defaultValue, parsed);
  } catch { 
      return defaultValue; 
  }
};

export const useAppConfig = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEYS.API_KEY) || '');
  const [showVisualizer, setShowVisualizer] = useState(() => getInitial(STORAGE_KEYS.SHOW_VISUALIZER, true));
  const [showDvd, setShowDvd] = useState(() => getInitial(STORAGE_KEYS.SHOW_DVD, true));
  const [cursorStyle, setCursorStyle] = useState<CursorStyle>(() => getInitial(STORAGE_KEYS.CURSOR, 'default'));
  const [bgTransition, setBgTransition] = useState<BgTransitionType>(() => getInitial(STORAGE_KEYS.BG_TRANSITION, 'glitch'));
  
  const [marqueeConfig, setMarqueeConfig] = useState<MarqueeConfig>(() => getInitial(STORAGE_KEYS.MARQUEE, DEFAULT_MARQUEE_CONFIG));
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>(() => getInitial(STORAGE_KEYS.WATERMARK, DEFAULT_WATERMARK_CONFIG));
  const [visualizerConfig, setVisualizerConfig] = useState<VisualizerConfig>(() => getInitial(STORAGE_KEYS.VISUALIZER, DEFAULT_VISUALIZER_CONFIG));
  const [dvdConfig, setDvdConfig] = useState<DvdConfig>(() => getInitial(STORAGE_KEYS.DVD, DEFAULT_DVD_CONFIG));
  const [effectsConfig, setEffectsConfig] = useState<EffectsConfig>(() => getInitial(STORAGE_KEYS.EFFECTS, DEFAULT_EFFECTS_CONFIG));
  
  const [bgColor, setBgColor] = useState(() => localStorage.getItem(STORAGE_KEYS.BG_COLOR) || '#0f172a');
  const [bgPattern, setBgPattern] = useState(() => localStorage.getItem(STORAGE_KEYS.BG_PATTERN) || 'none');
  const [bgPatternConfig, setBgPatternConfig] = useState<PatternConfig>(() => getInitial(STORAGE_KEYS.BG_PATTERN_CONFIG, { intensity: 0.25, scale: 1.0 }));
  
  const [bgList, setBgList] = useState<BackgroundMedia[]>([]);
  const [currentBgIndex, setCurrentBgIndex] = useState<number>(0);
  
  const [bgAutoplayInterval, setBgAutoplayInterval] = useState<number>(() => getInitial(STORAGE_KEYS.BG_AUTOPLAY, 5));

  const [savedPresets, setSavedPresets] = useState<AppPreset[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRESETS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // We generally trust presets list structure, but could validate individual configs on load
        return parsed.length > 0 ? parsed : DEFAULT_PRESETS;
      } catch {
        return DEFAULT_PRESETS;
      }
    }
    return DEFAULT_PRESETS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VISUALIZER, JSON.stringify(visualizerConfig));
    localStorage.setItem(STORAGE_KEYS.DVD, JSON.stringify(dvdConfig));
    localStorage.setItem(STORAGE_KEYS.EFFECTS, JSON.stringify(effectsConfig));
    localStorage.setItem(STORAGE_KEYS.BG_COLOR, bgColor);
    localStorage.setItem(STORAGE_KEYS.BG_PATTERN, bgPattern);
    localStorage.setItem(STORAGE_KEYS.BG_PATTERN_CONFIG, JSON.stringify(bgPatternConfig));
    localStorage.setItem(STORAGE_KEYS.SHOW_VISUALIZER, JSON.stringify(showVisualizer));
    localStorage.setItem(STORAGE_KEYS.SHOW_DVD, JSON.stringify(showDvd));
    localStorage.setItem(STORAGE_KEYS.MARQUEE, JSON.stringify(marqueeConfig));
    localStorage.setItem(STORAGE_KEYS.WATERMARK, JSON.stringify(watermarkConfig));
    localStorage.setItem(STORAGE_KEYS.BG_AUTOPLAY, JSON.stringify(bgAutoplayInterval));
    localStorage.setItem(STORAGE_KEYS.CURSOR, JSON.stringify(cursorStyle));
    localStorage.setItem(STORAGE_KEYS.BG_TRANSITION, JSON.stringify(bgTransition));
  }, [visualizerConfig, dvdConfig, effectsConfig, bgColor, bgPattern, bgPatternConfig, showVisualizer, showDvd, marqueeConfig, watermarkConfig, bgAutoplayInterval, cursorStyle, bgTransition]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(savedPresets));
  }, [savedPresets]);

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
        if (prev.length === 0) setCurrentBgIndex(0);
        return updated;
    });
  };

  const removeBg = async (id: string) => {
    const index = bgList.findIndex(item => item.id === id);
    if (index === -1) return;
    if (bgList[index].url) URL.revokeObjectURL(bgList[index].url);
    const newList = bgList.filter(item => item.id !== id);
    setBgList(newList);
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

  const deselectBg = () => {
      setCurrentBgIndex(-1);
  };

  const handleClearBg = async () => {
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

  useEffect(() => {
    if (bgList.length <= 1 || bgAutoplayInterval <= 0) return;
    const intervalMs = bgAutoplayInterval * 60 * 1000;
    const intervalId = setInterval(() => {
      nextBg();
    }, intervalMs);
    return () => clearInterval(intervalId);
  }, [bgList.length, bgAutoplayInterval, nextBg]);

  // --- PRESET MANAGEMENT ---

  const savePreset = (name: string, theme: ThemeType, controlStyle: ControlStyle) => {
    const newPreset: AppPreset = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      config: {
        visualizerConfig,
        dvdConfig,
        effectsConfig,
        marqueeConfig,
        watermarkConfig,
        bgColor,
        bgPattern,
        bgPatternConfig,
        showVisualizer,
        showDvd,
        bgAutoplayInterval,
        cursorStyle,
        theme,
        controlStyle,
        bgTransition
      }
    };
    setSavedPresets(prev => [...prev, newPreset]);
  };

  const loadPreset = (id: string): AppPreset['config'] | null => {
    const preset = savedPresets.find(p => p.id === id);
    if (!preset) return null;

    // Sanitize preset config before applying
    const config = preset.config;
    
    setVisualizerConfig(safeMerge(DEFAULT_VISUALIZER_CONFIG, config.visualizerConfig));
    setDvdConfig(safeMerge(DEFAULT_DVD_CONFIG, config.dvdConfig));
    setEffectsConfig(safeMerge(DEFAULT_EFFECTS_CONFIG, config.effectsConfig));
    setMarqueeConfig(safeMerge(DEFAULT_MARQUEE_CONFIG, config.marqueeConfig));
    if (config.watermarkConfig) setWatermarkConfig(safeMerge(DEFAULT_WATERMARK_CONFIG, config.watermarkConfig));
    
    setBgColor(config.bgColor || '#000000');
    setBgPattern(config.bgPattern || 'none');
    setBgPatternConfig(safeMerge({ intensity: 0.25, scale: 1.0 }, config.bgPatternConfig));
    
    setShowVisualizer(config.showVisualizer ?? true);
    setShowDvd(config.showDvd ?? true);
    setBgAutoplayInterval(config.bgAutoplayInterval ?? 5);
    
    if (config.cursorStyle) setCursorStyle(config.cursorStyle);
    if (config.bgTransition) setBgTransition(config.bgTransition);
    
    return config;
  };

  const deletePreset = (id: string) => {
    setSavedPresets(prev => prev.filter(p => p.id !== id));
  };

  const renamePreset = (id: string, newName: string) => {
    setSavedPresets(prev => prev.map(p => 
      p.id === id ? { ...p, name: newName } : p
    ));
  };

  // --- EXPORT / IMPORT ---

  const exportConfig = (theme: ThemeType, controlStyle: ControlStyle) => {
    const config = {
      visualizerConfig, dvdConfig, effectsConfig, bgColor, bgPattern, bgPatternConfig, showVisualizer, showDvd, marqueeConfig, watermarkConfig, bgAutoplayInterval, cursorStyle, theme, controlStyle, bgTransition, version: '1.2'
    };
    // Note: API Key is purposely excluded from export for security
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

  const importConfig = (file: File, onLoadCallback: (config: any) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawContent = JSON.parse(event.target?.result as string);
        
        // 1. Sanitize Data using Safe Merge
        const visualizerSafe = safeMerge(DEFAULT_VISUALIZER_CONFIG, rawContent.visualizerConfig);
        const dvdSafe = safeMerge(DEFAULT_DVD_CONFIG, rawContent.dvdConfig);
        const effectsSafe = safeMerge(DEFAULT_EFFECTS_CONFIG, rawContent.effectsConfig);
        const marqueeSafe = safeMerge(DEFAULT_MARQUEE_CONFIG, rawContent.marqueeConfig);
        const watermarkSafe = safeMerge(DEFAULT_WATERMARK_CONFIG, rawContent.watermarkConfig);
        const patternConfigSafe = safeMerge({ intensity: 0.25, scale: 1.0 }, rawContent.bgPatternConfig);

        // 2. Apply States
        setVisualizerConfig(visualizerSafe);
        setDvdConfig(dvdSafe);
        setEffectsConfig(effectsSafe);
        setMarqueeConfig(marqueeSafe);
        setWatermarkConfig(watermarkSafe);
        
        if (rawContent.bgColor) setBgColor(rawContent.bgColor);
        if (rawContent.bgPattern) setBgPattern(rawContent.bgPattern);
        setBgPatternConfig(patternConfigSafe);
        
        if (typeof rawContent.showVisualizer === 'boolean') setShowVisualizer(rawContent.showVisualizer);
        if (typeof rawContent.showDvd === 'boolean') setShowDvd(rawContent.showDvd);
        if (typeof rawContent.bgAutoplayInterval === 'number') setBgAutoplayInterval(rawContent.bgAutoplayInterval);
        
        if (rawContent.cursorStyle) setCursorStyle(rawContent.cursorStyle);
        if (rawContent.bgTransition) setBgTransition(rawContent.bgTransition);
        
        // Pass sanitized full object to callback (for Theme/ControlStyle handling in App.tsx)
        if (onLoadCallback) {
            onLoadCallback({
                ...rawContent,
                visualizerConfig: visualizerSafe,
                effectsConfig: effectsSafe
            });
        }

      } catch (err) {
        console.error("Failed to parse NRP config file", err);
        // Error handling could be added here (e.g. notify parent)
      }
    };
    reader.readAsText(file);
  };

  return {
    apiKey, setApiKey,
    showVisualizer, setShowVisualizer,
    showDvd, setShowDvd,
    marqueeConfig, setMarqueeConfig,
    visualizerConfig, setVisualizerConfig,
    dvdConfig, setDvdConfig,
    effectsConfig, setEffectsConfig,
    watermarkConfig, setWatermarkConfig,
    bgColor, setBgColor,
    bgPattern, setBgPattern,
    bgPatternConfig, setBgPatternConfig,
    bgMedia: bgList[currentBgIndex] || null, 
    bgList,
    currentBgIndex,
    bgAutoplayInterval, setBgAutoplayInterval,
    handleBgUpload, handleClearBg,
    removeBg, moveBg, selectBg, deselectBg,
    nextBg, prevBg,
    bgCount: bgList.length,
    exportConfig, importConfig,
    savedPresets,
    savePreset,
    loadPreset,
    deletePreset,
    renamePreset,
    cursorStyle, setCursorStyle,
    bgTransition, setBgTransition
  };
};
