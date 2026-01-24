
import React, { useRef, useState, useEffect } from 'react';
import { Settings, Eye, Disc, Image as ImageIcon, Activity, Zap, Layers, Terminal, AlertTriangle, Tv, ChevronUp, ChevronDown, Download, Type } from 'lucide-react';
import { VisualizerConfig, EffectsConfig, DvdConfig, MarqueeConfig } from '../types';
import RangeControl from './settings/RangeControl';
import VisualizerSettings from './settings/VisualizerSettings';
import CustomSelect from './settings/CustomSelect';
import { useLanguage } from '../contexts/LanguageContext';

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
  onBgMediaUpload: (file: File) => void;
  bgMedia: { type: 'image' | 'video', url: string } | null;
  onClearBgMedia: () => void;
  onExportConfig: () => void;
}

const BG_PALETTE = ['#0f172a', '#000000', '#1a0505', '#051a05', '#05051a', '#1a051a'];

const FPS_OPTIONS = [
  { value: 60, label: '60 FPS (OFF)' },
  { value: 30, label: '30 FPS' },
  { value: 25, label: '25 FPS (PAL)' },
  { value: 24, label: '24 FPS (CINEMA)' },
  { value: 12, label: '12 FPS (RETRO)' },
];

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  showVisualizer, setShowVisualizer, showDvd, setShowDvd, marqueeConfig, setMarqueeConfig,
  visualizerConfig, setVisualizerConfig, dvdConfig, setDvdConfig,
  effectsConfig, setEffectsConfig, bgColor, setBgColor,
  onBgMediaUpload, bgMedia, onClearBgMedia, onExportConfig
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Track expansion state separately from enabled state
  const [expandedState, setExpandedState] = useState<Record<string, boolean>>({});
  const { language, setLanguage, t } = useLanguage();

  // Helper to toggle expansion
  const toggleExpand = (id: string) => {
    setExpandedState(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to ensure a section is expanded when turned on
  const handleToggleModule = (id: string, currentVal: boolean, setter: (v: boolean) => void) => {
    const newVal = !currentVal;
    setter(newVal);
  };

  const updateVisualizer = (k: keyof VisualizerConfig, v: any) => setVisualizerConfig({ ...visualizerConfig, [k]: v });
  const updateDvd = (k: keyof DvdConfig, v: any) => setDvdConfig({ ...dvdConfig, [k]: v });
  const updateEffect = (k: keyof EffectsConfig, v: any) => setEffectsConfig({ ...effectsConfig, [k]: v });
  const updateMarquee = (k: keyof MarqueeConfig, v: any) => setMarqueeConfig({ ...marqueeConfig, [k]: v });

  // Define the module blocks
  const modules = [
    {
      id: 'wave',
      label: t('waveform'),
      icon: Activity,
      isEnabled: showVisualizer,
      onToggle: () => handleToggleModule('wave', showVisualizer, setShowVisualizer),
      content: <VisualizerSettings config={visualizerConfig} update={updateVisualizer} />
    },
    {
      id: 'dvd',
      label: t('dvd_saver'),
      icon: Disc,
      isEnabled: showDvd,
      onToggle: () => handleToggleModule('dvd', showDvd, setShowDvd),
      content: (
        <div className="pt-2">
          <RangeControl label={t('size')} value={dvdConfig.size} min={60} max={300} step={10} onChange={v => updateDvd('size', v)} />
          <RangeControl label={t('speed')} value={dvdConfig.speed} min={1} max={15} step={1} onChange={v => updateDvd('speed', v)} />
          <RangeControl label={t('opacity')} value={dvdConfig.opacity} min={0} max={1} step={0.1} onChange={v => updateDvd('opacity', v)} />
        </div>
      )
    },
    {
      id: 'marquee',
      label: t('top_marquee'),
      icon: Type,
      isEnabled: marqueeConfig.enabled,
      onToggle: () => updateMarquee('enabled', !marqueeConfig.enabled),
      content: (
        <div className="pt-2">
            <RangeControl label={t('speed')} value={marqueeConfig.speed} min={1} max={10} step={0.5} onChange={v => updateMarquee('speed', v)} />
            <RangeControl label={t('opacity')} value={marqueeConfig.opacity} min={0} max={1} step={0.1} onChange={v => updateMarquee('opacity', v)} />
        </div>
      )
    },
    {
      id: 'scan',
      label: t('scanlines'),
      icon: Tv,
      isEnabled: effectsConfig.scanlineEnabled,
      onToggle: () => handleToggleModule('scan', effectsConfig.scanlineEnabled, v => updateEffect('scanlineEnabled', v)),
      content: (
        <div className="pt-2">
          <RangeControl label={t('intensity')} value={effectsConfig.scanlineIntensity} min={0} max={0.8} step={0.05} onChange={v => updateEffect('scanlineIntensity', v)} />
          <RangeControl label={t('thickness')} value={effectsConfig.scanlineThickness} min={2} max={16} step={1} onChange={v => updateEffect('scanlineThickness', v)} />
        </div>
      )
    },
    {
      id: 'cyber',
      label: t('cyber_hack'),
      icon: Terminal,
      isEnabled: effectsConfig.cyberHack.enabled,
      onToggle: () => handleToggleModule('cyber', effectsConfig.cyberHack.enabled, v => updateEffect('cyberHack', { ...effectsConfig.cyberHack, enabled: v })),
      content: (
        <div className="pt-2">
           <RangeControl label={t('print_speed')} value={effectsConfig.cyberHack.speed} min={1} max={10} step={1} onChange={v => updateEffect('cyberHack', { ...effectsConfig.cyberHack, speed: v })} />
           <RangeControl label={t('scale')} value={effectsConfig.cyberHack.scale} min={0.5} max={3.0} step={0.1} onChange={v => updateEffect('cyberHack', { ...effectsConfig.cyberHack, scale: v })} />
           <RangeControl label={t('bg_opacity')} value={effectsConfig.cyberHack.backgroundOpacity} min={0} max={1} step={0.05} onChange={v => updateEffect('cyberHack', { ...effectsConfig.cyberHack, backgroundOpacity: v })} />
        </div>
      )
    },
    {
      id: 'glitch',
      label: t('digital_glitch'),
      icon: AlertTriangle,
      isEnabled: effectsConfig.glitch.enabled,
      onToggle: () => handleToggleModule('glitch', effectsConfig.glitch.enabled, v => updateEffect('glitch', { ...effectsConfig.glitch, enabled: v })),
      content: (
        <div className="pt-2">
           <CustomSelect 
              label={t('glitch_variant')}
              value={effectsConfig.glitch.variant}
              options={[
                { value: 'v1', label: t('variant_v1') },
                { value: 'v2', label: t('variant_v2') }
              ]}
              onChange={v => updateEffect('glitch', { ...effectsConfig.glitch, variant: v })}
           />
           <RangeControl label={t('intensity')} value={effectsConfig.glitch.intensity} min={0.05} max={1.0} step={0.05} onChange={v => updateEffect('glitch', { ...effectsConfig.glitch, intensity: v })} />
           <RangeControl label={t('speed')} value={effectsConfig.glitch.speed} min={0.05} max={1.0} step={0.05} onChange={v => updateEffect('glitch', { ...effectsConfig.glitch, speed: v })} />
           <RangeControl label={t('opacity')} value={effectsConfig.glitch.opacity ?? 1.0} min={0} max={1} step={0.05} onChange={v => updateEffect('glitch', { ...effectsConfig.glitch, opacity: v })} />
        </div>
      )
    },
    {
      id: 'signal',
      label: t('signal_processor'),
      icon: Zap,
      isEnabled: true, // Always on
      isAlwaysOn: true,
      onToggle: () => {}, // No toggle
      content: (
        <div className="pt-2">
            <CustomSelect 
              label={t('fps_limit')} 
              value={effectsConfig.fps} 
              options={FPS_OPTIONS} 
              onChange={(v) => updateEffect('fps', v)} 
            />
            <RangeControl label={t('pixelation')} value={effectsConfig.pixelation} min={1} max={20} step={1} onChange={v => updateEffect('pixelation', v)} />
            <RangeControl label={t('static_noise')} value={effectsConfig.noise} min={0} max={0.5} step={0.01} onChange={v => updateEffect('noise', v)} />
            <RangeControl label={t('vhs_jitter')} value={effectsConfig.vhsJitter} min={0} max={10} step={0.5} onChange={v => updateEffect('vhsJitter', v)} />
        </div>
      )
    }
  ];

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 border-r-4 border-gray-800 shadow-inner overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-0 border-b border-gray-700 mb-4 bg-gray-900 z-10">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Settings className="animate-spin-slow text-neon-yellow" size={24} />
            <h2 className="text-xl font-mono text-white">{t('system')}</h2>
          </div>
          
          <div className="flex items-center gap-1 bg-black rounded p-1 border border-gray-700">
            <button 
              onClick={() => setLanguage('en')}
              className={`px-2 py-0.5 text-xs font-mono font-bold rounded transition-colors ${language === 'en' ? 'bg-neon-blue text-black shadow-[0_0_5px_#00f3ff]' : 'text-gray-500 hover:text-white'}`}
            >
              EN
            </button>
            <div className="w-px h-3 bg-gray-700"></div>
            <button 
              onClick={() => setLanguage('ru')}
              className={`px-2 py-0.5 text-xs font-mono font-bold rounded transition-colors ${language === 'ru' ? 'bg-neon-blue text-black shadow-[0_0_5px_#00f3ff]' : 'text-gray-500 hover:text-white'}`}
            >
              RU
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 custom-scrollbar pb-4 space-y-3">
        <h3 className="text-xs font-mono text-white mb-2 opacity-80 sticky top-0 bg-gray-900 pb-2 z-10 border-b border-gray-800">{t('modules')}</h3>
        
        {modules.map((m) => {
          const isExpanded = expandedState[m.id];
          const activeStyle = m.isEnabled 
             ? "border-neon-blue/50 bg-gray-800/80 shadow-[inset_0_0_10px_rgba(0,243,255,0.05)]" 
             : "border-gray-700 bg-gray-900/50 opacity-80";

          return (
            <div 
              key={m.id} 
              className={`rounded border transition-all duration-300 overflow-hidden flex flex-col ${activeStyle}`}
            >
              {/* Card Header: Label + Toggle */}
              <div className="flex items-center justify-between p-3 min-h-[50px]">
                <div 
                  className="flex items-center gap-3 cursor-pointer select-none flex-1"
                  onClick={() => {
                     // Clicking label toggles expand if enabled, or toggles enable if disabled
                     if (m.isEnabled) toggleExpand(m.id);
                     else if (!m.isAlwaysOn) m.onToggle(); 
                  }}
                >
                  <m.icon size={18} className={`transition-colors ${m.isEnabled ? "text-neon-yellow" : "text-gray-500"}`} />
                  <span className={`font-mono text-xs font-bold tracking-widest uppercase transition-colors ${m.isEnabled ? "text-white" : "text-gray-400"}`}>
                    {m.label}
                  </span>
                  
                  {/* Expand Chevron */}
                  {m.isEnabled && (
                     <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
                        <ChevronDown size={14} className="text-neon-blue opacity-70" />
                     </div>
                  )}
                </div>

                {/* Switch */}
                {!m.isAlwaysOn && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      m.onToggle();
                    }}
                    className={`relative w-10 h-5 rounded-full transition-all duration-300 shadow-inner ml-3 shrink-0
                      ${m.isEnabled ? 'bg-neon-purple shadow-[0_0_8px_rgba(188,19,254,0.5)]' : 'bg-gray-700'}
                    `}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300
                      ${m.isEnabled ? 'translate-x-5' : 'translate-x-0'}
                    `}></div>
                  </button>
                )}
              </div>

              {/* Card Body: Settings (Collapsible) */}
              <div 
                className={`transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden
                  ${isExpanded && m.isEnabled ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'}
                `}
              >
                <div className="p-3 pt-0 border-t border-gray-700/50">
                  {m.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer / Background */}
      <div className="p-4 bg-gray-900 border-t border-gray-800 z-10 shrink-0 space-y-3">
        <div>
          <h3 className="flex items-center gap-2 text-xs font-mono text-white mb-2 opacity-80"><Layers size={14} className="text-neon-yellow" /> {t('background')}</h3>
          <div className="grid grid-cols-6 gap-2 mb-4">
            {BG_PALETTE.map(c => <button key={c} onClick={() => { setBgColor(c); onClearBgMedia(); }} className={`h-6 rounded border-2 ${bgColor === c && !bgMedia ? 'border-neon-purple shadow-[0_0_10px_#bc13fe]' : 'border-gray-600'}`} style={{ backgroundColor: c }} />)}
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 p-2 bg-gray-800 border border-gray-600 rounded text-gray-300 hover:text-white hover:border-neon-yellow transition-colors">
            <ImageIcon size={16} className="text-neon-yellow" /> <span className="font-mono text-xs">{t('load_img')}</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={e => e.target.files?.[0] && (onBgMediaUpload(e.target.files[0]), e.target.value='')} accept="image/*,video/*" className="hidden" />
        </div>

        <div className="pt-2 border-t border-gray-800">
           <button 
             onClick={onExportConfig}
             className="w-full flex items-center justify-center gap-2 p-2 bg-gray-800 border border-neon-purple text-neon-purple rounded hover:bg-neon-purple hover:text-black hover:shadow-[0_0_15px_#bc13fe] transition-all active:scale-95"
           >
              <Download size={16} />
              <span className="font-mono text-xs font-bold uppercase tracking-widest">{t('export_config')}</span>
           </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
