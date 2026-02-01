
import React, { useState, useRef, useEffect } from 'react';
import { Settings, HelpCircle, Power, Home } from 'lucide-react';
import { VisualizerConfig, EffectsConfig, DvdConfig, MarqueeConfig, PatternConfig, BackgroundMedia, AppPreset, CursorStyle, WatermarkConfig, ThemeType, ControlStyle, BgTransitionType, AmbienceFile, AmbienceConfig, BgAnimationType, BackgroundPlaylist, BgHotspot } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';
import { APP_VERSION } from '../../lib/version';
import { Tooltip } from '../ui/Tooltip';
import { TranslatedText } from '../ui/TranslatedText';

// Internal & Shared Components
import SettingsSection from './SettingsSection';
import HelpModal from './HelpModal';

// Section Modules
import SystemSection from './sections/SystemSection';
import BackgroundSection from './sections/BackgroundSection';
import SoundSection from './sections/SoundSection';
import WaveformSection from './sections/WaveformSection';
import ModulesSection from './sections/ModulesSection';
import GameSection from './sections/GameSection';
import PostProcessingSection from './sections/PostProcessingSection';

// Map of Main Section ID -> Array of Child Module IDs
// Used for auto-collapsing children when switching tabs or clicking modules
const SECTION_MODULES: Record<string, string[]> = {
  sys: ['files', 'presets', 'themes', 'debug'],
  bg: ['bg-settings', 'bg-resources', 'bg-colors', 'screen-share'],
  sfx: ['mixer', 'ambience', 'sysaudio'],
  waves: ['wave', 'reactor', 'sine'],
  mod: ['marquee', 'dvd', 'leaks', 'rain', 'hologram', 'gemini', 'scan', 'cyber', 'glitch'],
  game: ['tron'],
  post: ['fps', 'signal', 'chromatic', 'vignette', 'flicker']
};

interface SettingsPanelProps {
  showVisualizer: boolean;
  setShowVisualizer: (v: boolean) => void;
  showVisualizer3D?: boolean;
  setShowVisualizer3D?: (v: boolean) => void;
  showSineWave?: boolean; 
  setShowSineWave?: (v: boolean) => void;
  showDvd: boolean;
  setShowDvd: (v: boolean) => void;
  marqueeConfig: MarqueeConfig;
  setMarqueeConfig: (c: MarqueeConfig) => void;
  
  // Independent Visualizers
  visualizerConfig: VisualizerConfig;
  setVisualizerConfig: (config: VisualizerConfig) => void;
  reactorConfig?: VisualizerConfig; 
  setReactorConfig?: (config: VisualizerConfig) => void; 
  sineWaveConfig?: VisualizerConfig; 
  setSineWaveConfig?: (config: VisualizerConfig) => void; 

  dvdConfig: DvdConfig;
  setDvdConfig: (config: DvdConfig) => void;
  effectsConfig: EffectsConfig;
  setEffectsConfig: (config: EffectsConfig) => void;
  watermarkConfig?: WatermarkConfig;
  setWatermarkConfig?: (config: WatermarkConfig) => void;
  bgColor: string;
  setBgColor: (color: string) => void;
  bgPattern?: string;
  setBgPattern?: (pattern: string) => void;
  bgPatternConfig?: PatternConfig;
  setBgPatternConfig?: (config: PatternConfig) => void;
  onBgMediaUpload: (files: FileList) => void;
  onAudioUpload: (files: FileList) => void;
  onSfxUpload: (file: File) => void;
  bgMedia: { type: 'image' | 'video', url: string } | null;
  bgList: BackgroundMedia[];
  bgPlaylists: BackgroundPlaylist[]; // New
  activeBgPlaylistId: string; // New
  playingBgPlaylistId: string; // New
  setActiveBgPlaylistId: (id: string) => void; // New
  setPlayingBgPlaylistId: (id: string) => void; // New
  addBgPlaylist: () => void; // New
  removeBgPlaylist: (id: string) => void; // New
  renameBgPlaylist: (id: string, name: string) => void; // New
  currentBgIndex: number;
  onRemoveBg: (id: string) => void;
  onMoveBg: (index: number, dir: 'up' | 'down') => void;
  onSelectBg: (index: number) => void;
  onDeselectBg?: () => void;
  onClearBgMedia: () => void;
  onExportConfig: () => void;
  bgAutoplayInterval: number;
  setBgAutoplayInterval: (val: number) => void;
  onScheduleReload: () => void;
  onGoHome: () => void;
  crossfadeDuration: number;
  setCrossfadeDuration: (val: number) => void;
  smoothStart: boolean;
  setSmoothStart: (v: boolean) => void;
  
  // Presets
  savedPresets: AppPreset[];
  activePresetId: string | null;
  savePreset: (name: string) => void;
  overwritePreset: (id: string, theme: ThemeType, controlStyle: ControlStyle) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  renamePreset: (id: string, newName: string) => void;
  onResetDefault?: () => void; 

  // SFX Data
  sfxMap: Record<string, string>;
  sfxVolume: number;
  setSfxVolume: (v: number) => void;

  // Cursor
  cursorStyle: CursorStyle;
  setCursorStyle: (s: CursorStyle) => void;
  retroScreenCursorStyle: CursorStyle; 
  setRetroScreenCursorStyle: (s: CursorStyle) => void; 

  // API
  apiKey: string;
  setApiKey: (k: string) => void;

  // Transition 
  bgTransition: BgTransitionType;
  setBgTransition: (t: BgTransitionType) => void;
  
  // Animation
  bgAnimation: BgAnimationType;
  setBgAnimation: (a: BgAnimationType) => void;

  // Tutorial
  onRestartTutorial: () => void;

  // Ambience
  ambienceFiles: AmbienceFile[];
  ambienceConfig: AmbienceConfig;
  onAmbienceUpload: (files: FileList) => void;
  onAmbienceDelete: (id: string) => void;
  onAmbienceSetActive: (id: string) => void;
  onAmbienceTogglePlay: () => void;
  onAmbienceVolume: (v: number) => void;

  // Screen Capture Props
  isVideoActive: boolean;
  toggleVideo: () => void;
  isAudioActive: boolean;
  toggleAudio: () => void;
  audioSourceType?: 'system' | 'mic'; 
  setAudioSourceType?: (t: 'system' | 'mic') => void;
  audioVolume: number;
  setAudioVolume: (v: number) => void;
  isMonitoring: boolean;
  setMonitoring: (v: boolean) => void;

  // Advanced Mode
  isAdvancedMode?: boolean;
  setAdvancedMode?: (v: boolean) => void;

  // Album Art BG
  useAlbumArtAsBackground?: boolean;
  setUseAlbumArtAsBackground?: (v: boolean) => void;

  // Stream Mode
  streamMode?: 'bg' | 'window';
  setStreamMode?: (m: 'bg' | 'window') => void;

  // Shuffle BG
  shuffleBgList?: () => void; 
  
  // Update BG
  updateBg?: (id: string, newFile: File) => Promise<void>; 
  updateBgMetadata?: (id: string, hotspots: BgHotspot[]) => Promise<void>; // New Prop
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  showVisualizer, setShowVisualizer, showVisualizer3D, setShowVisualizer3D, showSineWave, setShowSineWave, showDvd, setShowDvd, marqueeConfig, setMarqueeConfig,
  visualizerConfig, setVisualizerConfig, reactorConfig, setReactorConfig, sineWaveConfig, setSineWaveConfig, dvdConfig, setDvdConfig,
  effectsConfig, setEffectsConfig, watermarkConfig, setWatermarkConfig, bgColor, setBgColor, bgPattern = 'none', setBgPattern, bgPatternConfig, setBgPatternConfig,
  onBgMediaUpload, onAudioUpload, onSfxUpload, bgMedia, bgList, bgPlaylists, activeBgPlaylistId, playingBgPlaylistId, setActiveBgPlaylistId, setPlayingBgPlaylistId, addBgPlaylist, removeBgPlaylist, renameBgPlaylist, currentBgIndex, onRemoveBg, onMoveBg, onSelectBg, onDeselectBg, onClearBgMedia, onExportConfig,
  bgAutoplayInterval, setBgAutoplayInterval, onScheduleReload, onGoHome,
  crossfadeDuration, setCrossfadeDuration, smoothStart, setSmoothStart,
  savedPresets, activePresetId, savePreset, overwritePreset, loadPreset, deletePreset, renamePreset, onResetDefault,
  sfxMap, sfxVolume, setSfxVolume,
  cursorStyle, setCursorStyle, retroScreenCursorStyle, setRetroScreenCursorStyle, apiKey, setApiKey,
  bgTransition, setBgTransition, bgAnimation, setBgAnimation,
  onRestartTutorial,
  ambienceFiles, ambienceConfig, onAmbienceUpload, onAmbienceDelete, onAmbienceSetActive, onAmbienceTogglePlay, onAmbienceVolume,
  isVideoActive, toggleVideo, isAudioActive, toggleAudio, audioSourceType, setAudioSourceType,
  isAdvancedMode, setAdvancedMode,
  useAlbumArtAsBackground = false, setUseAlbumArtAsBackground = () => {},
  streamMode, setStreamMode,
  shuffleBgList,
  updateBg = async () => {}, 
  updateBgMetadata = async () => {} 
}) => {
  // Module Expansion State
  const [expandedState, setExpandedState] = useState<Record<string, boolean>>({});
  
  // Section Expansion State (Collapsible Headers)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
      sys: true,
      bg: true,
      sfx: true,
      waves: true, 
      mod: true,
      game: true,
      post: true
  });

  const [showHelp, setShowHelp] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { currentTheme, setTheme, controlStyle, setControlStyle } = useTheme();
  const { addNotification } = useNotification();

  // Scroll Drag Logic Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const scrollTop = useRef(0);
  const startPageY = useRef(0); 
  const wasDragged = useRef(false); 

  const toggleExpand = (id: string, isAdditive: boolean, forceOpen?: boolean) => {
    if (wasDragged.current) return;
    
    setExpandedState(prev => {
        const isCurrentlyOpen = prev[id];
        let newState = { ...prev };

        if (isAdditive && forceOpen === undefined) {
            // Shift click: Toggle target, leave others alone
            newState[id] = !isCurrentlyOpen;
        } else {
            // Normal click OR Force Open: Accordion behavior within the section
            
            // 1. Identify which section this module belongs to
            let groupIds: string[] = [];
            for (const sectionKey in SECTION_MODULES) {
                if (SECTION_MODULES[sectionKey].includes(id)) {
                    groupIds = SECTION_MODULES[sectionKey];
                    break;
                }
            }

            // 2. Close all other modules in this group
            groupIds.forEach(siblingId => {
                if (siblingId !== id) {
                    newState[siblingId] = false;
                }
            });

            // 3. Toggle or Force Open the target module
            newState[id] = forceOpen !== undefined ? forceOpen : !isCurrentlyOpen;
        }
        
        return newState;
    });
  };

  const safeAction = (fn: () => void) => {
      if (!wasDragged.current) fn();
  };

  // Helper Updaters
  const updateVisualizer = (k: keyof VisualizerConfig, v: any) => setVisualizerConfig({ ...visualizerConfig, [k]: v });
  const updateReactor = (k: keyof VisualizerConfig, v: any) => {
      if (setReactorConfig && reactorConfig) {
          setReactorConfig({ ...reactorConfig, [k]: v });
      }
  };
  const updateSineWave = (k: keyof VisualizerConfig, v: any) => {
      if (setSineWaveConfig && sineWaveConfig) {
          setSineWaveConfig({ ...sineWaveConfig, [k]: v });
      }
  };
  const updateDvd = (k: keyof DvdConfig, v: any) => setDvdConfig({ ...dvdConfig, [k]: v });
  const updateEffect = (k: keyof EffectsConfig, v: any) => setEffectsConfig({ ...effectsConfig, [k]: v });
  const updateMarquee = (k: keyof MarqueeConfig, v: any) => setMarqueeConfig({ ...marqueeConfig, [k]: v });
  const updateDebugConfig = (v: EffectsConfig['debugConsole']) => updateEffect('debugConsole', v);

  const handleOverwrite = (id: string) => {
      overwritePreset(id, currentTheme, controlStyle);
      addNotification("Preset Updated", "success");
  };

  // --- SECTION SCROLL LOGIC ---
  const handleSectionToggle = (sectionId: string, isAdditive: boolean = false) => {
      if (wasDragged.current) return;

      setOpenSections(prev => {
          const isCurrentlyOpen = prev[sectionId];
          let newState: Record<string, boolean> = { ...prev };
          
          // GOAL 1: Collapse all inner panels when switching tabs (opening a new section)
          // If we are opening a section (either via additive or exclusive), reset inner state
          if (!isCurrentlyOpen) {
              setExpandedState({});
          }

          if (isAdditive) {
              newState[sectionId] = !isCurrentlyOpen;
          } else {
              // Exclusive open: close others
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

  // --- DRAG TO SCROLL HANDLERS ---
  const handleMouseDown = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('button') || target.tagName === 'SELECT') {
          return;
      }

      if (scrollContainerRef.current) {
          isDragging.current = true;
          wasDragged.current = false;
          startY.current = e.pageY - scrollContainerRef.current.offsetTop;
          scrollTop.current = scrollContainerRef.current.scrollTop;
          startPageY.current = e.pageY;
          
          window.addEventListener('mousemove', handleGlobalMouseMove);
          window.addEventListener('mouseup', handleGlobalMouseUp);
      }
  };

  const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !scrollContainerRef.current) return;
      e.preventDefault();
      
      const movedY = Math.abs(e.pageY - startPageY.current);
      if (!wasDragged.current && movedY > 5) {
          wasDragged.current = true;
          document.body.classList.add('app-dragging');
      }

      const y = e.pageY - scrollContainerRef.current.offsetTop;
      const walk = (y - startY.current); 
      scrollContainerRef.current.scrollTop = scrollTop.current - walk;
  };

  const handleGlobalMouseUp = () => {
      isDragging.current = false;
      document.body.classList.remove('app-dragging');
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
  };

  // --- HOTKEYS ---
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          const target = e.target as HTMLElement;
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
          if (e.ctrlKey || e.altKey || e.metaKey) return;

          // USE 'code' property (Digit1) instead of 'key' ('1') to distinguish from Numpad
          if (e.code === 'Digit1') handleSectionToggle('sys', false);
          if (e.code === 'Digit2') handleSectionToggle('bg', false);
          if (e.code === 'Digit3') handleSectionToggle('sfx', false);
          if (e.code === 'Digit4') handleSectionToggle('waves', false);
          if (e.code === 'Digit5') handleSectionToggle('mod', false);
          if (e.code === 'Digit6') handleSectionToggle('game', false);
          if (e.code === 'Digit7') handleSectionToggle('post', false);
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('mousemove', handleGlobalMouseMove);
          window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
  }, []);

  const themeOptions = [
    { value: 'neon-retro', label: 'Default - Neon Retro', color: '#00f3ff' },
    { value: 'neon-blue', label: 'Neon Blue', color: '#3b82f6' },
    { value: 'neon-pink', label: 'Neon Pink', color: '#ff00ff' }, 
    { value: 'warm-cozy', label: 'Warm & Cozy', color: '#fbbf24' },
    { value: 'neutral-gray', label: t('theme_neutral'), color: '#d4d4d4' },
    { value: 'neutral-ocean', label: t('theme_ocean'), color: '#4B8CA8' },
  ];

  const cursorOptions = [
    { value: 'theme-sync', label: t('style_theme_sync'), color: 'theme' }, 
    { value: 'default', label: t('cursor_default'), color: '#00f3ff' },
    { value: 'music-flow', label: t('cursor_music'), color: '#ff00ff' }, 
    { value: 'dos-terminal', label: t('cursor_dos'), color: '#00ff00' }, 
    { value: 'classic-blue', label: t('cursor_classic'), color: '#00f3ff' },
    { value: 'classic-warm', label: t('cursor_warm'), color: '#ff8c00' },
    { value: 'classic-white', label: t('cursor_white'), color: '#ffffff' },
    { value: 'classic-ocean', label: t('cursor_ocean'), color: '#4B8CA8' },
    { value: 'crosshair', label: t('cursor_crosshair'), color: '#ff3333' },
    { value: 'rounded', label: t('cursor_rounded'), color: 'theme' },
    { value: 'system', label: t('cursor_system'), color: '#ffffff' }, 
  ];

  const controlStyleOptions = [
    { value: 'default', label: t('style_default'), shape: 'square' as const },
    { value: 'round', label: t('style_round'), shape: 'rounded' as const },
    { value: 'circle', label: t('style_circle'), shape: 'circle' as const },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-theme-bg border-r-4 border-theme-panel shadow-inner overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-0 mb-4 bg-theme-bg z-40">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Settings className="animate-spin-slow text-theme-primary" size={24} />
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-mono text-theme-text leading-none">
                    <TranslatedText k="system" />
                </h2>
                <div className="flex items-center gap-1.5 opacity-60 pt-1">
                    <div className="w-1.5 h-1.5 bg-theme-accent rounded-full animate-pulse"></div>
                    <span className="text-[9px] font-mono text-theme-primary tracking-widest">{APP_VERSION}</span>
                </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Tooltip content={t('help')} position="bottom">
              <button onClick={() => setShowHelp(true)} className="text-theme-muted hover:text-theme-primary transition-colors p-1"><HelpCircle size={18} /></button>
            </Tooltip>
            <Tooltip content="HOME" position="bottom">
              <button onClick={onGoHome} className="text-theme-muted hover:text-theme-primary transition-colors p-1"><Home size={18} /></button>
            </Tooltip>
            <Tooltip content={t('reboot')} position="bottom">
              <button onClick={onScheduleReload} className="text-theme-muted hover:text-red-500 transition-colors p-1"><Power size={18} /></button>
            </Tooltip>
            <div className="w-px h-4 bg-theme-border mx-1"></div>
            <div className="relative flex items-center bg-theme-panel border border-theme-border rounded h-7 w-20 cursor-pointer overflow-hidden shadow-inner">
                <div className={`absolute top-0 bottom-0 w-1/2 bg-theme-primary rounded-sm transition-all duration-300 ease-out shadow-[0_0_10px_var(--color-primary)] opacity-90`} style={{ transform: language === 'en' ? 'translateX(2px)' : 'translateX(calc(100% + 2px))' }} />
                
                <Tooltip content="ENGLISH" position="bottom" className="flex-1 z-10 h-full">
                    <button onClick={() => setLanguage('en')} className={`w-full h-full text-[10px] font-mono font-bold text-center transition-colors duration-300 ${language === 'en' ? 'text-black' : 'text-theme-muted hover:text-theme-text'}`}>EN</button>
                </Tooltip>
                
                <Tooltip content="RUSSIAN" position="bottom" className="flex-1 z-10 h-full">
                    <button onClick={() => setLanguage('ru')} className={`w-full h-full text-[10px] font-mono font-bold text-center transition-colors duration-300 ${language === 'ru' ? 'text-black' : 'text-theme-muted hover:text-theme-text'}`}>RU</button>
                </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        className="flex-1 overflow-y-auto px-4 pb-20 no-scrollbar select-none"
      >
        <SettingsSection 
            id="sys" 
            title={<><span className="text-theme-muted opacity-50 font-normal mr-2">1 //</span> <TranslatedText k="system_params" /></>} 
            isOpen={openSections['sys']} 
            onToggle={(isAdditive) => handleSectionToggle('sys', isAdditive)}
            stickyTop="0px"
        >
            <SystemSection 
                expandedState={expandedState} toggleExpand={toggleExpand}
                onBgMediaUpload={onBgMediaUpload} onAudioUpload={onAudioUpload} onSfxUpload={onSfxUpload} onExportConfig={onExportConfig} sfxMap={sfxMap}
                savedPresets={savedPresets} activePresetId={activePresetId} savePreset={savePreset} overwritePreset={handleOverwrite} loadPreset={loadPreset} deletePreset={deletePreset} renamePreset={renamePreset} onResetDefault={onResetDefault}
                currentTheme={currentTheme} setTheme={setTheme} cursorStyle={cursorStyle} setCursorStyle={setCursorStyle} retroScreenCursorStyle={retroScreenCursorStyle} setRetroScreenCursorStyle={setRetroScreenCursorStyle} controlStyle={controlStyle} setControlStyle={setControlStyle}
                watermarkConfig={watermarkConfig} setWatermarkConfig={setWatermarkConfig}
                debugConfig={effectsConfig.debugConsole} updateDebugConfig={updateDebugConfig}
                themeOptions={themeOptions} cursorOptions={cursorOptions} controlStyleOptions={controlStyleOptions}
                isAdvancedMode={isAdvancedMode}
            />
        </SettingsSection>

        <SettingsSection 
            id="bg" 
            title={<><span className="text-theme-muted opacity-50 font-normal mr-2">2 //</span> <TranslatedText k="cat_backgrounds" /></>} 
            isOpen={openSections['bg']} 
            onToggle={(isAdditive) => handleSectionToggle('bg', isAdditive)}
            stickyTop="36px"
        >
            <BackgroundSection 
                expandedState={expandedState} toggleExpand={toggleExpand}
                bgAnimation={bgAnimation} setBgAnimation={setBgAnimation} bgTransition={bgTransition} setBgTransition={setBgTransition}
                bgMedia={bgMedia} bgList={bgList} currentBgIndex={currentBgIndex} onRemoveBg={onRemoveBg} onMoveBg={onMoveBg} onSelectBg={onSelectBg} onClearBgMedia={onClearBgMedia} shuffleBgList={shuffleBgList} onBgMediaUpload={onBgMediaUpload} onUpdateBg={updateBg} onUpdateMetadata={updateBgMetadata}
                bgAutoplayInterval={bgAutoplayInterval} setBgAutoplayInterval={setBgAutoplayInterval} useAlbumArtAsBackground={useAlbumArtAsBackground} setUseAlbumArtAsBackground={setUseAlbumArtAsBackground}
                bgColor={bgColor} setBgColor={setBgColor} bgPattern={bgPattern} setBgPattern={setBgPattern} bgPatternConfig={bgPatternConfig} setBgPatternConfig={setBgPatternConfig} onDeselectBg={onDeselectBg}
                isVideoActive={isVideoActive} toggleVideo={toggleVideo} streamMode={streamMode} setStreamMode={setStreamMode}
                bgPlaylists={bgPlaylists} activeBgPlaylistId={activeBgPlaylistId} playingBgPlaylistId={playingBgPlaylistId} setActiveBgPlaylistId={setActiveBgPlaylistId} setPlayingBgPlaylistId={setPlayingBgPlaylistId} addBgPlaylist={addBgPlaylist} removeBgPlaylist={removeBgPlaylist} renameBgPlaylist={renameBgPlaylist}
            />
        </SettingsSection>

        <SettingsSection 
            id="sfx" 
            title={<><span className="text-theme-muted opacity-50 font-normal mr-2">3 //</span> <TranslatedText k="cat_sound_effects" /></>} 
            isOpen={openSections['sfx']} 
            onToggle={(isAdditive) => handleSectionToggle('sfx', isAdditive)}
            stickyTop="72px"
        >
            <SoundSection 
                expandedState={expandedState} toggleExpand={toggleExpand}
                crossfadeDuration={crossfadeDuration} setCrossfadeDuration={setCrossfadeDuration} sfxVolume={sfxVolume} setSfxVolume={setSfxVolume} smoothStart={smoothStart} setSmoothStart={setSmoothStart}
                ambienceFiles={ambienceFiles} ambienceConfig={ambienceConfig} onAmbienceUpload={onAmbienceUpload} onAmbienceDelete={onAmbienceDelete} onAmbienceSetActive={onAmbienceSetActive} onAmbienceTogglePlay={onAmbienceTogglePlay} onAmbienceVolume={onAmbienceVolume}
                isAudioActive={isAudioActive} toggleAudio={toggleAudio} audioSourceType={audioSourceType} setAudioSourceType={setAudioSourceType}
            />
        </SettingsSection>

        <SettingsSection 
            id="waves" 
            title={<><span className="text-theme-muted opacity-50 font-normal mr-2">4 //</span> WAVEFORMS</>} 
            isOpen={openSections['waves']} 
            onToggle={(isAdditive) => handleSectionToggle('waves', isAdditive)}
            stickyTop="108px"
        >
            <WaveformSection 
                expandedState={expandedState} toggleExpand={toggleExpand} safeAction={safeAction}
                showVisualizer={showVisualizer} setShowVisualizer={setShowVisualizer} visualizerConfig={visualizerConfig} updateVisualizer={updateVisualizer}
                showVisualizer3D={showVisualizer3D} setShowVisualizer3D={setShowVisualizer3D} reactorConfig={reactorConfig} updateReactor={updateReactor}
                showSineWave={showSineWave} setShowSineWave={setShowSineWave} sineWaveConfig={sineWaveConfig} updateSineWave={updateSineWave}
            />
        </SettingsSection>

        <SettingsSection 
            id="mod" 
            title={<><span className="text-theme-muted opacity-50 font-normal mr-2">5 //</span> <TranslatedText k="modules" /></>} 
            isOpen={openSections['mod']} 
            onToggle={(isAdditive) => handleSectionToggle('mod', isAdditive)}
            stickyTop="144px"
        >
            <ModulesSection 
                expandedState={expandedState} toggleExpand={toggleExpand} safeAction={safeAction}
                marqueeConfig={marqueeConfig} updateMarquee={updateMarquee}
                showDvd={showDvd} setShowDvd={setShowDvd} dvdConfig={dvdConfig} updateDvd={updateDvd}
                effectsConfig={effectsConfig} updateEffect={updateEffect} apiKey={apiKey} setApiKey={setApiKey}
            />
        </SettingsSection>

        <SettingsSection 
            id="game" 
            title={<><span className="text-theme-muted opacity-50 font-normal mr-2">6 //</span> GAME MODULES</>} 
            isOpen={openSections['game']} 
            onToggle={(isAdditive) => handleSectionToggle('game', isAdditive)}
            stickyTop="180px"
        >
            <GameSection 
                expandedState={expandedState} toggleExpand={toggleExpand} safeAction={safeAction}
                effectsConfig={effectsConfig} updateEffect={updateEffect}
            />
        </SettingsSection>

        <SettingsSection 
            id="post" 
            title={<><span className="text-theme-muted opacity-50 font-normal mr-2">7 //</span> <TranslatedText k="cat_screen_effects" /></>} 
            isOpen={openSections['post']} 
            onToggle={(isAdditive) => handleSectionToggle('post', isAdditive)}
            stickyTop="216px"
        >
            <PostProcessingSection 
                expandedState={expandedState} toggleExpand={toggleExpand} safeAction={safeAction}
                effectsConfig={effectsConfig} updateEffect={updateEffect}
            />
        </SettingsSection>
      </div>
      
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} onRestartTutorial={onRestartTutorial} onUnlockAdvanced={(pass) => {
          if (pass === 'Meow' && setAdvancedMode) {
              setAdvancedMode(true);
              addNotification("ADVANCED MODE UNLOCKED", "success");
              return true;
          }
          return false;
      }} isAdvanced={isAdvancedMode} />}
    </div>
  );
};

export default SettingsPanel;
