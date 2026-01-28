
import React, { useState, useRef, useEffect } from 'react';
import { Settings, Disc, Activity, Zap, Terminal, AlertTriangle, Tv, Type, Bug, Power, MessageSquare, AudioWaveform, HelpCircle, Save, ChevronDown, Home, Sun, Palette, MousePointer2, Sliders, Stamp, Bot, Image as ImageIcon, Files, CloudRain, Box, RadioReceiver } from 'lucide-react';
import { VisualizerConfig, EffectsConfig, DvdConfig, MarqueeConfig, PatternConfig, BackgroundMedia, AppPreset, CursorStyle, WatermarkConfig, ThemeType, ControlStyle, BgTransitionType, AmbienceFile, AmbienceConfig } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';
import { APP_VERSION } from '../../lib/version';
import { Tooltip } from '../ui/Tooltip';
import { TranslatedText } from '../ui/TranslatedText';

// Components
import VisualizerSettings from './VisualizerSettings';
import BackgroundSettings from './BackgroundSettings';
import HelpModal from './HelpModal';
import ModuleWrapper from './ModuleWrapper';
import MarqueeSettings from './modules/MarqueeSettings';
import HologramSettings from './modules/HologramSettings';
import GeminiSettings from './modules/GeminiSettings';
import ConfigManager from './modules/ConfigManager';
import FileManagement from './modules/FileManagement';
import AmbienceSettings from './modules/AmbienceSettings'; 
import { SystemAudioModule, ScreenVideoModule } from './modules/ScreenSettings'; 
import { MixerSettings, DvdSettings, DebugSettings, ScanlineSettings, CyberSettings, GlitchSettings, SignalSettings, LightLeaksSettings } from './modules/EffectModules';
import CustomSelect from './CustomSelect';
import RangeControl from './RangeControl';

interface SettingsPanelProps {
  showVisualizer: boolean;
  setShowVisualizer: (v: boolean) => void;
  showVisualizer3D?: boolean;
  setShowVisualizer3D?: (v: boolean) => void;
  showDvd: boolean;
  setShowDvd: (v: boolean) => void;
  marqueeConfig: MarqueeConfig;
  setMarqueeConfig: (c: MarqueeConfig) => void;
  
  // Independent Visualizers
  visualizerConfig: VisualizerConfig;
  setVisualizerConfig: (config: VisualizerConfig) => void;
  reactorConfig?: VisualizerConfig; 
  setReactorConfig?: (config: VisualizerConfig) => void; 

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

  // Cursor
  cursorStyle: CursorStyle;
  setCursorStyle: (s: CursorStyle) => void;

  // API
  apiKey: string;
  setApiKey: (k: string) => void;

  // Transition 
  bgTransition: BgTransitionType;
  setBgTransition: (t: BgTransitionType) => void;

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
  audioVolume: number;
  setAudioVolume: (v: number) => void;
  isMonitoring: boolean;
  setMonitoring: (v: boolean) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  showVisualizer, setShowVisualizer, showVisualizer3D, setShowVisualizer3D, showDvd, setShowDvd, marqueeConfig, setMarqueeConfig,
  visualizerConfig, setVisualizerConfig, reactorConfig, setReactorConfig, dvdConfig, setDvdConfig,
  effectsConfig, setEffectsConfig, watermarkConfig, setWatermarkConfig, bgColor, setBgColor, bgPattern = 'none', setBgPattern, bgPatternConfig, setBgPatternConfig,
  onBgMediaUpload, onAudioUpload, onSfxUpload, bgMedia, bgList, currentBgIndex, onRemoveBg, onMoveBg, onSelectBg, onDeselectBg, onClearBgMedia, onExportConfig,
  bgAutoplayInterval, setBgAutoplayInterval, onScheduleReload, onGoHome,
  crossfadeDuration, setCrossfadeDuration,
  savedPresets, activePresetId, savePreset, overwritePreset, loadPreset, deletePreset, renamePreset, onResetDefault,
  sfxMap,
  cursorStyle, setCursorStyle, apiKey, setApiKey,
  bgTransition, setBgTransition,
  onRestartTutorial,
  ambienceFiles, ambienceConfig, onAmbienceUpload, onAmbienceDelete, onAmbienceSetActive, onAmbienceTogglePlay, onAmbienceVolume,
  isVideoActive, toggleVideo, isAudioActive, toggleAudio
}) => {
  const [expandedState, setExpandedState] = useState<Record<string, boolean>>({});
  const [expandWatermark, setExpandWatermark] = useState(false);
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

  const toggleExpand = (id: string) => {
    if (wasDragged.current) return;
    setExpandedState(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const safeAction = (fn: () => void) => {
      if (!wasDragged.current) fn();
  };

  const updateVisualizer = (k: keyof VisualizerConfig, v: any) => setVisualizerConfig({ ...visualizerConfig, [k]: v });
  const updateReactor = (k: keyof VisualizerConfig, v: any) => {
      if (setReactorConfig && reactorConfig) {
          setReactorConfig({ ...reactorConfig, [k]: v });
      }
  };
  const updateDvd = (k: keyof DvdConfig, v: any) => setDvdConfig({ ...dvdConfig, [k]: v });
  const updateEffect = (k: keyof EffectsConfig, v: any) => setEffectsConfig({ ...effectsConfig, [k]: v });
  const updateMarquee = (k: keyof MarqueeConfig, v: any) => setMarqueeConfig({ ...marqueeConfig, [k]: v });
  const updateWatermark = (k: keyof WatermarkConfig, v: any) => {
      if (setWatermarkConfig && watermarkConfig) {
          setWatermarkConfig({ ...watermarkConfig, [k]: v });
      }
  };

  const handleOverwrite = (id: string) => {
      overwritePreset(id, currentTheme, controlStyle);
      addNotification("Preset Updated", "success");
  };

  // --- DRAG TO SCROLL HANDLERS ---
  const handleMouseDown = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
          target.tagName === 'INPUT' || 
          target.tagName === 'BUTTON' || 
          target.closest('button') || 
          target.tagName === 'SELECT'
      ) {
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

  useEffect(() => {
      return () => {
          window.removeEventListener('mousemove', handleGlobalMouseMove);
          window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
  }, []);

  const themeOptions = [
    { value: 'neon-retro', label: 'Default - Neon Retro', color: '#00f3ff' },
    { value: 'neon-blue', label: 'Neon Blue', color: '#3b82f6' },
    { value: 'warm-cozy', label: 'Warm & Cozy', color: '#fbbf24' },
    { value: 'neutral-gray', label: t('theme_neutral'), color: '#d4d4d4' },
    { value: 'neutral-ocean', label: t('theme_ocean'), color: '#4B8CA8' },
  ];

  const cursorOptions = [
    { value: 'theme-sync', label: t('style_theme_sync'), color: 'theme' }, 
    { value: 'default', label: t('cursor_default'), color: '#00f3ff' },
    { value: 'dos-terminal', label: t('cursor_dos'), color: '#00ff00' }, 
    { value: 'classic-blue', label: t('cursor_classic'), color: '#00f3ff' },
    { value: 'classic-warm', label: t('cursor_warm'), color: '#ff8c00' },
    { value: 'classic-white', label: t('cursor_white'), color: '#ffffff' },
    { value: 'classic-ocean', label: t('cursor_ocean'), color: '#4B8CA8' },
    { value: 'system', label: t('cursor_system'), color: '#ffffff' }, 
  ];

  const controlStyleOptions = [
    { value: 'default', label: t('style_default'), shape: 'square' as const },
    { value: 'round', label: t('style_round'), shape: 'rounded' as const },
    { value: 'circle', label: t('style_circle'), shape: 'circle' as const },
  ];

  const innerWrapperRadius = controlStyle === 'round' || controlStyle === 'circle' ? 'rounded-lg' : 'rounded';

  const NumberedLabel = ({ num, k }: { num: string, k: any }) => (
      <span className="flex items-center gap-2">
          <span className="text-theme-muted opacity-50 font-normal">{num} //</span>
          <TranslatedText k={k} />
      </span>
  );

  return (
    <div className="w-full h-full flex flex-col bg-theme-bg border-r-4 border-theme-panel shadow-inner overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-0 mb-4 bg-theme-bg z-10">
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
                <button onClick={() => setLanguage('en')} className={`z-10 flex-1 text-[10px] font-mono font-bold text-center transition-colors duration-300 ${language === 'en' ? 'text-black' : 'text-theme-muted hover:text-theme-text'}`}>EN</button>
                <button onClick={() => setLanguage('ru')} className={`z-10 flex-1 text-[10px] font-mono font-bold text-center transition-colors duration-300 ${language === 'ru' ? 'text-black' : 'text-theme-muted hover:text-theme-text'}`}>RU</button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area with Drag Scroll */}
      <div 
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        className="flex-1 overflow-y-auto px-4 pb-20 space-y-3 no-scrollbar select-none"
      >
        <h3 className="text-xs font-mono text-theme-text mb-2 opacity-80 sticky top-0 bg-theme-bg pb-2 z-10 border-b border-theme-primary pointer-events-none">
            <TranslatedText k="system_params" />
        </h3>

        {/* FILES, PRESETS, THEMES (Existing) */}
        <ModuleWrapper id="files" label={<TranslatedText k="file_management" />} icon={Files} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['files']} onToggleExpand={() => toggleExpand('files')} onToggleEnable={() => {}}>
            <FileManagement onBgMediaUpload={onBgMediaUpload} onAudioUpload={onAudioUpload} onSfxUpload={onSfxUpload} onExportConfig={onExportConfig} sfxMap={sfxMap} />
        </ModuleWrapper>

        <ModuleWrapper id="presets" label={<TranslatedText k="config_manager" />} icon={Save} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['presets']} onToggleExpand={() => toggleExpand('presets')} onToggleEnable={() => {}}>
            <ConfigManager presets={savedPresets} activePresetId={activePresetId} onSave={savePreset} onOverwrite={handleOverwrite} onLoad={loadPreset} onDelete={deletePreset} onRename={renamePreset} onResetDefault={onResetDefault} />
        </ModuleWrapper>

        <ModuleWrapper id="themes" label={<TranslatedText k="color_schemes" />} icon={Palette} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['themes']} onToggleExpand={() => toggleExpand('themes')} onToggleEnable={() => {}}>
            <div className="pt-2">
                <CustomSelect label={<TranslatedText k="theme_select" />} value={currentTheme} options={themeOptions} onChange={(v) => setTheme(v as ThemeType)} />
                <div className="pt-2 border-t border-theme-border mt-2 space-y-4">
                    <div className="flex items-center gap-2 mb-2"><MousePointer2 size={12} className="text-theme-muted" /><span className="text-[10px] font-mono text-theme-muted tracking-widest uppercase"><TranslatedText k="cursor_style" /></span></div>
                    <CustomSelect label={<TranslatedText k="cursor_style" />} value={cursorStyle} options={cursorOptions} onChange={(v) => setCursorStyle(v as CursorStyle)} />
                    <div className="flex items-center gap-2 mb-2"><Sliders size={12} className="text-theme-muted" /><span className="text-[10px] font-mono text-theme-muted tracking-widest uppercase"><TranslatedText k="control_style" /></span></div>
                    <CustomSelect label={<TranslatedText k="control_style" />} value={controlStyle} options={controlStyleOptions} onChange={(v) => setControlStyle(v as ControlStyle)} />
                    {watermarkConfig && (
                        <div className={`mt-4 bg-theme-panel/40 border border-theme-border ${innerWrapperRadius} overflow-hidden hover:border-theme-primary transition-colors`}>
                            <div className="flex items-center justify-between p-3 cursor-pointer border-b border-theme-primary" onClick={() => setExpandWatermark(!expandWatermark)}>
                                <div className="flex items-center gap-3"><div className="text-theme-muted opacity-80"><Stamp size={16} /></div><span className="font-mono text-[11px] tracking-widest text-theme-muted uppercase"><TranslatedText k="watermark_settings" /></span></div>
                                <ChevronDown size={14} className={`text-theme-primary opacity-70 transition-transform ${expandWatermark ? 'rotate-180' : ''}`} />
                            </div>
                            <div className={`grid transition-[grid-template-rows,padding,opacity] duration-300 ease-in-out ${expandWatermark ? 'grid-rows-[1fr] opacity-100 p-3 pt-2' : 'grid-rows-[0fr] opacity-0 p-0'}`}>
                                <div className="overflow-hidden"><div className="pl-4 space-y-3 border-l-2 border-theme-primary ml-2">
                                    <RangeControl label={<TranslatedText k="scale" />} value={watermarkConfig.scale} min={0.5} max={2.0} step={0.1} onChange={(v) => updateWatermark('scale', v)} className="mb-0" />
                                    <RangeControl label={<TranslatedText k="opacity" />} value={watermarkConfig.opacity} min={0} max={1.0} step={0.1} onChange={(v) => updateWatermark('opacity', v)} className="mb-0" />
                                    <RangeControl label={<TranslatedText k="flash_intensity" />} value={watermarkConfig.flashIntensity} min={0} max={1.0} step={0.1} onChange={(v) => updateWatermark('flashIntensity', v)} className="mb-0" />
                                </div></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ModuleWrapper>

        <ModuleWrapper id="debug" label={<TranslatedText k="debug_console" />} icon={Bug} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['debug']} onToggleExpand={() => toggleExpand('debug')} onToggleEnable={() => {}}>
            <DebugSettings config={effectsConfig.debugConsole} update={(v) => updateEffect('debugConsole', v)} />
        </ModuleWrapper>

        {/* BACKGROUNDS + SCREEN VIDEO */}
        <h3 className="text-xs font-mono text-theme-text mb-2 opacity-80 sticky top-0 bg-theme-bg pb-2 z-10 border-b border-theme-primary mt-6 pointer-events-none">
            <TranslatedText k="cat_backgrounds" />
        </h3>

        <ModuleWrapper id="bg" label={<TranslatedText k="background" />} icon={ImageIcon} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['bg']} onToggleExpand={() => toggleExpand('bg')} onToggleEnable={() => {}}>
            <BackgroundSettings bgColor={bgColor} setBgColor={setBgColor} bgPattern={bgPattern} setBgPattern={setBgPattern} bgPatternConfig={bgPatternConfig} setBgPatternConfig={setBgPatternConfig} bgMedia={bgMedia} bgList={bgList} currentBgIndex={currentBgIndex} onRemoveBg={onRemoveBg} onMoveBg={onMoveBg} onSelectBg={onSelectBg} onDeselectBg={onDeselectBg} onClearBgMedia={onClearBgMedia} bgAutoplayInterval={bgAutoplayInterval} setBgAutoplayInterval={setBgAutoplayInterval} bgTransition={bgTransition} setBgTransition={setBgTransition} />
            <div className="mt-4 pt-4 border-t border-theme-border">
                <label className="text-theme-text font-mono text-[10px] block mb-2 tracking-widest uppercase opacity-70">SCREEN SHARE</label>
                <ScreenVideoModule isVideoActive={isVideoActive} toggleVideo={toggleVideo} />
            </div>
        </ModuleWrapper>

        {/* SOUND EFFECTS + SYSTEM AUDIO */}
        <h3 className="text-xs font-mono text-theme-text mb-2 opacity-80 sticky top-0 bg-theme-bg pb-2 z-10 border-b border-theme-primary mt-6 pointer-events-none">
            <TranslatedText k="cat_sound_effects" />
        </h3>

        <ModuleWrapper id="mixer" label={<TranslatedText k="mixer_deck" />} icon={AudioWaveform} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['mixer']} onToggleExpand={() => toggleExpand('mixer')} onToggleEnable={() => {}}>
            <MixerSettings crossfadeDuration={crossfadeDuration} setCrossfadeDuration={setCrossfadeDuration} />
        </ModuleWrapper>

        <ModuleWrapper id="ambience" label={<TranslatedText k="ambience" />} icon={CloudRain} isEnabled={true} isExpanded={expandedState['ambience']} onToggleExpand={() => toggleExpand('ambience')} isAlwaysOn={true} onToggleEnable={() => {}}>
            <AmbienceSettings files={ambienceFiles} config={ambienceConfig} onUpload={onAmbienceUpload} onDelete={onAmbienceDelete} onSetActive={onAmbienceSetActive} onTogglePlay={onAmbienceTogglePlay} onVolumeChange={onAmbienceVolume} />
        </ModuleWrapper>

        <ModuleWrapper id="sysaudio" label={<TranslatedText k="sys_audio_input" />} icon={RadioReceiver} isEnabled={true} isExpanded={expandedState['sysaudio']} isAlwaysOn={true} onToggleExpand={() => toggleExpand('sysaudio')} onToggleEnable={() => {}}>
            <SystemAudioModule 
                isAudioActive={isAudioActive} 
                toggleAudio={toggleAudio} 
            />
        </ModuleWrapper>

        {/* Modules Header */}
        <h3 className="text-xs font-mono text-theme-text mb-2 opacity-80 sticky top-0 bg-theme-bg pb-2 z-10 border-b border-theme-primary mt-6 pointer-events-none">
            <TranslatedText k="modules" />
        </h3>
        
        <div id="tutorial-modules" className="space-y-3">
            <ModuleWrapper id="wave" label={<NumberedLabel num="01" k="waveform" />} icon={Activity} isEnabled={showVisualizer} isExpanded={expandedState['wave']} onToggleExpand={() => toggleExpand('wave')} onToggleEnable={() => safeAction(() => setShowVisualizer(!showVisualizer))}>
                <VisualizerSettings config={visualizerConfig} update={updateVisualizer} mode="waveform" />
            </ModuleWrapper>
            <ModuleWrapper id="marquee" label={<NumberedLabel num="02" k="top_marquee" />} icon={Type} isEnabled={marqueeConfig.enabled} isExpanded={expandedState['marquee']} onToggleExpand={() => toggleExpand('marquee')} onToggleEnable={() => safeAction(() => updateMarquee('enabled', !marqueeConfig.enabled))}>
                <MarqueeSettings config={marqueeConfig} update={updateMarquee} />
            </ModuleWrapper>
            <ModuleWrapper id="dvd" label={<NumberedLabel num="03" k="dvd_saver" />} icon={Disc} isEnabled={showDvd} isExpanded={expandedState['dvd']} onToggleExpand={() => toggleExpand('dvd')} onToggleEnable={() => safeAction(() => setShowDvd(!showDvd))}>
                <DvdSettings config={dvdConfig} update={updateDvd} />
            </ModuleWrapper>
            <ModuleWrapper id="leaks" label={<NumberedLabel num="04" k="light_leaks" />} icon={Sun} isEnabled={effectsConfig.lightLeaks.enabled} isExpanded={expandedState['leaks']} onToggleExpand={() => toggleExpand('leaks')} onToggleEnable={() => safeAction(() => updateEffect('lightLeaks', { ...effectsConfig.lightLeaks, enabled: !effectsConfig.lightLeaks.enabled }))}>
                <LightLeaksSettings config={effectsConfig.lightLeaks} update={(v) => updateEffect('lightLeaks', v)} />
            </ModuleWrapper>
            <ModuleWrapper id="hologram" label={<NumberedLabel num="05" k="holograms" />} icon={MessageSquare} isEnabled={effectsConfig.holograms.enabled} isExpanded={expandedState['hologram']} onToggleExpand={() => toggleExpand('hologram')} onToggleEnable={() => safeAction(() => updateEffect('holograms', { ...effectsConfig.holograms, enabled: !effectsConfig.holograms.enabled }))}>
                <HologramSettings config={effectsConfig.holograms} update={(v) => updateEffect('holograms', v)} />
            </ModuleWrapper>
            <ModuleWrapper id="gemini" label={<NumberedLabel num="06" k="gemini_chat" />} icon={Bot} isEnabled={effectsConfig.geminiChat.enabled} isExpanded={expandedState['gemini']} onToggleExpand={() => toggleExpand('gemini')} onToggleEnable={() => safeAction(() => updateEffect('geminiChat', { ...effectsConfig.geminiChat, enabled: !effectsConfig.geminiChat.enabled }))}>
                <GeminiSettings config={effectsConfig.geminiChat} update={(v) => updateEffect('geminiChat', v)} apiKey={apiKey} setApiKey={setApiKey} />
            </ModuleWrapper>
            <ModuleWrapper id="scan" label={<NumberedLabel num="07" k="scanlines" />} icon={Tv} isEnabled={effectsConfig.scanlineEnabled} isExpanded={expandedState['scan']} onToggleExpand={() => toggleExpand('scan')} onToggleEnable={() => safeAction(() => updateEffect('scanlineEnabled', !effectsConfig.scanlineEnabled))}>
                <ScanlineSettings config={effectsConfig} update={updateEffect} />
            </ModuleWrapper>
            <ModuleWrapper id="cyber" label={<NumberedLabel num="08" k="cyber_hack" />} icon={Terminal} isEnabled={effectsConfig.cyberHack.enabled} isExpanded={expandedState['cyber']} onToggleExpand={() => toggleExpand('cyber')} onToggleEnable={() => safeAction(() => updateEffect('cyberHack', { ...effectsConfig.cyberHack, enabled: !effectsConfig.cyberHack.enabled }))}>
                <CyberSettings config={effectsConfig.cyberHack} update={(v) => updateEffect('cyberHack', v)} />
            </ModuleWrapper>
            <ModuleWrapper id="glitch" label={<NumberedLabel num="09" k="digital_glitch" />} icon={AlertTriangle} isEnabled={effectsConfig.glitch.enabled} isExpanded={expandedState['glitch']} onToggleExpand={() => toggleExpand('glitch')} onToggleEnable={() => safeAction(() => updateEffect('glitch', { ...effectsConfig.glitch, enabled: !effectsConfig.glitch.enabled }))}>
                <GlitchSettings config={effectsConfig.glitch} update={(v) => updateEffect('glitch', v)} />
            </ModuleWrapper>
            {setShowVisualizer3D && reactorConfig && (
            <ModuleWrapper id="reactor" label={<span className="flex items-center gap-2"><span className="text-theme-muted opacity-50 font-normal">10 //</span> 3D REACTOR</span>} icon={Box} isEnabled={showVisualizer3D || false} isExpanded={expandedState['reactor']} onToggleExpand={() => toggleExpand('reactor')} onToggleEnable={() => safeAction(() => setShowVisualizer3D(!showVisualizer3D))}>
                <VisualizerSettings config={reactorConfig} update={updateReactor} mode="reactor" />
            </ModuleWrapper>
            )}
            <ModuleWrapper id="signal" label={<NumberedLabel num="11" k="signal_processor" />} icon={Zap} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['signal']} onToggleExpand={() => toggleExpand('signal')} onToggleEnable={() => {}}>
                <SignalSettings config={effectsConfig} update={updateEffect} />
            </ModuleWrapper>
        </div>
      </div>
      
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} onRestartTutorial={onRestartTutorial} />}
    </div>
  );
};

export default SettingsPanel;
