
import React, { useState } from 'react';
import { Maximize, Split, ChevronDown, AlignJustify } from 'lucide-react';
import { VisualizerConfig } from '../../../types';
import RangeControl from '../RangeControl';
import ToggleSwitch from '../ToggleSwitch';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';

interface GlobalWaveformSettingsProps {
  config: VisualizerConfig;
  update: (key: keyof VisualizerConfig, value: any) => void;
}

const GlobalWaveformSettings: React.FC<GlobalWaveformSettingsProps> = ({ config, update }) => {
  const { t } = useLanguage();
  const { controlStyle } = useTheme();
  
  // States
  const [expandOpacity, setExpandOpacity] = useState(false);
  const [expandFreq, setExpandFreq] = useState(false);
  const [expandPower, setExpandPower] = useState(true);

  // Dynamic Radius
  let wrapperRadius = 'rounded';
  if (controlStyle === 'round') wrapperRadius = 'rounded-lg';
  else if (controlStyle === 'circle') wrapperRadius = 'rounded-lg';

  return (
    <div className="pt-2 space-y-4">
        
        <div className="text-[10px] text-theme-muted font-mono opacity-70 text-center mb-2">
            CHANGES APPLY INSTANTLY TO ALL WAVEFORMS
        </div>

        <div className="h-px bg-theme-border/50"></div>

        {/* Position Toggles */}
        <div className="flex justify-between items-center bg-black/20 p-2 rounded border border-theme-border">
            <span className="text-[10px] font-mono text-theme-muted uppercase">POSITION</span>
            <div className="flex gap-1">
                {['top', 'center', 'bottom'].map((pos) => (
                    <button 
                        key={pos}
                        onClick={() => update('position', pos)}
                        className={`px-2 py-1 text-[9px] font-mono border rounded uppercase transition-all ${
                            config.position === pos 
                                ? 'bg-theme-primary/20 border-theme-primary text-theme-primary font-bold' 
                                : 'border-transparent text-theme-muted hover:text-white'
                        }`}
                    >
                        {pos}
                    </button>
                ))}
            </div>
        </div>

        {/* Bar Count (Kept separate as it defines resolution) */}
        <RangeControl label="BAR COUNT" value={config.barCount} min={16} max={256} step={16} onChange={(v) => update('barCount', v)} className="mb-0" />

        {/* Collapsible Power & Gravity (Moved from top level) */}
        <div className={`bg-theme-panel/40 ${wrapperRadius} overflow-hidden mb-2 transition-all duration-300 border border-theme-border hover:border-theme-primary hover:shadow-[0_0_5px_var(--color-primary)]`}>
            <div 
                className="flex items-center justify-between p-3 cursor-pointer select-none bg-black/20 border-b border-theme-border"
                onClick={() => setExpandPower(!expandPower)}
            >
                <span className="font-mono text-[10px] text-theme-primary font-bold tracking-widest uppercase">{t('group_power_gravity')}</span>
                <ChevronDown size={14} className={`text-theme-primary opacity-70 transition-transform duration-300 ${expandPower ? 'rotate-180' : ''}`} />
            </div>
            
            <div className={`grid transition-[grid-template-rows,padding,opacity] duration-300 ease-in-out ${expandPower ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="p-3 pt-2 flex flex-col gap-4">
                        <RangeControl label="AMPLITUDE (SENSITIVITY)" value={config.sensitivity} min={0.1} max={3.0} step={0.1} onChange={(v) => update('sensitivity', v)} className="mb-0" />
                        <RangeControl label="BAR GRAVITY" value={config.barGravity ?? 5} min={0} max={10} step={0.5} onChange={(v) => update('barGravity', v)} className="mb-0" />
                    </div>
                </div>
            </div>
        </div>

        {/* Toggles */}
        <div className="space-y-2">
            <ToggleSwitch label="IGNORE VOLUME" icon={Maximize} value={config.preventVolumeScaling || false} onChange={(v) => update('preventVolumeScaling', v)} color="blue" />
            <ToggleSwitch label="MIRROR MODE" icon={Split} value={config.mirror} onChange={(v) => update('mirror', v)} color="purple" />
            <ToggleSwitch label="NORMALIZE INPUT" icon={AlignJustify} value={config.normalize} onChange={(v) => update('normalize', v)} color="green" />
        </div>

        {/* Collapsible Frequency */}
        <div className={`bg-theme-panel/40 ${wrapperRadius} overflow-hidden mb-2 transition-all duration-300 border border-theme-border hover:border-theme-primary hover:shadow-[0_0_5px_var(--color-primary)]`}>
            <div 
                className="flex items-center justify-between p-3 cursor-pointer select-none bg-black/20 border-b border-theme-border"
                onClick={() => setExpandFreq(!expandFreq)}
            >
                <span className="font-mono text-[10px] text-theme-primary font-bold tracking-widest uppercase">FREQUENCY CUTOFF</span>
                <ChevronDown size={14} className={`text-theme-primary opacity-70 transition-transform duration-300 ${expandFreq ? 'rotate-180' : ''}`} />
            </div>
            
            <div className={`grid transition-[grid-template-rows,padding,opacity] duration-300 ease-in-out ${expandFreq ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="p-3 pt-2 flex flex-col gap-4">
                        <RangeControl label="MIN FREQ" value={config.minFrequency} min={0} max={99} step={1} onChange={(v) => update('minFrequency', v)} className="mb-0" />
                        <RangeControl label="MAX FREQ" value={config.maxFrequency} min={1} max={100} step={1} onChange={(v) => update('maxFrequency', v)} className="mb-0" />
                    </div>
                </div>
            </div>
        </div>

        {/* Collapsible Opacity */}
        <div className={`bg-theme-panel/40 ${wrapperRadius} overflow-hidden mb-2 transition-all duration-300 border border-theme-border hover:border-theme-primary hover:shadow-[0_0_5px_var(--color-primary)]`}>
            <div 
                className="flex items-center justify-between p-3 cursor-pointer select-none bg-black/20 border-b border-theme-border"
                onClick={() => setExpandOpacity(!expandOpacity)}
            >
                <span className="font-mono text-[10px] text-theme-primary font-bold tracking-widest uppercase">OPACITY</span>
                <ChevronDown size={14} className={`text-theme-primary opacity-70 transition-transform duration-300 ${expandOpacity ? 'rotate-180' : ''}`} />
            </div>
            
            <div className={`grid transition-[grid-template-rows,padding,opacity] duration-300 ease-in-out ${expandOpacity ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="p-3 pt-2 flex flex-col gap-4">
                        <RangeControl label="FILL OPACITY" value={config.fillOpacity} min={0} max={1} step={0.1} onChange={(v) => update('fillOpacity', v)} className="mb-0" />
                        <RangeControl label="STROKE OPACITY" value={config.strokeOpacity} min={0} max={1} step={0.1} onChange={(v) => update('strokeOpacity', v)} className="mb-0" />
                    </div>
                </div>
            </div>
        </div>

    </div>
  );
};

export default GlobalWaveformSettings;
