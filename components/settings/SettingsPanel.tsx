import React, { useState } from 'react';
import { Settings, Disc, Activity, Zap, Terminal, AlertTriangle, Tv, Type, Bug, Power, MessageSquare, AudioWaveform, HelpCircle, Save, ChevronUp, ChevronDown, Home, Sun, Palette, MousePointer2, Sliders, Stamp, Bot } from 'lucide-react';
import { VisualizerConfig, EffectsConfig, DvdConfig, MarqueeConfig, PatternConfig, BackgroundMedia, AppPreset, CursorStyle, WatermarkConfig, ThemeType, ControlStyle } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
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
import { MixerSettings, DvdSettings, DebugSettings, ScanlineSettings, CyberSettings, GlitchSettings, SignalSettings, LightLeaksSettings } from './modules/EffectModules';
import CustomSelect from './CustomSelect';
import RangeControl from './RangeControl';

interface SettingsPanelProps {
  showVisualizer: boolean;
  setShowVisualizer: (v: boolean) => void;
  showDvd: boolean;
  setShowDvd: (v: boolean) => void;
  marqueeConfig: MarqueeConfig;
  setMarqueeConfig: (c: MarqueeConfig) => void;
  visualizerConfig: VisualizerConfig;
  setVisualizerConfig: (config: VisualizerConfig) => void;
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
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  renamePreset: (id: string, newName: string) => void;

  // SFX Data
  sfxMap: Record<string, string>;

  // Cursor
  cursorStyle: CursorStyle;
  setCursorStyle: (s: CursorStyle) => void;

  // API
  apiKey: string;
  setApiKey: (k: string) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  showVisualizer, setShowVisualizer, showDvd, setShowDvd, marqueeConfig, setMarqueeConfig,
  visualizerConfig, setVisualizerConfig, dvdConfig, setDvdConfig,
  effectsConfig, setEffectsConfig, watermarkConfig, setWatermarkConfig, bgColor, setBgColor, bgPattern = 'none', setBgPattern, bgPatternConfig, setBgPatternConfig,
  onBgMediaUpload, onAudioUpload, onSfxUpload, bgMedia, bgList, currentBgIndex, onRemoveBg, onMoveBg, onSelectBg, onDeselectBg, onClearBgMedia, onExportConfig,
  bgAutoplayInterval, setBgAutoplayInterval, onScheduleReload, onGoHome,
  crossfadeDuration, setCrossfadeDuration,
  savedPresets, savePreset, loadPreset, deletePreset, renamePreset,
  sfxMap,
  cursorStyle, setCursorStyle, apiKey, setApiKey
}) => {
  const [expandedState, setExpandedState] = useState<Record<string, boolean>>({ mixer: true });
  const [expandWatermark, setExpandWatermark] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { currentTheme, setTheme, controlStyle, setControlStyle } = useTheme();

  const toggleExpand = (id: string) => {
    setExpandedState(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const updateVisualizer = (k: keyof VisualizerConfig, v: any) => setVisualizerConfig({ ...visualizerConfig, [k]: v });
  const updateDvd = (k: keyof DvdConfig, v: any) => setDvdConfig({ ...dvdConfig, [k]: v });
  const updateEffect = (k: keyof EffectsConfig, v: any) => setEffectsConfig({ ...effectsConfig, [k]: v });
  const updateMarquee = (k: keyof MarqueeConfig, v: any) => setMarqueeConfig({ ...marqueeConfig, [k]: v });
  const updateWatermark = (k: keyof WatermarkConfig, v: any) => {
      if (setWatermarkConfig && watermarkConfig) {
          setWatermarkConfig({ ...watermarkConfig, [k]: v });
      }
  };

  const themeOptions = [
    { value: 'neon-retro', label: 'Default - Neon Retro' },
    { value: 'neon-blue', label: 'Neon Blue' },
    { value: 'warm-cozy', label: 'Warm & Cozy' },
    { value: 'neutral-gray', label: t('theme_neutral') },
    { value: 'neutral-ocean', label: t('theme_ocean') },
  ];

  const cursorOptions = [
    { value: 'default', label: t('cursor_default') },
    { value: 'classic-blue', label: t('cursor_classic') },
    { value: 'classic-warm', label: t('cursor_warm') },
    { value: 'classic-white', label: t('cursor_white') },
    { value: 'classic-ocean', label: t('cursor_ocean') },
  ];

  const controlStyleOptions = [
    { value: 'default', label: t('style_default') },
    { value: 'round', label: t('style_round') },
    { value: 'circle', label: t('style_circle') },
  ];

  // Dynamic Radius for internal groups
  const innerWrapperRadius = controlStyle === 'round' || controlStyle === 'circle' ? 'rounded-lg' : 'rounded';

  return (
    <div className="w-full h-full flex flex-col bg-theme-bg border-r-4 border-theme-panel shadow-inner overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-0 border-b border-theme-border mb-4 bg-theme-bg z-10">
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
            <Tooltip content="HOME" position="bottom">
              <button 
                onClick={onGoHome}
                className="text-theme-muted hover:text-theme-primary transition-colors p-1"
              >
                <Home size={18} />
              </button>
            </Tooltip>

            <Tooltip content={<TranslatedText k="help" />} position="bottom">
              <button 
                onClick={() => setShowHelp(true)}
                className="text-theme-muted hover:text-theme-primary transition-colors p-1"
              >
                <HelpCircle size={18} />
              </button>
            </Tooltip>
            
            <Tooltip content={<TranslatedText k="reboot" />} position="bottom">
              <button 
                onClick={onScheduleReload}
                className="text-theme-muted hover:text-red-500 transition-colors p-1"
              >
                <Power size={18} />
              </button>
            </Tooltip>

            <div className="w-px h-4 bg-theme-border mx-1"></div>
            
            {/* Sliding Language Toggle */}
            <div className="relative flex items-center bg-theme-panel border border-theme-border rounded h-7 w-20 cursor-pointer overflow-hidden shadow-inner">
                {/* The Sliding Pill */}
                <div 
                    className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-theme-primary rounded-sm transition-all duration-300 ease-out shadow-[0_0_10px_var(--color-primary)] opacity-90`}
                    style={{
                        transform: language === 'en' ? 'translateX(2px)' : 'translateX(calc(100% + 2px))'
                    }}
                />
                
                {/* EN Button */}
                <button 
                    onClick={() => setLanguage('en')}
                    className={`z-10 flex-1 text-[10px] font-mono font-bold text-center transition-colors duration-300 ${language === 'en' ? 'text-black' : 'text-theme-muted hover:text-theme-text'}`}
                >
                    EN
                </button>
                
                {/* RU Button */}
                <button 
                    onClick={() => setLanguage('ru')}
                    className={`z-10 flex-1 text-[10px] font-mono font-bold text-center transition-colors duration-300 ${language === 'ru' ? 'text-black' : 'text-theme-muted hover:text-theme-text'}`}
                >
                    RU
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 custom-scrollbar pb-4 space-y-3">
        {/* System Parameters Header */}
        <h3 className="text-xs font-mono text-theme-text mb-2 opacity-80 sticky top-0 bg-theme-bg pb-2 z-10 border-b border-theme-border">
            <TranslatedText k="system_params" />
        </h3>

        {/* Color Schemes & Styles Module */}
        <ModuleWrapper id="themes" label={<TranslatedText k="color_schemes" />} icon={Palette} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['themes']} onToggleExpand={() => toggleExpand('themes')} onToggleEnable={() => {}}>
            <div className="pt-2">
                <CustomSelect 
                    label={<TranslatedText k="theme_select" />}
                    value={currentTheme}
                    options={themeOptions}
                    onChange={(v) => setTheme(v as ThemeType)}
                />
                
                <div className="pt-2 border-t border-theme-border mt-2 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <MousePointer2 size={12} className="text-theme-muted" />
                        <span className="text-[10px] font-mono text-theme-muted tracking-widest uppercase">
                            <TranslatedText k="cursor_style" />
                        </span>
                    </div>
                    <CustomSelect 
                        label={<TranslatedText k="cursor_style" />}
                        value={cursorStyle}
                        options={cursorOptions}
                        onChange={(v) => setCursorStyle(v as CursorStyle)}
                    />

                    <div className="flex items-center gap-2 mb-2">
                        <Sliders size={12} className="text-theme-muted" />
                        <span className="text-[10px] font-mono text-theme-muted tracking-widest uppercase">
                            <TranslatedText k="control_style" />
                        </span>
                    </div>
                    <CustomSelect 
                        label={<TranslatedText k="control_style" />}
                        value={controlStyle}
                        options={controlStyleOptions}
                        onChange={(v) => setControlStyle(v as ControlStyle)}
                    />

                    {/* WATERMARK SETTINGS - Collapsible Group */}
                    {watermarkConfig && (
                        <div className={`mt-4 bg-theme-panel/40 border border-theme-border ${innerWrapperRadius} overflow-hidden hover:border-theme-muted transition-colors`}>
                             <div 
                                className="flex items-center justify-between p-3 cursor-pointer"
                                onClick={() => setExpandWatermark(!expandWatermark)}
                             >
                                <div className="flex items-center gap-3">
                                    <div className="text-theme-muted opacity-80">
                                        <Stamp size={16} />
                                    </div>
                                    <span className="font-mono text-[11px] tracking-widest text-theme-muted uppercase">
                                        <TranslatedText k="watermark_settings" />
                                    </span>
                                </div>
                                <ChevronDown size={14} className={`text-theme-primary opacity-70 transition-transform ${expandWatermark ? 'rotate-180' : ''}`} />
                             </div>
                             
                             <div className={`transition-[max-height,opacity,padding] duration-300 ease-in-out overflow-hidden ${expandWatermark ? 'max-h-60 opacity-100 p-3 pt-0' : 'max-h-0 opacity-0 p-0'}`}>
                                <div className="pl-4 pt-2 space-y-3 border-l-2 border-theme-muted ml-2">
                                    <RangeControl label={<TranslatedText k="scale" />} value={watermarkConfig.scale} min={0.5} max={2.0} step={0.1} onChange={(v) => updateWatermark('scale', v)} className="mb-0" />
                                    <RangeControl label={<TranslatedText k="opacity" />} value={watermarkConfig.opacity} min={0} max={1.0} step={0.1} onChange={(v) => updateWatermark('opacity', v)} className="mb-0" />
                                    <RangeControl label={<TranslatedText k="flash_intensity" />} value={watermarkConfig.flashIntensity} min={0} max={1.0} step={0.1} onChange={(v) => updateWatermark('flashIntensity', v)} className="mb-0" />
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </ModuleWrapper>

        {/* Modules Header */}
        <h3 className="text-xs font-mono text-theme-text mb-2 opacity-80 sticky top-0 bg-theme-bg pb-2 z-10 border-b border-theme-border mt-6">
            <TranslatedText k="modules" />
        </h3>
        
        {/* MIXER */}
        <ModuleWrapper id="mixer" label={<TranslatedText k="mixer_deck" />} icon={AudioWaveform} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['mixer']} onToggleExpand={() => toggleExpand('mixer')} onToggleEnable={() => {}}>
            <MixerSettings crossfadeDuration={crossfadeDuration} setCrossfadeDuration={setCrossfadeDuration} />
        </ModuleWrapper>

        {/* WAVEFORM */}
        <ModuleWrapper id="wave" label={<TranslatedText k="waveform" />} icon={Activity} isEnabled={showVisualizer} isExpanded={expandedState['wave']} onToggleExpand={() => toggleExpand('wave')} onToggleEnable={() => setShowVisualizer(!showVisualizer)}>
            <VisualizerSettings config={visualizerConfig} update={updateVisualizer} />
        </ModuleWrapper>

        {/* MARQUEE */}
        <ModuleWrapper id="marquee" label={<TranslatedText k="top_marquee" />} icon={Type} isEnabled={marqueeConfig.enabled} isExpanded={expandedState['marquee']} onToggleExpand={() => toggleExpand('marquee')} onToggleEnable={() => updateMarquee('enabled', !marqueeConfig.enabled)}>
            <MarqueeSettings config={marqueeConfig} update={updateMarquee} />
        </ModuleWrapper>

        {/* DVD */}
        <ModuleWrapper id="dvd" label={<TranslatedText k="dvd_saver" />} icon={Disc} isEnabled={showDvd} isExpanded={expandedState['dvd']} onToggleExpand={() => toggleExpand('dvd')} onToggleEnable={() => setShowDvd(!showDvd)}>
            <DvdSettings config={dvdConfig} update={updateDvd} />
        </ModuleWrapper>

        {/* LIGHT LEAKS */}
        <ModuleWrapper id="leaks" label={<TranslatedText k="light_leaks" />} icon={Sun} isEnabled={effectsConfig.lightLeaks.enabled} isExpanded={expandedState['leaks']} onToggleExpand={() => toggleExpand('leaks')} onToggleEnable={() => updateEffect('lightLeaks', { ...effectsConfig.lightLeaks, enabled: !effectsConfig.lightLeaks.enabled })}>
            <LightLeaksSettings config={effectsConfig.lightLeaks} update={(v) => updateEffect('lightLeaks', v)} />
        </ModuleWrapper>

        {/* HOLOGRAMS */}
        <ModuleWrapper id="hologram" label={<TranslatedText k="holograms" />} icon={MessageSquare} isEnabled={effectsConfig.holograms.enabled} isExpanded={expandedState['hologram']} onToggleExpand={() => toggleExpand('hologram')} onToggleEnable={() => updateEffect('holograms', { ...effectsConfig.holograms, enabled: !effectsConfig.holograms.enabled })}>
            <HologramSettings config={effectsConfig.holograms} update={(v) => updateEffect('holograms', v)} />
        </ModuleWrapper>

        {/* GEMINI CHAT */}
        <ModuleWrapper id="gemini" label={<TranslatedText k="gemini_chat" />} icon={Bot} isEnabled={effectsConfig.geminiChat.enabled} isExpanded={expandedState['gemini']} onToggleExpand={() => toggleExpand('gemini')} onToggleEnable={() => updateEffect('geminiChat', { ...effectsConfig.geminiChat, enabled: !effectsConfig.geminiChat.enabled })}>
            <GeminiSettings 
                config={effectsConfig.geminiChat} 
                update={(v) => updateEffect('geminiChat', v)} 
                apiKey={apiKey}
                setApiKey={setApiKey}
            />
        </ModuleWrapper>

        {/* DEBUG CONSOLE */}
        <ModuleWrapper id="debug" label={<TranslatedText k="debug_console" />} icon={Bug} isEnabled={effectsConfig.debugConsole.enabled} isExpanded={expandedState['debug']} onToggleExpand={() => toggleExpand('debug')} onToggleEnable={() => updateEffect('debugConsole', { ...effectsConfig.debugConsole, enabled: !effectsConfig.debugConsole.enabled })}>
            <DebugSettings config={effectsConfig.debugConsole} update={(v) => updateEffect('debugConsole', v)} />
        </ModuleWrapper>

        {/* SCANLINES */}
        <ModuleWrapper id="scan" label={<TranslatedText k="scanlines" />} icon={Tv} isEnabled={effectsConfig.scanlineEnabled} isExpanded={expandedState['scan']} onToggleExpand={() => toggleExpand('scan')} onToggleEnable={() => updateEffect('scanlineEnabled', !effectsConfig.scanlineEnabled)}>
            <ScanlineSettings config={effectsConfig} update={updateEffect} />
        </ModuleWrapper>

        {/* CYBER HACK */}
        <ModuleWrapper id="cyber" label={<TranslatedText k="cyber_hack" />} icon={Terminal} isEnabled={effectsConfig.cyberHack.enabled} isExpanded={expandedState['cyber']} onToggleExpand={() => toggleExpand('cyber')} onToggleEnable={() => updateEffect('cyberHack', { ...effectsConfig.cyberHack, enabled: !effectsConfig.cyberHack.enabled })}>
            <CyberSettings config={effectsConfig.cyberHack} update={(v) => updateEffect('cyberHack', v)} />
        </ModuleWrapper>

        {/* GLITCH */}
        <ModuleWrapper id="glitch" label={<TranslatedText k="digital_glitch" />} icon={AlertTriangle} isEnabled={effectsConfig.glitch.enabled} isExpanded={expandedState['glitch']} onToggleExpand={() => toggleExpand('glitch')} onToggleEnable={() => updateEffect('glitch', { ...effectsConfig.glitch, enabled: !effectsConfig.glitch.enabled })}>
            <GlitchSettings config={effectsConfig.glitch} update={(v) => updateEffect('glitch', v)} />
        </ModuleWrapper>

        {/* SIGNAL (Always On) */}
        <ModuleWrapper id="signal" label={<TranslatedText k="signal_processor" />} icon={Zap} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['signal']} onToggleExpand={() => toggleExpand('signal')} onToggleEnable={() => {}}>
            <SignalSettings config={effectsConfig} update={updateEffect} />
        </ModuleWrapper>
      </div>

      {/* Config Presets Panel */}
      <div className="bg-theme-bg border-t border-theme-border shrink-0 z-20">
        <button 
          onClick={() => setShowPresets(!showPresets)}
          className="w-full flex items-center justify-between p-3 text-xs font-mono text-theme-muted hover:text-theme-text hover:bg-theme-panel transition-colors"
        >
          <div className="flex items-center gap-2">
            <Save size={14} className="text-theme-secondary" />
            <span className="font-bold tracking-widest uppercase">
                <TranslatedText k="config_manager" />
            </span>
          </div>
          <ChevronUp size={14} className={`transition-transform duration-300 ${showPresets ? 'rotate-180' : ''}`} />
        </button>
        
        <div className={`transition-all duration-300 ease-in-out overflow-hidden bg-theme-panel/30 ${showPresets ? 'max-h-[300px] border-b border-theme-border' : 'max-h-0'}`}>
          <div className="p-4">
             <ConfigManager 
                presets={savedPresets}
                onSave={savePreset}
                onLoad={loadPreset}
                onDelete={deletePreset}
                onRename={renamePreset}
            />
          </div>
        </div>
      </div>

      <BackgroundSettings 
        bgColor={bgColor} setBgColor={setBgColor}
        bgPattern={bgPattern} setBgPattern={setBgPattern}
        bgPatternConfig={bgPatternConfig} setBgPatternConfig={setBgPatternConfig}
        onBgMediaUpload={onBgMediaUpload} onAudioUpload={onAudioUpload}
        onSfxUpload={onSfxUpload}
        bgMedia={bgMedia} bgList={bgList} currentBgIndex={currentBgIndex}
        onRemoveBg={onRemoveBg} onMoveBg={onMoveBg} onSelectBg={onSelectBg} onDeselectBg={onDeselectBg}
        onClearBgMedia={onClearBgMedia} onExportConfig={onExportConfig}
        bgAutoplayInterval={bgAutoplayInterval} setBgAutoplayInterval={setBgAutoplayInterval}
        sfxMap={sfxMap}
      />
      
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
};

export default SettingsPanel;