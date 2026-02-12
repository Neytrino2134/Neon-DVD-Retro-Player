
import React from 'react';
import { EffectsConfig } from '../../../types';
import RangeControl from '../RangeControl';
import ToggleSwitch from '../ToggleSwitch';
import CustomSelect from '../CustomSelect';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Zap, Grid, Trash2 } from 'lucide-react';

interface LifeSettingsProps {
  config: EffectsConfig['life'];
  update: (v: EffectsConfig['life']) => void;
}

const LifeSettings: React.FC<LifeSettingsProps> = ({ config, update }) => {
  const { t } = useLanguage();

  const handleAction = (action: 'random' | 'clear' | 'glider_gun' | 'pulsar') => {
      // Toggle token to force effect refresh even if action is same
      const token = (config.triggerToken || 0) + 1;
      update({ ...config, triggerAction: action, triggerToken: token });
  };

  const colorOptions = [
      { value: '#00f3ff', label: 'NEON CYAN' },
      { value: '#00ff00', label: 'MATRIX GREEN' },
      { value: '#ff00ff', label: 'HOT PINK' },
      { value: '#ffffff', label: 'PURE WHITE' },
      { value: '#ff3333', label: 'RED ALERT' },
  ];

  return (
    <div className="pt-2">
       
       <div className="mb-4">
           <ToggleSwitch 
                label="GAME OF LIFE" 
                icon={Grid} 
                value={config.enabled} 
                onChange={(v) => update({ ...config, enabled: v })} 
                color="blue"
           />
       </div>

       <div className="grid grid-cols-2 gap-2 mb-4">
           <button 
                onClick={() => handleAction('random')}
                className="flex items-center justify-center gap-2 p-2 bg-theme-panel border border-theme-border rounded hover:bg-theme-primary/10 hover:text-theme-primary transition-all text-[10px] font-mono font-bold"
           >
               <Zap size={12} /> RANDOM
           </button>
           <button 
                onClick={() => handleAction('clear')}
                className="flex items-center justify-center gap-2 p-2 bg-theme-panel border border-theme-border rounded hover:bg-red-500/10 hover:text-red-500 transition-all text-[10px] font-mono font-bold"
           >
               <Trash2 size={12} /> CLEAR
           </button>
       </div>

       <div className="grid grid-cols-2 gap-2 mb-4">
           <button 
                onClick={() => handleAction('glider_gun')}
                className="flex items-center justify-center gap-2 p-2 bg-theme-panel border border-theme-border rounded hover:bg-theme-secondary/10 hover:text-theme-secondary transition-all text-[10px] font-mono font-bold"
           >
               GLIDER GUN
           </button>
           <button 
                onClick={() => handleAction('pulsar')}
                className="flex items-center justify-center gap-2 p-2 bg-theme-panel border border-theme-border rounded hover:bg-theme-secondary/10 hover:text-theme-secondary transition-all text-[10px] font-mono font-bold"
           >
               PULSAR
           </button>
       </div>

       <div className="mb-4 pt-2 border-t border-theme-border">
           <CustomSelect 
              label={t('hologram_color')}
              value={config.color}
              options={colorOptions}
              onChange={(v) => update({ ...config, color: v })}
           />
       </div>

       <RangeControl label="SIMULATION SPEED" value={config.speed} min={1} max={10} step={1} onChange={v => update({ ...config, speed: v })} />
       <RangeControl label="CELL SIZE" value={config.cellSize} min={4} max={40} step={2} onChange={v => update({ ...config, cellSize: v })} />
       <RangeControl label="TRAIL FADE" value={config.fadeSpeed} min={0.1} max={0.99} step={0.01} onChange={v => update({ ...config, fadeSpeed: v })} />

    </div>
  );
};

export default LifeSettings;
