
import React, { useState } from 'react';
import { Settings, Disc, Activity, Zap, Terminal, AlertTriangle, Tv, Type, Bug, Power, MessageSquare, AudioWaveform, HelpCircle, Save } from 'lucide-react';
import { VisualizerConfig, EffectsConfig, DvdConfig, MarqueeConfig, PatternConfig, BackgroundMedia, AppPreset } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { APP_VERSION } from '../../lib/version';
import { Tooltip } from '../ui/Tooltip';

// Components
import VisualizerSettings from './VisualizerSettings';
import BackgroundSettings from './BackgroundSettings';
import HelpModal from './HelpModal';
import ModuleWrapper from './ModuleWrapper';
import MarqueeSettings from './modules/MarqueeSettings';
import HologramSettings from './modules/HologramSettings';
import ConfigManager from './modules/ConfigManager';
import { MixerSettings, DvdSettings, DebugSettings, ScanlineSettings, CyberSettings, GlitchSettings, SignalSettings } from './modules/EffectModules';

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
  crossfadeDuration: number;
  setCrossfadeDuration: (val: number) => void;
  
  // Presets
  savedPresets: AppPreset[];
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  renamePreset: (id: string, newName: string) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  showVisualizer, setShowVisualizer, showDvd, setShowDvd, marqueeConfig, setMarqueeConfig,
  visualizerConfig, setVisualizerConfig, dvdConfig, setDvdConfig,
  effectsConfig, setEffectsConfig, bgColor, setBgColor, bgPattern = 'none', setBgPattern, bgPatternConfig, setBgPatternConfig,
  onBgMediaUpload, onAudioUpload, onSfxUpload, bgMedia, bgList, currentBgIndex, onRemoveBg, onMoveBg, onSelectBg, onDeselectBg, onClearBgMedia, onExportConfig,
  bgAutoplayInterval, setBgAutoplayInterval, onScheduleReload,
  crossfadeDuration, setCrossfadeDuration,
  savedPresets, savePreset, loadPreset, deletePreset, renamePreset
}) => {
  const [expandedState, setExpandedState] = useState<Record<string, boolean>>({ mixer: true });
  const [showHelp, setShowHelp] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const toggleExpand = (id: string) => {
    setExpandedState(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const updateVisualizer = (k: keyof VisualizerConfig, v: any) => setVisualizerConfig({ ...visualizerConfig, [k]: v });
  const updateDvd = (k: keyof DvdConfig, v: any) => setDvdConfig({ ...dvdConfig, [k]: v });
  const updateEffect = (k: keyof EffectsConfig, v: any) => setEffectsConfig({ ...effectsConfig, [k]: v });
  const updateMarquee = (k: keyof MarqueeConfig, v: any) => setMarqueeConfig({ ...marqueeConfig, [k]: v });

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 border-r-4 border-gray-800 shadow-inner overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-0 border-b border-gray-700 mb-4 bg-gray-900 z-10">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Settings className="animate-spin-slow text-neon-yellow" size={24} />
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-mono text-white leading-none">{t('system')}</h2>
                <div className="flex items-center gap-1.5 opacity-60 pt-1">
                    <div className="w-1.5 h-1.5 bg-neon-green rounded-full animate-pulse"></div>
                    <span className="text-[9px] font-mono text-neon-blue tracking-widest">{APP_VERSION}</span>
                </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Tooltip content={t('help')} position="bottom">
              <button 
                onClick={() => setShowHelp(true)}
                className="text-gray-500 hover:text-neon-blue transition-colors p-1"
              >
                <HelpCircle size={18} />
              </button>
            </Tooltip>
            
            <Tooltip content={t('reboot')} position="bottom">
              <button 
                onClick={onScheduleReload}
                className="text-gray-500 hover:text-red-500 transition-colors p-1"
              >
                <Power size={18} />
              </button>
            </Tooltip>

            <div className="w-px h-4 bg-gray-700"></div>
            
            <div className="flex items-center gap-1 bg-black rounded p-1 border border-gray-700">
              <Tooltip content="ENGLISH" position="bottom">
                <button 
                  onClick={() => setLanguage('en')}
                  className={`px-2 py-0.5 text-xs font-mono font-bold rounded transition-colors ${language === 'en' ? 'bg-neon-blue text-black shadow-[0_0_5px_#00f3ff]' : 'text-gray-500 hover:text-white'}`}
                >
                  EN
                </button>
              </Tooltip>

              <div className="w-px h-3 bg-gray-700"></div>
              
              <Tooltip content="РУССКИЙ" position="bottom">
                <button 
                  onClick={() => setLanguage('ru')}
                  className={`px-2 py-0.5 text-xs font-mono font-bold rounded transition-colors ${language === 'ru' ? 'bg-neon-blue text-black shadow-[0_0_5px_#00f3ff]' : 'text-gray-500 hover:text-white'}`}
                >
                  RU
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 custom-scrollbar pb-4 space-y-3">
        <h3 className="text-xs font-mono text-white mb-2 opacity-80 sticky top-0 bg-gray-900 pb-2 z-10 border-b border-gray-800">{t('modules')}</h3>
        
        {/* MIXER */}
        <ModuleWrapper id="mixer" label={t('mixer_deck')} icon={AudioWaveform} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['mixer']} onToggleExpand={() => toggleExpand('mixer')} onToggleEnable={() => {}}>
            <MixerSettings crossfadeDuration={crossfadeDuration} setCrossfadeDuration={setCrossfadeDuration} />
        </ModuleWrapper>

        {/* WAVEFORM */}
        <ModuleWrapper id="wave" label={t('waveform')} icon={Activity} isEnabled={showVisualizer} isExpanded={expandedState['wave']} onToggleExpand={() => toggleExpand('wave')} onToggleEnable={() => setShowVisualizer(!showVisualizer)}>
            <VisualizerSettings config={visualizerConfig} update={updateVisualizer} />
        </ModuleWrapper>

        {/* MARQUEE */}
        <ModuleWrapper id="marquee" label={t('top_marquee')} icon={Type} isEnabled={marqueeConfig.enabled} isExpanded={expandedState['marquee']} onToggleExpand={() => toggleExpand('marquee')} onToggleEnable={() => updateMarquee('enabled', !marqueeConfig.enabled)}>
            <MarqueeSettings config={marqueeConfig} update={updateMarquee} />
        </ModuleWrapper>

        {/* DVD */}
        <ModuleWrapper id="dvd" label={t('dvd_saver')} icon={Disc} isEnabled={showDvd} isExpanded={expandedState['dvd']} onToggleExpand={() => toggleExpand('dvd')} onToggleEnable={() => setShowDvd(!showDvd)}>
            <DvdSettings config={dvdConfig} update={updateDvd} />
        </ModuleWrapper>

        {/* HOLOGRAMS */}
        <ModuleWrapper id="hologram" label={t('holograms')} icon={MessageSquare} isEnabled={effectsConfig.holograms.enabled} isExpanded={expandedState['hologram']} onToggleExpand={() => toggleExpand('hologram')} onToggleEnable={() => updateEffect('holograms', { ...effectsConfig.holograms, enabled: !effectsConfig.holograms.enabled })}>
            <HologramSettings config={effectsConfig.holograms} update={(v) => updateEffect('holograms', v)} />
        </ModuleWrapper>

        {/* DEBUG CONSOLE */}
        <ModuleWrapper id="debug" label={t('debug_console')} icon={Bug} isEnabled={effectsConfig.debugConsole.enabled} isExpanded={expandedState['debug']} onToggleExpand={() => toggleExpand('debug')} onToggleEnable={() => updateEffect('debugConsole', { ...effectsConfig.debugConsole, enabled: !effectsConfig.debugConsole.enabled })}>
            <DebugSettings config={effectsConfig.debugConsole} update={(v) => updateEffect('debugConsole', v)} />
        </ModuleWrapper>

        {/* SCANLINES */}
        <ModuleWrapper id="scan" label={t('scanlines')} icon={Tv} isEnabled={effectsConfig.scanlineEnabled} isExpanded={expandedState['scan']} onToggleExpand={() => toggleExpand('scan')} onToggleEnable={() => updateEffect('scanlineEnabled', !effectsConfig.scanlineEnabled)}>
            <ScanlineSettings config={effectsConfig} update={updateEffect} />
        </ModuleWrapper>

        {/* CYBER HACK */}
        <ModuleWrapper id="cyber" label={t('cyber_hack')} icon={Terminal} isEnabled={effectsConfig.cyberHack.enabled} isExpanded={expandedState['cyber']} onToggleExpand={() => toggleExpand('cyber')} onToggleEnable={() => updateEffect('cyberHack', { ...effectsConfig.cyberHack, enabled: !effectsConfig.cyberHack.enabled })}>
            <CyberSettings config={effectsConfig.cyberHack} update={(v) => updateEffect('cyberHack', v)} />
        </ModuleWrapper>

        {/* GLITCH */}
        <ModuleWrapper id="glitch" label={t('digital_glitch')} icon={AlertTriangle} isEnabled={effectsConfig.glitch.enabled} isExpanded={expandedState['glitch']} onToggleExpand={() => toggleExpand('glitch')} onToggleEnable={() => updateEffect('glitch', { ...effectsConfig.glitch, enabled: !effectsConfig.glitch.enabled })}>
            <GlitchSettings config={effectsConfig.glitch} update={(v) => updateEffect('glitch', v)} />
        </ModuleWrapper>

        {/* SIGNAL (Always On) */}
        <ModuleWrapper id="signal" label={t('signal_processor')} icon={Zap} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['signal']} onToggleExpand={() => toggleExpand('signal')} onToggleEnable={() => {}}>
            <SignalSettings config={effectsConfig} update={updateEffect} />
        </ModuleWrapper>

        {/* PRESETS */}
        <ModuleWrapper id="presets" label={t('config_manager')} icon={Save} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['presets']} onToggleExpand={() => toggleExpand('presets')} onToggleEnable={() => {}}>
            <ConfigManager 
                presets={savedPresets}
                onSave={savePreset}
                onLoad={loadPreset}
                onDelete={deletePreset}
                onRename={renamePreset}
            />
        </ModuleWrapper>

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
      />
      
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
};

export default SettingsPanel;
