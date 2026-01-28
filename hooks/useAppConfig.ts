
import { useState, useEffect, useCallback } from 'react';
import { VisualizerConfig, DvdConfig, EffectsConfig, MarqueeConfig, PatternConfig, BackgroundMedia, AppPreset, CursorStyle, WatermarkConfig, ThemeType, ControlStyle, BgTransitionType, BgAnimationType } from '../types';
import { getAllBackgrounds, saveBackground, clearBackgrounds, deleteBackground } from '../lib/db';
import { 
  DEFAULT_VISUALIZER_CONFIG, 
  DEFAULT_REACTOR_CONFIG,
  DEFAULT_DVD_CONFIG, 
  DEFAULT_EFFECTS_CONFIG, 
  DEFAULT_MARQUEE_CONFIG, 
  DEFAULT_WATERMARK_CONFIG 
} from '../config/defaults';
import { DEFAULT_PRESETS, DEFAULT_SYSTEM_PRESET } from '../config/presets';

const STORAGE_KEYS = {
  VISUALIZER: 'neon_visualizer_config',
  REACTOR: 'neon_reactor_config',
  DVD: 'neon_dvd_config',
  EFFECTS: 'neon_effects_config',
  BG_COLOR: 'neon_bg_color',
  BG_PATTERN: 'neon_bg_pattern',
  BG_PATTERN_CONFIG: 'neon_bg_pattern_config',
  SHOW_VISUALIZER: 'neon_show_visualizer',
  SHOW_VISUALIZER_3D: 'neon_show_visualizer_3d', 
  SHOW_DVD: 'neon_show_dvd',
  MARQUEE: 'neon_marquee_config',
  WATERMARK: 'neon_watermark_config',
  BG_AUTOPLAY: 'neon_bg_autoplay_interval',
  PRESETS: 'neon_config_presets',
  ACTIVE_PRESET: 'neon_active_preset_id', 
  CURSOR: 'neon_cursor_style',
  RETRO_CURSOR: 'neon_retro_cursor_style',
  API_KEY: 'neon_gemini_api_key',
  BG_TRANSITION: 'neon_bg_transition',
  BG_ANIMATION: 'neon_bg_animation', // NEW KEY
  ADVANCED_MODE: 'neon_advanced_mode',
  USE_ALBUM_ART: 'neon_use_album_art'
};

// --- HELPER: SAFE MERGE ---
const safeMerge = <T>(defaults: T, source: any): T => {
  if (source === undefined || source === null) return defaults;
  if (typeof defaults !== 'object' || defaults === null) {
      return (typeof source === typeof defaults) ? source : defaults;
  }
  if (Array.isArray(defaults)) {
      return Array.isArray(source) ? source as unknown as T : defaults;
  }
  const result: any = { ...defaults }; 
  for (const key in defaults) {
      if (Object.prototype.hasOwnProperty.call(defaults, key)) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
              result[key] = safeMerge(defaults[key], source[key]);
          }
      }
  }
  return result as T;
};

const getInitial = <T,>(key: string, defaultValue: T): T => {
  const saved = localStorage.getItem(key);
  if (!saved) return defaultValue;
  try { 
      const parsed = JSON.parse(saved);
      return safeMerge(defaultValue, parsed);
  } catch { 
      return defaultValue; 
  }
};

export const useAppConfig = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEYS.API_KEY) || '');
  const [showVisualizer, setShowVisualizer] = useState(() => getInitial(STORAGE_KEYS.SHOW_VISUALIZER, true));
  const [showVisualizer3D, setShowVisualizer3D] = useState(() => getInitial(STORAGE_KEYS.SHOW_VISUALIZER_3D, false)); 
  const [showDvd, setShowDvd] = useState(() => getInitial(STORAGE_KEYS.SHOW_DVD, true));
  const [cursorStyle, setCursorStyle] = useState<CursorStyle>(() => getInitial(STORAGE_KEYS.CURSOR, 'theme-sync'));
  const [retroScreenCursorStyle, setRetroScreenCursorStyle] = useState<CursorStyle>(() => getInitial(STORAGE_KEYS.RETRO_CURSOR, 'dos-terminal'));
  const [bgTransition, setBgTransition] = useState<BgTransitionType>(() => getInitial(STORAGE_KEYS.BG_TRANSITION, 'glitch'));
  const [bgAnimation, setBgAnimation] = useState<BgAnimationType>(() => getInitial(STORAGE_KEYS.BG_ANIMATION, 'none')); // NEW STATE
  const [isAdvancedMode, setAdvancedMode] = useState(() => getInitial(STORAGE_KEYS.ADVANCED_MODE, false));
  const [useAlbumArtAsBackground, setUseAlbumArtAsBackground] = useState(() => getInitial(STORAGE_KEYS.USE_ALBUM_ART, false));
  
  const [marqueeConfig, setMarqueeConfig] = useState<MarqueeConfig>(() => getInitial(STORAGE_KEYS.MARQUEE, DEFAULT_MARQUEE_CONFIG));
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>(() => getInitial(STORAGE_KEYS.WATERMARK, DEFAULT_WATERMARK_CONFIG));
  
  // Independent Configs
  const [visualizerConfig, setVisualizerConfig] = useState<VisualizerConfig>(() => getInitial(STORAGE_KEYS.VISUALIZER, DEFAULT_VISUALIZER_CONFIG));
  const [reactorConfig, setReactorConfig] = useState<VisualizerConfig>(() => getInitial(STORAGE_KEYS.REACTOR, DEFAULT_REACTOR_CONFIG));
  
  const [dvdConfig, setDvdConfig] = useState<DvdConfig>(() => getInitial(STORAGE_KEYS.DVD, DEFAULT_DVD_CONFIG));
  const [effectsConfig, setEffectsConfig] = useState<EffectsConfig>(() => getInitial(STORAGE_KEYS.EFFECTS, DEFAULT_EFFECTS_CONFIG));
  
  const [bgColor, setBgColor] = useState(() => localStorage.getItem(STORAGE_KEYS.BG_COLOR) || 'theme-sync');
  const [bgPattern, setBgPattern] = useState(() => localStorage.getItem(STORAGE_KEYS.BG_PATTERN) || 'none');
  const [bgPatternConfig, setBgPatternConfig] = useState<PatternConfig>(() => getInitial(STORAGE_KEYS.BG_PATTERN_CONFIG, { intensity: 0.25, scale: 1.0 }));
  
  const [bgList, setBgList] = useState<BackgroundMedia[]>([]);
  const [currentBgIndex, setCurrentBgIndex] = useState<number>(0);
  
  const [bgAutoplayInterval, setBgAutoplayInterval] = useState<number>(() => getInitial(STORAGE_KEYS.BG_AUTOPLAY, 5));

  // Active Preset State
  const [activePresetId, setActivePresetId] = useState<string | null>(() => {
      // Default to 'default_system' if nothing saved
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_PRESET) || 'default_system';
  });

  const [savedPresets, setSavedPresets] = useState<AppPreset[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRESETS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed;
        return DEFAULT_PRESETS;
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
    localStorage.setItem(STORAGE_KEYS.REACTOR, JSON.stringify(reactorConfig));
    localStorage.setItem(STORAGE_KEYS.DVD, JSON.stringify(dvdConfig));
    localStorage.setItem(STORAGE_KEYS.EFFECTS, JSON.stringify(effectsConfig));
    localStorage.setItem(STORAGE_KEYS.BG_COLOR, bgColor);
    localStorage.setItem(STORAGE_KEYS.BG_PATTERN, bgPattern);
    localStorage.setItem(STORAGE_KEYS.BG_PATTERN_CONFIG, JSON.stringify(bgPatternConfig));
    localStorage.setItem(STORAGE_KEYS.SHOW_VISUALIZER, JSON.stringify(showVisualizer));
    localStorage.setItem(STORAGE_KEYS.SHOW_VISUALIZER_3D, JSON.stringify(showVisualizer3D));
    localStorage.setItem(STORAGE_KEYS.SHOW_DVD, JSON.stringify(showDvd));
    localStorage.setItem(STORAGE_KEYS.MARQUEE, JSON.stringify(marqueeConfig));
    localStorage.setItem(STORAGE_KEYS.WATERMARK, JSON.stringify(watermarkConfig));
    localStorage.setItem(STORAGE_KEYS.BG_AUTOPLAY, JSON.stringify(bgAutoplayInterval));
    localStorage.setItem(STORAGE_KEYS.CURSOR, JSON.stringify(cursorStyle));
    localStorage.setItem(STORAGE_KEYS.RETRO_CURSOR, JSON.stringify(retroScreenCursorStyle));
    localStorage.setItem(STORAGE_KEYS.BG_TRANSITION, JSON.stringify(bgTransition));
    localStorage.setItem(STORAGE_KEYS.BG_ANIMATION, JSON.stringify(bgAnimation)); // Save new state
    localStorage.setItem(STORAGE_KEYS.ADVANCED_MODE, JSON.stringify(isAdvancedMode));
    localStorage.setItem(STORAGE_KEYS.USE_ALBUM_ART, JSON.stringify(useAlbumArtAsBackground));
  }, [visualizerConfig, reactorConfig, dvdConfig, effectsConfig, bgColor, bgPattern, bgPatternConfig, showVisualizer, showVisualizer3D, showDvd, marqueeConfig, watermarkConfig, bgAutoplayInterval, cursorStyle, retroScreenCursorStyle, bgTransition, bgAnimation, isAdvancedMode, useAlbumArtAsBackground]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(savedPresets));
  }, [savedPresets]);

  useEffect(() => {
    if (activePresetId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PRESET, activePresetId);
    } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_PRESET);
    }
  }, [activePresetId]);

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
    const id = crypto.randomUUID();
    const newPreset: AppPreset = {
      id,
      name,
      createdAt: Date.now(),
      config: {
        visualizerConfig,
        reactorConfig, 
        dvdConfig,
        effectsConfig,
        marqueeConfig,
        watermarkConfig,
        bgColor,
        bgPattern,
        bgPatternConfig,
        showVisualizer,
        showVisualizer3D,
        showDvd,
        bgAutoplayInterval,
        cursorStyle,
        retroScreenCursorStyle, 
        theme,
        controlStyle,
        bgTransition,
        bgAnimation // Save new state
      }
    };
    setSavedPresets(prev => [...prev, newPreset]);
    setActivePresetId(id); 
  };

  const overwritePreset = (id: string, currentTheme: ThemeType, currentControlStyle: ControlStyle) => {
      setSavedPresets(prev => prev.map(p => {
          if (p.id === id) {
              return {
                  ...p,
                  config: {
                    visualizerConfig,
                    reactorConfig,
                    dvdConfig,
                    effectsConfig,
                    marqueeConfig,
                    watermarkConfig,
                    bgColor,
                    bgPattern,
                    bgPatternConfig,
                    showVisualizer,
                    showVisualizer3D,
                    showDvd,
                    bgAutoplayInterval,
                    cursorStyle,
                    retroScreenCursorStyle,
                    theme: currentTheme,
                    controlStyle: currentControlStyle,
                    bgTransition,
                    bgAnimation // Save new state
                  }
              };
          }
          return p;
      }));
      setActivePresetId(id);
  };

  const resetDefaultPreset = () => {
      setSavedPresets(prev => prev.map(p => 
          p.id === 'default_system' ? DEFAULT_SYSTEM_PRESET : p
      ));
      setActivePresetId('default_system');
      return DEFAULT_SYSTEM_PRESET.config;
  };

  const loadPreset = (id: string): AppPreset['config'] | null => {
    const preset = savedPresets.find(p => p.id === id);
    if (!preset) return null;

    setActivePresetId(id);

    // Sanitize preset config before applying
    const config = preset.config;
    
    setVisualizerConfig(safeMerge(DEFAULT_VISUALIZER_CONFIG, config.visualizerConfig));
    setReactorConfig(safeMerge(DEFAULT_REACTOR_CONFIG, config.reactorConfig || DEFAULT_REACTOR_CONFIG));
    setDvdConfig(safeMerge(DEFAULT_DVD_CONFIG, config.dvdConfig));
    setEffectsConfig(safeMerge(DEFAULT_EFFECTS_CONFIG, config.effectsConfig));
    setMarqueeConfig(safeMerge(DEFAULT_MARQUEE_CONFIG, config.marqueeConfig));
    if (config.watermarkConfig) setWatermarkConfig(safeMerge(DEFAULT_WATERMARK_CONFIG, config.watermarkConfig));
    
    setBgColor(config.bgColor || '#000000');
    setBgPattern(config.bgPattern || 'none');
    setBgPatternConfig(safeMerge({ intensity: 0.25, scale: 1.0 }, config.bgPatternConfig));
    
    setShowVisualizer(config.showVisualizer ?? true);
    setShowVisualizer3D(config.showVisualizer3D ?? false); 
    setShowDvd(config.showDvd ?? true);
    setBgAutoplayInterval(config.bgAutoplayInterval ?? 5);
    
    if (config.cursorStyle) setCursorStyle(config.cursorStyle);
    if (config.retroScreenCursorStyle) setRetroScreenCursorStyle(config.retroScreenCursorStyle);
    if (config.bgTransition) setBgTransition(config.bgTransition);
    if (config.bgAnimation) setBgAnimation(config.bgAnimation); // Load new state
    
    return config;
  };

  const deletePreset = (id: string) => {
    setSavedPresets(prev => prev.filter(p => p.id !== id));
    if (activePresetId === id) {
        setActivePresetId(null);
    }
  };

  const renamePreset = (id: string, newName: string) => {
    setSavedPresets(prev => prev.map(p => 
      p.id === id ? { ...p, name: newName } : p
    ));
  };

  // --- EXPORT / IMPORT ---

  const exportConfig = (theme: ThemeType, controlStyle: ControlStyle) => {
    const config = {
      visualizerConfig, reactorConfig, dvdConfig, effectsConfig, bgColor, bgPattern, bgPatternConfig, showVisualizer, showVisualizer3D, showDvd, marqueeConfig, watermarkConfig, bgAutoplayInterval, cursorStyle, retroScreenCursorStyle, theme, controlStyle, bgTransition, bgAnimation, version: '1.5'
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

  const importConfig = (file: File, onLoadCallback: (config: any) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawContent = JSON.parse(event.target?.result as string);
        
        // 1. Sanitize Data
        const visualizerSafe = safeMerge(DEFAULT_VISUALIZER_CONFIG, rawContent.visualizerConfig);
        const reactorSafe = safeMerge(DEFAULT_REACTOR_CONFIG, rawContent.reactorConfig || DEFAULT_REACTOR_CONFIG);
        const dvdSafe = safeMerge(DEFAULT_DVD_CONFIG, rawContent.dvdConfig);
        const effectsSafe = safeMerge(DEFAULT_EFFECTS_CONFIG, rawContent.effectsConfig);
        const marqueeSafe = safeMerge(DEFAULT_MARQUEE_CONFIG, rawContent.marqueeConfig);
        const watermarkSafe = safeMerge(DEFAULT_WATERMARK_CONFIG, rawContent.watermarkConfig);
        const patternConfigSafe = safeMerge({ intensity: 0.25, scale: 1.0 }, rawContent.bgPatternConfig);

        // 2. Apply States
        setVisualizerConfig(visualizerSafe);
        setReactorConfig(reactorSafe);
        setDvdConfig(dvdSafe);
        setEffectsConfig(effectsSafe);
        setMarqueeConfig(marqueeSafe);
        setWatermarkConfig(watermarkSafe);
        
        if (rawContent.bgColor) setBgColor(rawContent.bgColor);
        if (rawContent.bgPattern) setBgPattern(rawContent.bgPattern);
        setBgPatternConfig(patternConfigSafe);
        
        if (typeof rawContent.showVisualizer === 'boolean') setShowVisualizer(rawContent.showVisualizer);
        if (typeof rawContent.showVisualizer3D === 'boolean') setShowVisualizer3D(rawContent.showVisualizer3D);
        if (typeof rawContent.showDvd === 'boolean') setShowDvd(rawContent.showDvd);
        if (typeof rawContent.bgAutoplayInterval === 'number') setBgAutoplayInterval(rawContent.bgAutoplayInterval);
        
        if (rawContent.cursorStyle) setCursorStyle(rawContent.cursorStyle);
        if (rawContent.retroScreenCursorStyle) setRetroScreenCursorStyle(rawContent.retroScreenCursorStyle);
        if (rawContent.bgTransition) setBgTransition(rawContent.bgTransition);
        if (rawContent.bgAnimation) setBgAnimation(rawContent.bgAnimation); // Import new state
        
        setActivePresetId(null);

        if (onLoadCallback) {
            onLoadCallback({
                ...rawContent,
                visualizerConfig: visualizerSafe,
                reactorConfig: reactorSafe,
                effectsConfig: effectsSafe
            });
        }

      } catch (err) {
        console.error("Failed to parse NRP config file", err);
      }
    };
    reader.readAsText(file);
  };

  // --- NEW: BATCH IMPORT FOR DRAG & DROP ---
  const batchImportPresets = async (files: File[]): Promise<string | null> => {
      const promises = files.map(file => new Promise<AppPreset | null>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
              try {
                  const rawContent = JSON.parse(e.target?.result as string);
                  
                  // Sanitize config using the same logic as importConfig
                  // Note: We don't apply it here, just prepare the object
                  const config: AppPreset['config'] = {
                      visualizerConfig: safeMerge(DEFAULT_VISUALIZER_CONFIG, rawContent.visualizerConfig),
                      reactorConfig: safeMerge(DEFAULT_REACTOR_CONFIG, rawContent.reactorConfig || DEFAULT_REACTOR_CONFIG),
                      dvdConfig: safeMerge(DEFAULT_DVD_CONFIG, rawContent.dvdConfig),
                      effectsConfig: safeMerge(DEFAULT_EFFECTS_CONFIG, rawContent.effectsConfig),
                      marqueeConfig: safeMerge(DEFAULT_MARQUEE_CONFIG, rawContent.marqueeConfig),
                      watermarkConfig: safeMerge(DEFAULT_WATERMARK_CONFIG, rawContent.watermarkConfig),
                      bgColor: rawContent.bgColor || '#000000',
                      bgPattern: rawContent.bgPattern || 'none',
                      bgPatternConfig: safeMerge({ intensity: 0.25, scale: 1.0 }, rawContent.bgPatternConfig),
                      showVisualizer: rawContent.showVisualizer ?? true,
                      showVisualizer3D: rawContent.showVisualizer3D ?? false,
                      showDvd: rawContent.showDvd ?? true,
                      bgAutoplayInterval: rawContent.bgAutoplayInterval ?? 5,
                      cursorStyle: rawContent.cursorStyle || 'theme-sync',
                      retroScreenCursorStyle: rawContent.retroScreenCursorStyle || 'dos-terminal',
                      theme: rawContent.theme || 'neon-retro',
                      controlStyle: rawContent.controlStyle || 'default',
                      bgTransition: rawContent.bgTransition || 'glitch',
                      bgAnimation: rawContent.bgAnimation || 'none' // Default to none
                  };

                  const presetName = file.name.replace(/\.nrp$/i, '').replace(/_/g, ' ');
                  const newPreset: AppPreset = {
                      id: crypto.randomUUID(),
                      name: presetName,
                      createdAt: Date.now(),
                      config: config
                  };
                  resolve(newPreset);
              } catch {
                  resolve(null);
              }
          };
          reader.readAsText(file);
      }));

      const results = await Promise.all(promises);
      const validPresets = results.filter(p => p !== null) as AppPreset[];

      if (validPresets.length > 0) {
          setSavedPresets(prev => [...prev, ...validPresets]);
          // Return the ID of the LAST imported preset so we can apply it
          return validPresets[validPresets.length - 1].id;
      }
      return null;
  };

  return {
    apiKey, setApiKey,
    showVisualizer, setShowVisualizer,
    showVisualizer3D, setShowVisualizer3D,
    showDvd, setShowDvd,
    marqueeConfig, setMarqueeConfig,
    visualizerConfig, setVisualizerConfig,
    reactorConfig, setReactorConfig,
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
    exportConfig, importConfig, batchImportPresets, // Exposed
    savedPresets,
    activePresetId,
    savePreset,
    overwritePreset,
    resetDefaultPreset,
    loadPreset,
    deletePreset,
    renamePreset,
    cursorStyle, setCursorStyle,
    retroScreenCursorStyle, setRetroScreenCursorStyle,
    bgTransition, setBgTransition,
    bgAnimation, setBgAnimation, // Exposed New State
    isAdvancedMode, setAdvancedMode,
    useAlbumArtAsBackground, setUseAlbumArtAsBackground // Exposed New State
  };
};