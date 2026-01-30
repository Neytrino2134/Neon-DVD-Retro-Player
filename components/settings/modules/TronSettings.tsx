
import React, { useState } from 'react';
import { EffectsConfig } from '../../../types';
import RangeControl from '../RangeControl';
import ToggleSwitch from '../ToggleSwitch';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { User, ChevronDown, Gamepad2 } from 'lucide-react';

interface TronSettingsProps {
  config: EffectsConfig['tron'];
  update: (v: EffectsConfig['tron']) => void;
}

const TronSettings: React.FC<TronSettingsProps> = ({ config, update }) => {
  const { t } = useLanguage();
  const { controlStyle } = useTheme();

  // State for collapsible sections
  const [expanded, setExpanded] = useState({
    user: true,
    player: true,
    arena: true,
    style: true
  });

  const toggle = (key: keyof typeof expanded) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Dynamic Radius
  let wrapperRadius = 'rounded';
  if (controlStyle === 'round') wrapperRadius = 'rounded-lg';
  else if (controlStyle === 'circle') wrapperRadius = 'rounded-lg';

  const renderSection = (key: keyof typeof expanded, title: string, children: React.ReactNode) => {
    const isOpen = expanded[key];
    return (
        <div className={`bg-theme-panel/40 ${wrapperRadius} overflow-hidden mb-3 transition-all duration-300 border border-theme-border hover:border-theme-primary hover:shadow-[0_0_5px_var(--color-primary)]`}>
            <div 
                className="flex items-center justify-between p-3 cursor-pointer select-none bg-black/20 border-b border-theme-border"
                onClick={() => toggle(key)}
            >
                <span className="font-mono text-[10px] text-theme-primary font-bold tracking-widest uppercase">{title}</span>
                <ChevronDown size={14} className={`text-theme-primary opacity-70 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            
            <div className={`grid transition-[grid-template-rows,padding,opacity] duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="p-3 pt-2">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
  };

  // Speed Mapper:
  // UI: 1 to 10
  // Config: 0.2 to 0.4
  // Mapping: config = 0.2 + ((ui - 1) / 9) * 0.2
  const speedToUI = (val: number) => {
      // Clamp for safety
      const clamped = Math.max(0.2, Math.min(0.4, val));
      return Math.round(1 + ((clamped - 0.2) / 0.2) * 9);
  };

  const uiToSpeed = (ui: number) => {
      return 0.2 + ((ui - 1) / 9) * 0.2;
  };

  return (
    <div className="pt-2">
       
       {/* USER SETTINGS */}
       {renderSection('user', "USER SETTINGS", (
           <>
                <ToggleSwitch 
                    label="USER INPUT" 
                    icon={Gamepad2} 
                    value={config.enableUser || false} 
                    onChange={(v) => update({ ...config, enableUser: v })} 
                    color="green"
                />
                {config.enableUser && (
                    <div className="mt-2 text-[9px] font-mono text-theme-muted opacity-80 border-l-2 border-green-500 pl-2">
                        CONTROLS: NUMPAD 8, 4, 5, 6
                        <br/>
                        RESTART: NUMPAD 0
                    </div>
                )}
           </>
       ))}

       {/* PLAYER SETTINGS */}
       {renderSection('player', "PLAYER SETTINGS", (
           <>
                <RangeControl 
                    label={t('tron_speed')} 
                    value={speedToUI(config.speed)} 
                    min={1} 
                    max={10} 
                    step={1} 
                    onChange={v => update({ ...config, speed: uiToSpeed(v) })} 
                    className="mb-4 last:mb-0" 
                />
                <RangeControl label={t('tron_size')} value={config.size || 1} min={1} max={4} step={0.5} onChange={v => update({ ...config, size: v })} className="mb-4 last:mb-0" />
                <RangeControl label={t('tron_trail')} value={config.trailLength !== undefined ? config.trailLength : 0.8} min={0.1} max={1.0} step={0.1} onChange={v => update({ ...config, trailLength: v })} className="mb-0" />
           </>
       ))}

       {/* ARENA SETTINGS */}
       {renderSection('arena', "ARENA SETTINGS", (
           <>
                <RangeControl label={t('tron_max_agents')} value={config.maxAgents || 12} min={4} max={20} step={1} onChange={v => update({ ...config, maxAgents: v })} className="mb-4 last:mb-0" />
                <RangeControl label={t('tron_spawn')} value={config.spawnRate} min={1} max={20} step={1} onChange={v => update({ ...config, spawnRate: v })} className="mb-0" />
           </>
       ))}

       {/* STYLE */}
       {renderSection('style', "STYLE", (
           <>
                <RangeControl label={t('opacity')} value={config.opacity} min={0.1} max={1.0} step={0.1} onChange={v => update({ ...config, opacity: v })} className="mb-4" />
                <ToggleSwitch 
                    label={t('tron_show_names')} 
                    icon={User} 
                    value={config.showNames !== false} 
                    onChange={(v) => update({ ...config, showNames: v })} 
                    color="blue"
                />
           </>
       ))}

    </div>
  );
};

export default TronSettings;
