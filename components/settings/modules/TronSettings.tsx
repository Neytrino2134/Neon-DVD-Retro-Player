
import React from 'react';
import { EffectsConfig } from '../../../types';
import RangeControl from '../RangeControl';
import { useLanguage } from '../../../contexts/LanguageContext';

interface TronSettingsProps {
  config: EffectsConfig['tron'];
  update: (v: EffectsConfig['tron']) => void;
}

const TronSettings: React.FC<TronSettingsProps> = ({ config, update }) => {
  const { t } = useLanguage();

  return (
    <div className="pt-2">
       <RangeControl label={t('tron_speed')} value={config.speed} min={0.1} max={2.0} step={0.1} onChange={v => update({ ...config, speed: v })} />
       <RangeControl label={t('tron_spawn')} value={config.spawnRate} min={1} max={20} step={1} onChange={v => update({ ...config, spawnRate: v })} />
       <RangeControl label={t('opacity')} value={config.opacity} min={0.1} max={1.0} step={0.1} onChange={v => update({ ...config, opacity: v })} />
    </div>
  );
};

export default TronSettings;
