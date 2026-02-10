
import React from 'react';
import { EffectsConfig } from '../../../types';
import RangeControl from '../RangeControl';
import CustomSelect from '../CustomSelect';
import ToggleSwitch from '../ToggleSwitch';
import { useLanguage } from '../../../contexts/LanguageContext';
import { User } from 'lucide-react';

interface YouTubeChatSettingsProps {
  config: EffectsConfig['youtubeChat'];
  update: (v: EffectsConfig['youtubeChat']) => void;
}

const YouTubeChatSettings: React.FC<YouTubeChatSettingsProps> = ({ config, update }) => {
  const { t } = useLanguage();

  const colorOptions = [
      { value: 'theme', label: 'THEME SYNC' },
      { value: '#00f3ff', label: 'NEON CYAN' },
      { value: '#ff0000', label: 'YOUTUBE RED' },
      { value: '#ffffff', label: 'PURE WHITE' },
      { value: '#000000', label: 'DARK MODE' },
  ];

  return (
    <div className="pt-2">
       {/* TOGGLES */}
       <div className="mb-4 space-y-2">
          <ToggleSwitch 
              label={t('yt_show_avatars')} 
              icon={User} 
              value={config.showAvatars} 
              onChange={(v) => update({ ...config, showAvatars: v })} 
              color="blue"
          />
       </div>

       {/* STYLE */}
       <div className="mb-4 pt-2 border-t border-theme-border">
           <CustomSelect 
              label={t('hologram_color')}
              value={config.color || 'theme'}
              options={colorOptions}
              onChange={(v) => update({ ...config, color: v })}
           />
       </div>
       
       <div className="border-t border-theme-border pt-2">
         <RangeControl label={t('opacity')} value={config.opacity} min={0.1} max={1} step={0.1} onChange={v => update({ ...config, opacity: v })} />
         <RangeControl label={t('width')} value={config.width} min={300} max={800} step={10} onChange={v => update({ ...config, width: v })} />
         <RangeControl label={t('scale')} value={config.scale} min={0.5} max={2.0} step={0.1} onChange={v => update({ ...config, scale: v })} />
         <RangeControl label={t('yt_scroll_speed')} value={config.speed} min={0.5} max={5} step={0.5} onChange={v => update({ ...config, speed: v })} />
         <RangeControl label={t('yt_max_messages')} value={config.maxMessages} min={5} max={50} step={5} onChange={v => update({ ...config, maxMessages: v })} />
       </div>
    </div>
  );
};

export default YouTubeChatSettings;
