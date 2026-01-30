
import React from 'react';
import { EffectsConfig } from '../../../types';
import RangeControl from '../RangeControl';
import ToggleSwitch from '../ToggleSwitch';
import { useLanguage } from '../../../contexts/LanguageContext';
import { User } from 'lucide-react';

interface TronSettingsProps {
  config: EffectsConfig['tron'];
  update: (v: EffectsConfig['tron']) => void;
}

const TronSettings: React.FC<TronSettingsProps> = ({ config, update }) => {
  const { t } = useLanguage();

  return (
    <div className="pt-2">
       <div className="mb-4">
          <ToggleSwitch 
              label={t('tron_show_names')} 
              icon={User} 
              value={config.showNames !== false} 
              onChange={(v) => update({ ...config, showNames: v })} 
              color="blue"
          />
       </div>
       <RangeControl label={t('tron_speed')} value={config.speed} min={0.1} max={2.0} step={0.1} onChange={v => update({ ...config, speed: v })} />
       <RangeControl label={t('tron_max_agents')} value={config.maxAgents || 12} min={4} max={20} step={1} onChange={v => update({ ...config, maxAgents: v })} />
       <RangeControl label={t('tron_size')} value={config.size || 1} min={1} max={4} step={0.5} onChange={v => update({ ...config, size: v })} />
       <RangeControl label={t('tron_spawn')} value={config.spawnRate} min={1} max={20} step={1} onChange={v => update({ ...config, spawnRate: v })} />
       <RangeControl label={t('tron_trail')} value={config.trailLength !== undefined ? config.trailLength : 0.8} min={0.1} max={1.0} step={0.1} onChange={v => update({ ...config, trailLength: v })} />
       <RangeControl label={t('opacity')} value={config.opacity} min={0.1} max={1.0} step={0.1} onChange={v => update({ ...config, opacity: v })} />
    </div>
  );
};

export default TronSettings;
