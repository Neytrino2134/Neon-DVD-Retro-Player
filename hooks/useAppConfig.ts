
import { useState, useEffect, useCallback } from 'react';
import { VisualizerConfig, DvdConfig, EffectsConfig, MarqueeConfig, PatternConfig, BackgroundMedia, BackgroundPlaylist, AppPreset, CursorStyle, WatermarkConfig, ThemeType, ControlStyle, BgTransitionType, BgAnimationType, BgHotspot, EqualizerConfig, FitMode, ScreenAlignment, YouTubeAuthConfig, TerrainConfig } from '../types';
import { getAllBackgrounds, saveBackground, deleteBackground, getAllBgPlaylists, saveBgPlaylist, deleteBgPlaylistAndFiles, getDvdLogoById } from '../lib/db';
import { 
  DEFAULT_VISUALIZER_CONFIG, 
  DEFAULT_REACTOR_CONFIG,
  DEFAULT_SINE_WAVE_CONFIG,
  DEFAULT_TERRAIN_CONFIG,
  DEFAULT_GLOBAL_WAVEFORM_CONFIG, // NEW
  DEFAULT_DVD_CONFIG, 
  DEFAULT_EFFECTS_CONFIG, 
  DEFAULT_MARQUEE_CONFIG, 
  DEFAULT_WATERMARK_CONFIG,
  DEFAULT_EQUALIZER_CONFIG,
  DEFAULT_YOUTUBE_AUTH_CONFIG
} from '../config/defaults';
import { DEFAULT_PRESETS, DEFAULT_SYSTEM_PRESET } from '../config/presets';

const STORAGE_KEYS = {
  GLOBAL_WAVE: 'neon_global_waveform_config', // NEW
  VISUALIZER: 'neon_visualizer_config',
  REACTOR: 'neon_reactor_config',
  SINE_WAVE: 'neon_sine_wave_config', 
  TERRAIN: 'neon_terrain_config',
  DVD: 'neon_dvd_config',
  EFFECTS: 'neon_effects_config',
  BG_COLOR: 'neon_bg_color',
  BG_PATTERN: 'neon_bg_pattern',
  BG_PATTERN_CONFIG: 'neon_bg_pattern_config',
  SHOW_VISUALIZER: 'neon_show_visualizer',
  SHOW_VISUALIZER_3D: 'neon_show_visualizer_3d', 
  SHOW_SINE_WAVE: 'neon_show_sine_wave',
  SHOW_TERRAIN: 'neon_show_terrain',
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
  BG_ANIMATION: 'neon_bg_animation', 
  ADVANCED_MODE: 'neon_advanced_mode',
  USE_ALBUM_ART: 'neon_use_album_art',
  ACTIVE_BG_PLAYLIST: 'neon_active_bg_playlist',
  PLAYING_BG_PLAYLIST: 'neon_playing_bg_playlist',
  EQUALIZER: 'neon_equalizer_config',
  SCREEN_FIT: 'neon_screen_fit', 
  SCREEN_ALIGN: 'neon_screen_align',
  YOUTUBE_AUTH: 'neon_youtube_auth',
  SYNC_BG_WITH_TRACK: 'neon_sync_bg_with_track' // NEW
};

// Map of Main Section ID -> Array of Child Module IDs (for accordion logic)
const SECTION_MODULES: Record<string, string[]> = {
  sys: ['files', 'presets', 'themes', 'youtube_auth', 'debug'], 
  bg: ['bg-settings', 'bg-resources', 'bg-colors', 'screen-share'],
  sfx: ['mixer', 'ambience', 'sysaudio'],
  waves: ['master_wave', 'wave', 'reactor', 'sine', 'terrain'], // Added master_wave
  mod: ['marquee', 'dvd', 'leaks', 'rain', 'hologram', 'gemini', 'youtube_chat', 'scan', 'cyber', 'glitch'], 
  game: ['tron', 'life'], // Added life
  post: ['fps', 'signal', 'chromatic', 'vignette', 'flicker', 'video']
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
  const [showSineWave, setShowSineWave] = useState(() => getInitial(STORAGE_KEYS.SHOW_SINE_WAVE, false));
  const [showVisualizerTerrain, setShowVisualizerTerrain] = useState(() => getInitial(STORAGE_KEYS.SHOW_TERRAIN, false)); 

  const [showDvd, setShowDvd] = useState(() => getInitial(STORAGE_KEYS.SHOW_DVD, true));
  const [cursorStyle, setCursorStyle] = useState<CursorStyle>(() => getInitial(STORAGE_KEYS.CURSOR, 'theme-sync'));
  const [retroScreenCursorStyle, setRetroScreenCursorStyle] = useState<CursorStyle>(() => getInitial(STORAGE_KEYS.RETRO_CURSOR, 'dos-terminal'));
  const [bgTransition, setBgTransition] = useState<BgTransitionType>(() => getInitial(STORAGE_KEYS.BG_TRANSITION, 'glitch'));
  const [bgAnimation, setBgAnimation] = useState<BgAnimationType>(() => getInitial(STORAGE_KEYS.BG_ANIMATION, 'none')); 
  const [isAdvancedMode, setAdvancedMode] = useState(() => getInitial(STORAGE_KEYS.ADVANCED_MODE, false));
  const [useAlbumArtAsBackground, setUseAlbumArtAsBackground] = useState(() => getInitial(STORAGE_KEYS.USE_ALBUM_ART, false));
  const [screenFitMode, setScreenFitMode] = useState<FitMode>(() => localStorage.getItem(STORAGE_KEYS.SCREEN_FIT) as FitMode || 'cover'); 
  const [screenAlignment, setScreenAlignment] = useState<ScreenAlignment>(() => localStorage.getItem(STORAGE_KEYS.SCREEN_ALIGN) as ScreenAlignment || 'center'); 
  
  const [marqueeConfig, setMarqueeConfig] = useState<MarqueeConfig>(() => getInitial(STORAGE_KEYS.MARQUEE, DEFAULT_MARQUEE_CONFIG));
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig>(() => getInitial(STORAGE_KEYS.WATERMARK, DEFAULT_WATERMARK_CONFIG));
  const [equalizerConfig, setEqualizerConfig] = useState<EqualizerConfig>(() => getInitial(STORAGE_KEYS.EQUALIZER, DEFAULT_EQUALIZER_CONFIG));
  const [youTubeConfig, setYouTubeConfig] = useState<YouTubeAuthConfig>(() => getInitial(STORAGE_KEYS.YOUTUBE_AUTH, DEFAULT_YOUTUBE_AUTH_CONFIG));
  
  // Independent Configs
  const [globalWaveformConfig, setGlobalWaveformConfig] = useState<VisualizerConfig>(() => getInitial(STORAGE_KEYS.GLOBAL_WAVE, DEFAULT_GLOBAL_WAVEFORM_CONFIG));
  const [visualizerConfig, setVisualizerConfig] = useState<VisualizerConfig>(() => getInitial(STORAGE_KEYS.VISUALIZER, DEFAULT_VISUALIZER_CONFIG));
  const [reactorConfig, setReactorConfig] = useState<VisualizerConfig>(() => getInitial(STORAGE_KEYS.REACTOR, DEFAULT_REACTOR_CONFIG));
  const [sineWaveConfig, setSineWaveConfig] = useState<VisualizerConfig>(() => getInitial(STORAGE_KEYS.SINE_WAVE, DEFAULT_SINE_WAVE_CONFIG));
  const [terrainConfig, setTerrainConfig] = useState<TerrainConfig>(() => getInitial(STORAGE_KEYS.TERRAIN, DEFAULT_TERRAIN_CONFIG)); 
  
  const [dvdConfig, setDvdConfig] = useState<DvdConfig>(() => getInitial(STORAGE_KEYS.DVD, DEFAULT_DVD_CONFIG));
  const [effectsConfig, setEffectsConfig] = useState<EffectsConfig>(() => getInitial(STORAGE_KEYS.EFFECTS, DEFAULT_EFFECTS_CONFIG));
  
  const [bgColor, setBgColor] = useState(() => localStorage.getItem(STORAGE_KEYS.BG_COLOR) || 'theme-sync');
  const [bgPattern, setBgPattern] = useState(() => localStorage.getItem(STORAGE_KEYS.BG_PATTERN) || 'none');
  const [bgPatternConfig, setBgPatternConfig] = useState<PatternConfig>(() => getInitial(STORAGE_KEYS.BG_PATTERN_CONFIG, { intensity: 0.25, scale: 1.0 }));
  
  // --- BACKGROUND PLAYLISTS STATE ---
  const [bgPlaylists, setBgPlaylists] = useState<BackgroundPlaylist[]>([]);
  const [activeBgPlaylistId, setActiveBgPlaylistId] = useState<string>(''); 
  const [playingBgPlaylistId, setPlayingBgPlaylistId] = useState<string>(''); 
  const [currentBgIndex, setCurrentBgIndex] = useState<number>(0);
  
  const [bgAutoplayInterval, setBgAutoplayInterval] = useState<number>(() => getInitial(STORAGE_KEYS.BG_AUTOPLAY, 5));
  const [syncBgWithTrack, setSyncBgWithTrack] = useState<boolean>(() => getInitial(STORAGE_KEYS.SYNC_BG_WITH_TRACK, false)); // NEW
  
  const [timerResetToken, setTimerResetToken] = useState(0);

  // Active Preset State
  const [activePresetId, setActivePresetId] = useState<string | null>(() => {
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

  // --- UI PERSISTENCE STATE ---
  const [settingsExpandedState, setSettingsExpandedState] = useState<Record<string, boolean>>({});
  const [settingsOpenSections, setSettingsOpenSections] = useState<Record<string, boolean>>({
      sys: true,
      bg: true,
      sfx: true,
      waves: true, 
      mod: true,
      game: true,
      post: true
  });

  const toggleSettingsExpand = (id: string, isAdditive: boolean, forceOpen?: boolean) => {
        setSettingsExpandedState(prev => {
            const isCurrentlyOpen = prev[id];
            let newState = { ...prev };
    
            if (isAdditive && forceOpen === undefined) {
                // Shift click: Toggle target, leave others alone
                newState[id] = !isCurrentlyOpen;
            } else {
                // Normal click OR Force Open: Accordion behavior within the section
                let groupIds: string[] = [];
                for (const sectionKey in SECTION_MODULES) {
                    if (SECTION_MODULES[sectionKey].includes(id)) {
                        groupIds = SECTION_MODULES[sectionKey];
                        break;
                    }
                }
    
                groupIds.forEach(siblingId => {
                    if (siblingId !== id) {
                        newState[siblingId] = false;
                    }
                });
    
                newState[id] = forceOpen !== undefined ? forceOpen : !isCurrentlyOpen;
            }
            return newState;
        });
  };

  const toggleSettingsSection = (sectionId: string, isAdditive: boolean = false) => {
      setSettingsOpenSections(prev => {
          const isCurrentlyOpen = prev[sectionId];
          let newState: Record<string, boolean> = { ...prev };
          
          if (!isCurrentlyOpen) {
              setSettingsExpandedState({}); 
          }

          if (isAdditive) {
              newState[sectionId] = !isCurrentlyOpen;
          } else {
              Object.keys(prev).forEach(key => {
                  if (key !== sectionId && prev[key]) {
                      newState[key] = false;
                  }
              });
              newState[sectionId] = true;
          }
          return newState;
      });
  };

  useEffect(() => {
      const handleToggleSection = (e: CustomEvent) => {
          const sectionId = e.detail;
          if (sectionId && SECTION_MODULES[sectionId]) { 
              toggleSettingsSection(sectionId, false);
          }
      };

      const handleToggleModule = (e: CustomEvent) => {
          const moduleId = e.detail;
          if (moduleId) {
              toggleSettingsExpand(moduleId, false, true); 
              let parentSection = '';
              for (const [sec, modules] of Object.entries(SECTION_MODULES)) {
                  if (modules.includes(moduleId)) {
                      parentSection = sec;
                      break;
                  }
              }
              if (parentSection) {
                  setSettingsOpenSections(prev => ({ ...prev, [parentSection]: true }));
              }
          }
      };

      window.addEventListener('neon-toggle-section', handleToggleSection as EventListener);
      window.addEventListener('neon-toggle-module', handleToggleModule as EventListener);

      return () => {
          window.removeEventListener('neon-toggle-section', handleToggleSection as EventListener);
          window.removeEventListener('neon-toggle-module', handleToggleModule as EventListener);
      };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GLOBAL_WAVE, JSON.stringify(globalWaveformConfig));
    localStorage.setItem(STORAGE_KEYS.VISUALIZER, JSON.stringify(visualizerConfig));
    localStorage.setItem(STORAGE_KEYS.REACTOR, JSON.stringify(reactorConfig));
    localStorage.setItem(STORAGE_KEYS.SINE_WAVE, JSON.stringify(sineWaveConfig));
    localStorage.setItem(STORAGE_KEYS.TERRAIN, JSON.stringify(terrainConfig));
    localStorage.setItem(STORAGE_KEYS.DVD, JSON.stringify(dvdConfig));
    localStorage.setItem(STORAGE_KEYS.EFFECTS, JSON.stringify(effectsConfig));
    localStorage.setItem(STORAGE_KEYS.BG_COLOR, bgColor);
    localStorage.setItem(STORAGE_KEYS.BG_PATTERN, bgPattern);
    localStorage.setItem(STORAGE_KEYS.BG_PATTERN_CONFIG, JSON.stringify(bgPatternConfig));
    localStorage.setItem(STORAGE_KEYS.SHOW_VISUALIZER, JSON.stringify(showVisualizer));
    localStorage.setItem(STORAGE_KEYS.SHOW_VISUALIZER_3D, JSON.stringify(showVisualizer3D));
    localStorage.setItem(STORAGE_KEYS.SHOW_SINE_WAVE, JSON.stringify(showSineWave));
    localStorage.setItem(STORAGE_KEYS.SHOW_TERRAIN, JSON.stringify(showVisualizerTerrain));
    localStorage.setItem(STORAGE_KEYS.SHOW_DVD, JSON.stringify(showDvd));
    localStorage.setItem(STORAGE_KEYS.MARQUEE, JSON.stringify(marqueeConfig));
    localStorage.setItem(STORAGE_KEYS.WATERMARK, JSON.stringify(watermarkConfig));
    localStorage.setItem(STORAGE_KEYS.EQUALIZER, JSON.stringify(equalizerConfig));
    localStorage.setItem(STORAGE_KEYS.BG_AUTOPLAY, JSON.stringify(bgAutoplayInterval));
    localStorage.setItem(STORAGE_KEYS.CURSOR, JSON.stringify(cursorStyle));
    localStorage.setItem(STORAGE_KEYS.RETRO_CURSOR, JSON.stringify(retroScreenCursorStyle));
    localStorage.setItem(STORAGE_KEYS.BG_TRANSITION, JSON.stringify(bgTransition));
    localStorage.setItem(STORAGE_KEYS.BG_ANIMATION, JSON.stringify(bgAnimation)); 
    localStorage.setItem(STORAGE_KEYS.ADVANCED_MODE, JSON.stringify(isAdvancedMode));
    localStorage.setItem(STORAGE_KEYS.USE_ALBUM_ART, JSON.stringify(useAlbumArtAsBackground));
    localStorage.setItem(STORAGE_KEYS.SCREEN_FIT, screenFitMode);
    localStorage.setItem(STORAGE_KEYS.SCREEN_ALIGN, screenAlignment);
    localStorage.setItem(STORAGE_KEYS.YOUTUBE_AUTH, JSON.stringify(youTubeConfig));
    localStorage.setItem(STORAGE_KEYS.SYNC_BG_WITH_TRACK, JSON.stringify(syncBgWithTrack)); // NEW
  }, [globalWaveformConfig, visualizerConfig, reactorConfig, sineWaveConfig, terrainConfig, dvdConfig, effectsConfig, bgColor, bgPattern, bgPatternConfig, showVisualizer, showVisualizer3D, showSineWave, showVisualizerTerrain, showDvd, marqueeConfig, watermarkConfig, bgAutoplayInterval, cursorStyle, retroScreenCursorStyle, bgTransition, bgAnimation, isAdvancedMode, useAlbumArtAsBackground, equalizerConfig, screenFitMode, screenAlignment, youTubeConfig, syncBgWithTrack]);

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

  // Persist Active/Playing BG Playlist
  useEffect(() => {
      if (activeBgPlaylistId) localStorage.setItem(STORAGE_KEYS.ACTIVE_BG_PLAYLIST, activeBgPlaylistId);
      if (playingBgPlaylistId) localStorage.setItem(STORAGE_KEYS.PLAYING_BG_PLAYLIST, playingBgPlaylistId);
  }, [activeBgPlaylistId, playingBgPlaylistId]);

  // ... (Hydrate logic same as before) ...
  useEffect(() => {
    const hydrate = async () => {
      const savedBgs = await getAllBackgrounds();
      const savedPlaylists = await getAllBgPlaylists();
      let hydratedPlaylists: BackgroundPlaylist[] = [];
      if (savedPlaylists.length === 0) {
          const defaultId = crypto.randomUUID();
          const defaultPl = { id: defaultId, name: 'DEFAULT', order: 0 };
          await saveBgPlaylist(defaultPl);
          const processedFiles = [];
          for (const bg of savedBgs) {
              const updated = { ...bg, playlistId: defaultId };
              if (!bg.playlistId) {
                  await saveBackground(updated);
                  bg.playlistId = defaultId;
              }
              processedFiles.push({ ...bg, url: URL.createObjectURL(bg.file) });
          }
          hydratedPlaylists = [{ ...defaultPl, items: processedFiles }];
      } else {
          const processedFiles = savedBgs.map(bg => ({ ...bg, url: URL.createObjectURL(bg.file) }));
          hydratedPlaylists = savedPlaylists.map(pl => ({ ...pl, items: processedFiles.filter(f => f.playlistId === pl.id) }));
      }
      setBgPlaylists(hydratedPlaylists);
      const savedActive = localStorage.getItem(STORAGE_KEYS.ACTIVE_BG_PLAYLIST);
      const savedPlaying = localStorage.getItem(STORAGE_KEYS.PLAYING_BG_PLAYLIST);
      if (savedActive && hydratedPlaylists.some(p => p.id === savedActive)) setActiveBgPlaylistId(savedActive);
      else if (hydratedPlaylists.length > 0) setActiveBgPlaylistId(hydratedPlaylists[0].id);
      if (savedPlaying && hydratedPlaylists.some(p => p.id === savedPlaying)) setPlayingBgPlaylistId(savedPlaying);
      else if (hydratedPlaylists.length > 0) setPlayingBgPlaylistId(hydratedPlaylists[0].id);
      setCurrentBgIndex(0);
    };
    hydrate();
  }, []);

  useEffect(() => {
      const hydrateDvdLogo = async () => {
          if (dvdConfig.logoType === 'custom' && dvdConfig.activeDvdLogoId) {
              const storedLogo = await getDvdLogoById(dvdConfig.activeDvdLogoId);
              if (storedLogo) {
                  setDvdConfig(prev => ({ ...prev, customLogoUrl: URL.createObjectURL(storedLogo.file) }));
              }
          }
      };
      hydrateDvdLogo();
  }, []);

  // ... (BG Logic functions unchanged) ...
  const addBgPlaylist = async () => {
      const id = crypto.randomUUID();
      const name = `BG Playlist ${bgPlaylists.length + 1}`;
      const newPl = { id, name, order: bgPlaylists.length, items: [] };
      await saveBgPlaylist({ id, name, order: bgPlaylists.length });
      setBgPlaylists(prev => [...prev, newPl]);
      setActiveBgPlaylistId(id);
      if (!playingBgPlaylistId) setPlayingBgPlaylistId(id);
  };

  const removeBgPlaylist = async (id: string) => {
      await deleteBgPlaylistAndFiles(id);
      setBgPlaylists(prev => {
          const filtered = prev.filter(p => p.id !== id);
          if (activeBgPlaylistId === id) setActiveBgPlaylistId(filtered.length > 0 ? filtered[0].id : '');
          if (playingBgPlaylistId === id) setPlayingBgPlaylistId(filtered.length > 0 ? filtered[0].id : '');
          return filtered;
      });
  };

  const renameBgPlaylist = async (id: string, newName: string) => {
      const pl = bgPlaylists.find(p => p.id === id);
      if (pl) {
          await saveBgPlaylist({ id, name: newName, order: pl.order });
          setBgPlaylists(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
      }
  };

  const handleBgUpload = async (files: FileList | File[]) => {
      if (!activeBgPlaylistId) {
          if (bgPlaylists.length === 0) await addBgPlaylist();
          else setActiveBgPlaylistId(bgPlaylists[0].id);
      }
      const targetId = activeBgPlaylistId || (bgPlaylists.length > 0 ? bgPlaylists[0].id : '');
      if (!targetId) return;

      const newItems: BackgroundMedia[] = [];
      const fileArray = Array.from(files);

      for (const file of fileArray) {
          const type = file.type.startsWith('video') ? 'video' : 'image';
          const id = crypto.randomUUID();
          await saveBackground({ id, playlistId: targetId, type, file });
          newItems.push({ id, playlistId: targetId, type, url: URL.createObjectURL(file), file });
      }

      setBgPlaylists(prev => prev.map(pl => 
          pl.id === targetId 
              ? { ...pl, items: [...pl.items, ...newItems] } 
              : pl
      ));
  };

  const updateBg = async (id: string, newFile: File) => {
      const activePl = bgPlaylists.find(pl => pl.id === activeBgPlaylistId);
      if (!activePl) return;
      
      const itemIndex = activePl.items.findIndex(i => i.id === id);
      if (itemIndex === -1) return;
      
      const item = activePl.items[itemIndex];
      URL.revokeObjectURL(item.url);
      
      const newUrl = URL.createObjectURL(newFile);
      const updatedItem = { ...item, file: newFile, url: newUrl };
      
      await saveBackground({ 
          id: item.id, 
          playlistId: item.playlistId, 
          type: item.type, 
          file: newFile,
          hotspots: item.hotspots
      });

      setBgPlaylists(prev => prev.map(pl => 
          pl.id === activeBgPlaylistId 
              ? { ...pl, items: pl.items.map(i => i.id === id ? updatedItem : i) } 
              : pl
      ));
  };

  const updateBgMetadata = async (id: string, hotspots: BgHotspot[]) => {
      const activePl = bgPlaylists.find(pl => pl.id === activeBgPlaylistId);
      if (!activePl) return;
      
      const item = activePl.items.find(i => i.id === id);
      if (!item) return;

      const updatedItem = { ...item, hotspots };
      
      await saveBackground({ 
          id: item.id, 
          playlistId: item.playlistId, 
          type: item.type, 
          file: item.file,
          hotspots
      });

      setBgPlaylists(prev => prev.map(pl => 
          pl.id === activeBgPlaylistId 
              ? { ...pl, items: pl.items.map(i => i.id === id ? updatedItem : i) } 
              : pl
      ));
  };

  const removeBg = async (id: string) => {
      await deleteBackground(id);
      setBgPlaylists(prev => prev.map(pl => 
          pl.id === activeBgPlaylistId 
              ? { ...pl, items: pl.items.filter(i => i.id !== id) } 
              : pl
      ));
  };

  const moveBg = (index: number, direction: 'up' | 'down') => {
      setBgPlaylists(prev => prev.map(pl => {
          if (pl.id !== activeBgPlaylistId) return pl;
          
          const newItems = [...pl.items];
          if (direction === 'up' && index > 0) {
              [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
          } else if (direction === 'down' && index < newItems.length - 1) {
              [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
          }
          return { ...pl, items: newItems };
      }));
  };

  const selectBg = (index: number) => {
      if (activeBgPlaylistId !== playingBgPlaylistId) {
          setPlayingBgPlaylistId(activeBgPlaylistId);
      }
      setCurrentBgIndex(index);
      setTimerResetToken(prev => prev + 1);
  };

  const deselectBg = () => {
      setPlayingBgPlaylistId('');
      setUseAlbumArtAsBackground(false);
  };

  const handleClearBg = async () => {
      const pl = bgPlaylists.find(p => p.id === activeBgPlaylistId);
      if (!pl) return;
      
      for (const item of pl.items) {
          await deleteBackground(item.id);
      }
      
      setBgPlaylists(prev => prev.map(p => 
          p.id === activeBgPlaylistId ? { ...p, items: [] } : p
      ));
  };

  const shuffleBgList = () => {
      setBgPlaylists(prev => prev.map(pl => {
          if (pl.id !== activeBgPlaylistId) return pl;
          const shuffled = [...pl.items].sort(() => Math.random() - 0.5);
          return { ...pl, items: shuffled };
      }));
  };

  const getPlayingList = useCallback(() => {
      const pl = bgPlaylists.find(p => p.id === playingBgPlaylistId);
      return pl ? pl.items : [];
  }, [bgPlaylists, playingBgPlaylistId]);

  const nextBg = useCallback(() => {
      const list = getPlayingList();
      if (list.length === 0) return;
      setCurrentBgIndex(prev => (prev + 1) % list.length);
      setTimerResetToken(t => t + 1);
  }, [getPlayingList]);

  const prevBg = useCallback(() => {
      const list = getPlayingList();
      if (list.length === 0) return;
      setCurrentBgIndex(prev => (prev - 1 + list.length) % list.length);
      setTimerResetToken(t => t + 1);
  }, [getPlayingList]);

  useEffect(() => {
    const list = getPlayingList();
    if (list && list.length > 1 && bgAutoplayInterval > 0) { 
        const intervalMs = bgAutoplayInterval * 60 * 1000;
        const intervalId = setInterval(nextBg, intervalMs);
        return () => clearInterval(intervalId);
    }
  }, [getPlayingList, bgAutoplayInterval, nextBg, timerResetToken]);

  // --- PRESET MANAGEMENT ---
  const savePreset = (name: string, theme?: ThemeType, controlStyle?: ControlStyle) => {
    const newPreset: AppPreset = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      config: {
        globalWaveformConfig, // SAVE GLOBAL CONFIG
        visualizerConfig,
        reactorConfig,
        sineWaveConfig,
        terrainConfig,
        dvdConfig,
        effectsConfig,
        marqueeConfig,
        watermarkConfig,
        bgColor,
        bgPattern,
        bgPatternConfig,
        showVisualizer,
        showVisualizer3D,
        showSineWave,
        showVisualizerTerrain,
        showDvd,
        bgAutoplayInterval,
        syncBgWithTrack, // SAVE SYNC TOGGLE
        cursorStyle,
        retroScreenCursorStyle,
        theme,
        controlStyle,
        bgTransition,
        bgAnimation,
        ambienceConfig: undefined,
        equalizerConfig,
        youtubeAuth: youTubeConfig
      }
    };
    setSavedPresets(prev => [...prev, newPreset]);
    setActivePresetId(newPreset.id);
  };

  const overwritePreset = (id: string, theme?: ThemeType, controlStyle?: ControlStyle) => {
      setSavedPresets(prev => prev.map(p => {
          if (p.id === id) {
              return {
                  ...p,
                  config: {
                    ...p.config,
                    globalWaveformConfig, // SAVE GLOBAL CONFIG
                    visualizerConfig,
                    reactorConfig,
                    sineWaveConfig,
                    terrainConfig,
                    dvdConfig,
                    effectsConfig,
                    marqueeConfig,
                    watermarkConfig,
                    bgColor,
                    bgPattern,
                    bgPatternConfig,
                    showVisualizer,
                    showVisualizer3D,
                    showSineWave,
                    showVisualizerTerrain,
                    showDvd,
                    bgAutoplayInterval,
                    syncBgWithTrack, // SAVE SYNC TOGGLE
                    cursorStyle,
                    retroScreenCursorStyle,
                    theme: theme || p.config.theme,
                    controlStyle: controlStyle || p.config.controlStyle,
                    bgTransition,
                    bgAnimation,
                    equalizerConfig,
                    youtubeAuth: youTubeConfig
                  }
              };
          }
          return p;
      }));
  };

  const loadPreset = (id: string): AppPreset['config'] | null => {
    const preset = savedPresets.find(p => p.id === id);
    if (!preset) return null;
    const c = preset.config;
    
    // SAFE MERGES
    setGlobalWaveformConfig(safeMerge(DEFAULT_GLOBAL_WAVEFORM_CONFIG, c.globalWaveformConfig || {})); // LOAD GLOBAL
    setVisualizerConfig(safeMerge(DEFAULT_VISUALIZER_CONFIG, c.visualizerConfig));
    setReactorConfig(safeMerge(DEFAULT_REACTOR_CONFIG, c.reactorConfig || {}));
    setSineWaveConfig(safeMerge(DEFAULT_SINE_WAVE_CONFIG, c.sineWaveConfig || {}));
    setTerrainConfig(safeMerge(DEFAULT_TERRAIN_CONFIG, c.terrainConfig || {}));
    setDvdConfig(safeMerge(DEFAULT_DVD_CONFIG, c.dvdConfig));
    setEffectsConfig(safeMerge(DEFAULT_EFFECTS_CONFIG, c.effectsConfig));
    setMarqueeConfig(safeMerge(DEFAULT_MARQUEE_CONFIG, c.marqueeConfig));
    setWatermarkConfig(safeMerge(DEFAULT_WATERMARK_CONFIG, c.watermarkConfig || {}));
    setEqualizerConfig(safeMerge(DEFAULT_EQUALIZER_CONFIG, c.equalizerConfig || {}));
    setYouTubeConfig(safeMerge(DEFAULT_YOUTUBE_AUTH_CONFIG, c.youtubeAuth || {}));
    
    setBgColor(c.bgColor);
    setBgPattern(c.bgPattern);
    setBgPatternConfig(safeMerge({ intensity: 0.25, scale: 1.0 }, c.bgPatternConfig));
    
    setShowVisualizer(c.showVisualizer);
    setShowVisualizer3D(c.showVisualizer3D || false);
    setShowSineWave(c.showSineWave || false);
    setShowVisualizerTerrain(c.showVisualizerTerrain || false); 
    setShowDvd(c.showDvd);
    
    setBgAutoplayInterval(c.bgAutoplayInterval);
    if (c.syncBgWithTrack !== undefined) setSyncBgWithTrack(c.syncBgWithTrack); // LOAD SYNC TOGGLE

    if (c.cursorStyle) setCursorStyle(c.cursorStyle);
    if (c.retroScreenCursorStyle) setRetroScreenCursorStyle(c.retroScreenCursorStyle);
    if (c.bgTransition) setBgTransition(c.bgTransition);
    if (c.bgAnimation) setBgAnimation(c.bgAnimation);

    setActivePresetId(id);
    return c;
  };

  const deletePreset = (id: string) => {
      setSavedPresets(prev => prev.filter(p => p.id !== id));
      if (activePresetId === id) setActivePresetId(null);
  };

  const renamePreset = (id: string, newName: string) => {
      setSavedPresets(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  const resetDefaultPreset = () => { setActivePresetId(null); return DEFAULT_SYSTEM_PRESET.config; };
  
  const exportConfig = (currentTheme?: ThemeType, currentControlStyle?: ControlStyle) => {
      const config = {
        globalWaveformConfig, // EXPORT GLOBAL
        visualizerConfig,
        reactorConfig,
        sineWaveConfig,
        terrainConfig,
        dvdConfig,
        effectsConfig,
        marqueeConfig,
        watermarkConfig,
        bgColor,
        bgPattern,
        bgPatternConfig,
        showVisualizer,
        showVisualizer3D,
        showSineWave,
        showVisualizerTerrain,
        showDvd,
        bgAutoplayInterval,
        syncBgWithTrack, // EXPORT SYNC TOGGLE
        cursorStyle,
        retroScreenCursorStyle,
        bgTransition,
        bgAnimation,
        theme: currentTheme,
        controlStyle: currentControlStyle,
        equalizerConfig,
        youtubeAuth: youTubeConfig,
        version: '1.2'
      };
      
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `neon_config_${Date.now()}.NRP`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const importConfig = async (file: File): Promise<string | null> => {
      return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
              try {
                  const json = JSON.parse(e.target?.result as string);
                  const newPreset: AppPreset = {
                      id: crypto.randomUUID(),
                      name: file.name.replace('.NRP', '').replace('.nrp', ''),
                      createdAt: Date.now(),
                      config: json
                  };
                  setSavedPresets(prev => [...prev, newPreset]);
                  resolve(newPreset.id);
              } catch (err) {
                  console.error("Failed to parse config", err);
                  resolve(null);
              }
          };
          reader.readAsText(file);
      });
  };

  const batchImportPresets = async (files: File[]): Promise<string | null> => {
      let lastId: string | null = null;
      for (const file of files) {
          const id = await importConfig(file);
          if (id) lastId = id;
      }
      return lastId;
  };

  const playingList = (bgPlaylists.find(p => p.id === playingBgPlaylistId) || { items: [] }).items;
  const currentBgMedia = playingList[currentBgIndex] || null;
  const activePlaylist = bgPlaylists.find(p => p.id === activeBgPlaylistId);
  const activeList = activePlaylist ? activePlaylist.items : [];

  return {
    apiKey, setApiKey,
    showVisualizer, setShowVisualizer,
    showVisualizer3D, setShowVisualizer3D,
    showSineWave, setShowSineWave,
    showVisualizerTerrain, setShowVisualizerTerrain,
    showDvd, setShowDvd,
    marqueeConfig, setMarqueeConfig,
    globalWaveformConfig, setGlobalWaveformConfig, // EXPOSE GLOBAL
    visualizerConfig, setVisualizerConfig,
    reactorConfig, setReactorConfig,
    sineWaveConfig, setSineWaveConfig,
    terrainConfig, setTerrainConfig,
    dvdConfig, setDvdConfig,
    effectsConfig, setEffectsConfig,
    watermarkConfig, setWatermarkConfig,
    equalizerConfig, setEqualizerConfig,
    bgColor, setBgColor,
    bgPattern, setBgPattern,
    bgPatternConfig, setBgPatternConfig,
    screenFitMode, setScreenFitMode, 
    screenAlignment, setScreenAlignment, 
    youTubeConfig, setYouTubeConfig,
    
    bgMedia: currentBgMedia,
    bgList: activeList,
    bgPlaylists,
    activeBgPlaylistId, setActiveBgPlaylistId,
    playingBgPlaylistId, setPlayingBgPlaylistId,
    addBgPlaylist, removeBgPlaylist, renameBgPlaylist,
    
    currentBgIndex,
    bgAutoplayInterval, setBgAutoplayInterval,
    syncBgWithTrack, setSyncBgWithTrack, // NEW
    
    handleBgUpload, handleClearBg,
    removeBg, moveBg, selectBg, deselectBg,
    nextBg, prevBg,
    shuffleBgList, 
    bgCount: activeList.length,
    exportConfig, importConfig, batchImportPresets, 
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
    bgAnimation, setBgAnimation, 
    isAdvancedMode, setAdvancedMode,
    useAlbumArtAsBackground, setUseAlbumArtAsBackground,
    updateBg,
    updateBgMetadata,
    settingsExpandedState, settingsOpenSections, toggleSettingsExpand, toggleSettingsSection
  };
};