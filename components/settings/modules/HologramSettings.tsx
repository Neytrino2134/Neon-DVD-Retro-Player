
import React from 'react';
import { Square, CheckSquare } from 'lucide-react';
import RangeControl from '../RangeControl';
import { EffectsConfig, HologramCategory } from '../../../types';
import { useLanguage } from '../../../contexts/LanguageContext';

interface HologramSettingsProps {
  config: EffectsConfig['holograms'];
  update: (val: EffectsConfig['holograms']) => void;
}

const HologramSettings: React.FC<HologramSettingsProps> = ({ config, update }) => {
  const { t } = useLanguage();

  const toggleCategory = (cat: HologramCategory) => {
      const newCats = { ...config.categories, [cat]: !config.categories[cat] };
      update({ ...config, categories: newCats });
  };

  return (
    <div className="pt-2">
       <div className="mb-4">
          <label className="text-white font-mono text-[10px] block mb-2 tracking-widest uppercase opacity-70">CATEGORIES</label>
          <div className="grid grid-cols-2 gap-2">
              {(['system', 'interactive', 'music', 'motivational', 'philosophy', 'space'] as HologramCategory[]).map(cat => (
                  <button 
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`
                        flex items-center gap-2 p-1.5 rounded border text-xs font-mono transition-all text-left
                        ${config.categories[cat] 
                            ? 'border-neon-blue bg-neon-blue/10 text-neon-blue' 
                            : 'border-gray-700 bg-gray-800 text-gray-500 hover:border-gray-500'}
                    `}
                  >
                     {config.categories[cat] 
                        ? <CheckSquare size={12} className="shrink-0" /> 
                        : <Square size={12} className="shrink-0" />}
                     <span className="truncate">{t(`cat_${cat}` as any)}</span>
                  </button>
              ))}
          </div>
       </div>
       
       <div className="border-t border-gray-700/50 pt-2">
         <RangeControl label={t('opacity')} value={config.opacity} min={0.1} max={1} step={0.1} onChange={v => update({ ...config, opacity: v })} />
         <RangeControl label={t('scale')} value={config.scale ?? 1.0} min={0.5} max={2.0} step={0.1} onChange={v => update({ ...config, scale: v })} />
         <RangeControl label={t('msg_speed')} value={config.speed} min={0.5} max={5} step={0.5} onChange={v => update({ ...config, speed: v })} />
         <RangeControl label={t('msg_interval')} value={config.interval} min={1} max={60} step={1} onChange={v => update({ ...config, interval: v })} />
       </div>
    </div>
  );
};

export default HologramSettings;
