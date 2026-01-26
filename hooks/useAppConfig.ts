
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
  BG_TRANSITION: 'neon_bg_transition' // New Key
};

const DEFAULT_PRESETS: AppPreset[] = [
  {
    id: 'default_system',
    name: 'Default System',
    createdAt: Date.now(),
    config: {
      visualizerConfig: {
        style: 'blue', position: 'bottom', barCount: 128, sensitivity: 1.5, fillOpacity: 0.3,
        strokeEnabled: true, strokeOpacity: 0.8, showTips: true, normalize: false, preventVolumeScaling: false, minFrequency: 0, maxFrequency: 100, 
        barGap: 2, mirror: false, segmented: false, segmentHeight: 4, segmentGap: 2,
        tipHeight: 2, tipSpeed: 15, highlightLastBrick: false, tipColor: 'white', tipGlow: false, barGravity: 5
      },
      dvdConfig: { size: 150, speed: 2, opacity: 0.7, enableSfx: false, logoType: 'neon_waves' },
      effectsConfig: {
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
      },
      marqueeConfig: {
        enabled: true, style: 'matrix', showProgress: true, progressMode: 'blocks', progressHeight: 20, progressOpacity: 0.6,
        speed: 1, opacity: 0.9, fontSize: 40
      },
      watermarkConfig: { scale: 1.0, opacity: 1.0, flashIntensity: 0.5 },
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
  {
    id: 'middle_wave_bar',
    name: 'Middle Wave Bar Blue',
    createdAt: Date.now(),
    config: {
      visualizerConfig: {
        style: "blue",
        position: "center",
        barCount: 24,
        sensitivity: 0.8,
        fillOpacity: 0.2,
        strokeEnabled: true,
        strokeOpacity: 0.8,
        showTips: true,
        normalize: false,
        preventVolumeScaling: false,
        minFrequency: 5,
        maxFrequency: 81,
        barGap: 8,
        mirror: true,
        segmented: true,
        segmentHeight: 30,
        segmentGap: 9,
        tipHeight: 5,
        tipSpeed: 6,
        highlightLastBrick: true,
        tipColor: "white",
        tipGlow: true,
        barGravity: 5
      },
      dvdConfig: {
        size: 180,
        speed: 2,
        opacity: 1,
        enableSfx: false,
        logoType: "neon_waves"
      },
      effectsConfig: {
        fps: 60,
        pixelation: 1,
        noise: 0.05,
        chromaticAberration: 1,
        vhsJitter: 0.5,
        scanlineEnabled: true,
        scanlineIntensity: 0.25,
        scanlineThickness: 9,
        glitch: {
          enabled: false,
          intensity: 0.1,
          speed: 0.15,
          opacity: 0.35,
          variant: "v2"
        },
        cyberHack: {
          enabled: false,
          speed: 6,
          opacity: 0.7,
          density: 0.5,
          scale: 0.9,
          backgroundOpacity: 0.1
        },
        debugConsole: {
          enabled: false,
          opacity: 0.9,
          scale: 1.1
        },
        holograms: {
          enabled: false,
          opacity: 1,
          speed: 1,
          interval: 1,
          scale: 1.3,
          enableIcons: false,
          categories: {
            system: true,
            interactive: true,
            music: true,
            motivational: true,
            philosophy: true,
            space: true
          }
        },
        geminiChat: {
          enabled: false, opacity: 0.9, scale: 1.0, width: 350, typingSpeed: 1.0,
          categories: { system: false, interactive: true, music: true, motivational: true, philosophy: true, space: true }
        },
        lightLeaks: {
          enabled: false,
          intensity: 0.6,
          speed: 0.3,
          number: 8
        }
      },
      bgColor: "#000000",
      bgPattern: "dots",
      bgPatternConfig: {
        intensity: 1,
        scale: 1
      },
      showVisualizer: true,
      showDvd: false,
      marqueeConfig: {
        enabled: true,
        style: "matrix",
        showProgress: true,
        progressMode: "blocks",
        progressHeight: 20,
        progressOpacity: 0.6,
        speed: 1,
        opacity: 0.6,
        fontSize: 40
      },
      watermarkConfig: {
        scale: 1,
        opacity: 1,
        flashIntensity: 0.5
      },
      bgAutoplayInterval: 5,
      cursorStyle: "classic-blue",
      theme: "neon-blue",
      controlStyle: "round",
      bgTransition: 'leaks'
    }
  }
];

const getInitial = <T,>(key: string, defaultValue: T): T => {
  const saved = localStorage.getItem(key);
  if (!saved) return defaultValue;
  try { return JSON.parse(saved); } catch { return defaultValue; }
};

export const useAppConfig = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEYS.API_KEY) || '');
  const [showVisualizer, setShowVisualizer] = useState(() => getInitial(STORAGE_KEYS.SHOW_VISUALIZER, true));
  const [showDvd, setShowDvd] = useState(() => getInitial(STORAGE_KEYS.SHOW_DVD, true));
  const [cursorStyle, setCursorStyle] = useState<CursorStyle>(() => getInitial(STORAGE_KEYS.CURSOR, 'default'));
  const [bgTransition, setBgTransition] = useState<BgTransitionType>(() => getInitial(STORAGE_KEYS.BG_TRANSITION, 'glitch'));
  
  const [marqueeConfig, setMarqueeConfig] = useState<MarqueeConfig>(() => {
    const defaults = {
      enabled: true, 
      style: 'matrix',
      showProgress: true, 
      progressMode: 'blocks',
      progressHeight: 20,
      progressOpacity: 0.6,
      speed: 1, 
      opacity: 0.9, 
      fontSize: 40
    } as MarqueeConfig;

    const initial = getInitial(STORAGE_KEYS.MARQUEE, defaults);
    
    return { ...defaults, ...initial };
  });

  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>(() => {
    const defaults: WatermarkConfig = { scale: 1.0, opacity: 1.0, flashIntensity: 0.5 };
    const initial = getInitial(STORAGE_KEYS.WATERMARK, defaults);
    return { ...defaults, ...initial };
  });

  const [visualizerConfig, setVisualizerConfig] = useState<VisualizerConfig>(() => {
    const defaults: VisualizerConfig = {
      style: 'blue', position: 'bottom', barCount: 128, sensitivity: 1.5, fillOpacity: 0.3,
      strokeEnabled: true, strokeOpacity: 0.8, showTips: true, normalize: false, preventVolumeScaling: false, minFrequency: 0, maxFrequency: 100, 
      barGap: 2, mirror: false, segmented: false, segmentHeight: 4, segmentGap: 2,
      tipHeight: 2, tipSpeed: 15, highlightLastBrick: false, tipColor: 'white', tipGlow: false, barGravity: 5
    };

    const initial = getInitial(STORAGE_KEYS.VISUALIZER, defaults);
    return { ...defaults, ...initial }
  });

  const [dvdConfig, setDvdConfig] = useState<DvdConfig>(() => {
    const defaults: DvdConfig = { size: 150, speed: 2, opacity: 0.7, enableSfx: false, logoType: 'neon_waves' };
    const initial = getInitial(STORAGE_KEYS.DVD, defaults);
    return { ...defaults, ...initial };
  });

  const [effectsConfig, setEffectsConfig] = useState<EffectsConfig>(() => {
      const defaults: EffectsConfig = {
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
      const initial = getInitial(STORAGE_KEYS.EFFECTS, defaults);
      
      const hologramDefaults = { enabled: false, opacity: 0.8, speed: 1.0, interval: 15, scale: 1.0, enableIcons: false };
      const lightLeaksDefaults = { enabled: false, intensity: 0.5, speed: 0.5, number: 6 };
      const geminiDefaults = {
          enabled: false, opacity: 0.9, scale: 1.0, width: 350, typingSpeed: 1.0,
          categories: { system: false, interactive: true, music: true, motivational: true, philosophy: true, space: true }
      };

      const savedCategories = (initial.holograms?.categories || {}) as any;
      const mergedCategories = {
          system: savedCategories.system ?? true,
          interactive: savedCategories.interactive ?? true,
          music: savedCategories.music ?? true,
          motivational: savedCategories.motivational ?? true,
          philosophy: savedCategories.philosophy ?? false,
          space: savedCategories.space ?? false
      };

      return {
          ...initial,
          debugConsole: initial.debugConsole || { enabled: false, opacity: 0.9, scale: 1.0 },
          holograms: { 
            ...hologramDefaults,
            ...(initial.holograms || {}),
            categories: mergedCategories
          },
          geminiChat: { ...geminiDefaults, ...initial.geminiChat },
          lightLeaks: initial.lightLeaks || lightLeaksDefaults
      }
  });
  
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

    const { config } = preset;
    
    setVisualizerConfig(config.visualizerConfig);
    setDvdConfig(config.dvdConfig);
    setEffectsConfig(config.effectsConfig);
    setMarqueeConfig(config.marqueeConfig);
    setBgColor(config.bgColor);
    setBgPattern(config.bgPattern);
    setBgPatternConfig(config.bgPatternConfig);
    setShowVisualizer(config.showVisualizer);
    setShowDvd(config.showDvd);
    setBgAutoplayInterval(config.bgAutoplayInterval);
    if (config.cursorStyle) setCursorStyle(config.cursorStyle);
    if (config.watermarkConfig) setWatermarkConfig(config.watermarkConfig);
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
        const content = JSON.parse(event.target?.result as string);
        if (content.visualizerConfig) setVisualizerConfig(content.visualizerConfig);
        if (content.dvdConfig) setDvdConfig(content.dvdConfig);
        if (content.effectsConfig) setEffectsConfig(content.effectsConfig);
        if (content.bgColor) setBgColor(content.bgColor);
        if (content.bgPattern) setBgPattern(content.bgPattern);
        if (content.bgPatternConfig) setBgPatternConfig(content.bgPatternConfig);
        if (typeof content.showVisualizer === 'boolean') setShowVisualizer(content.showVisualizer);
        if (typeof content.showDvd === 'boolean') setShowDvd(content.showDvd);
        if (content.marqueeConfig) setMarqueeConfig(content.marqueeConfig);
        if (typeof content.bgAutoplayInterval === 'number') setBgAutoplayInterval(content.bgAutoplayInterval);
        if (content.cursorStyle) setCursorStyle(content.cursorStyle);
        if (content.watermarkConfig) setWatermarkConfig(content.watermarkConfig);
        if (content.bgTransition) setBgTransition(content.bgTransition);
        
        // Pass the full content to callback so App can handle theme/style
        if (onLoadCallback) onLoadCallback(content);

      } catch (err) {
        console.error("Failed to parse NRP config file", err);
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