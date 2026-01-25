
import React, { useState } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import RangeControl from '../RangeControl';
import CustomSelect from '../CustomSelect';
import { MarqueeConfig } from '../../../types';
import { useLanguage } from '../../../contexts/LanguageContext';

interface MarqueeSettingsProps {
  config: MarqueeConfig;
  update: (key: keyof MarqueeConfig, val: any) => void;
}

const MarqueeSettings: React.FC<MarqueeSettingsProps> = ({ config, update }) => {
  const { t } = useLanguage();
  const [expandTimeScale, setExpandTimeScale] = useState(true);

  return (
    <div className="pt-2">
        {/* Custom Collapsible for Time Scale (Progress Bar) */}
        <div className="bg-gray-800/20 border border-gray-700/50 rounded overflow-hidden mb-3 hover:border-gray-600 transition-colors">
          <div className="flex items-center justify-between p-3">
            <div 
               className="flex items-center gap-3 cursor-pointer flex-1"
               onClick={() => setExpandTimeScale(!expandTimeScale)}
            >
                <div className="text-neon-yellow opacity-80">
                    <Clock size={16} />
                </div>
                <span className="font-mono text-[11px] tracking-widest text-white uppercase">{t('time_scale')}</span>
                {config.showProgress && (
                    <ChevronDown size={14} className={`text-neon-blue opacity-70 transition-transform ${expandTimeScale ? 'rotate-180' : ''}`} />
                )}
            </div>
            <button
                onClick={() => update('showProgress', !config.showProgress)}
                className={`relative w-10 h-5 rounded-full transition-all duration-300 shadow-inner ml-2
                ${config.showProgress ? 'bg-neon-purple shadow-[0_0_8px_rgba(188,19,254,0.5)]' : 'bg-gray-700'}
                `}
            >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300
                ${config.showProgress ? 'translate-x-5' : 'translate-x-0'}
                `}></div>
            </button>
          </div>
          
          {/* Collapsible Progress Bar Settings */}
          <div className={`transition-[max-height,opacity,padding] duration-300 ease-in-out overflow-hidden ${config.showProgress && expandTimeScale ? 'max-h-60 opacity-100 p-3 pt-0' : 'max-h-0 opacity-0 p-0'}`}>
            <div className="pl-4 pt-2 space-y-3 border-l-2 border-neon-purple/30 ml-2">
               <CustomSelect 
                  label={t('prog_mode')}
                  value={config.progressMode || 'continuous'}
                  options={[
                    { value: 'continuous', label: t('prog_cont') },
                    { value: 'blocks', label: t('prog_blocks') }
                  ]}
                  onChange={v => update('progressMode', v)}
               />
               <RangeControl 
                  label={t('prog_height')} 
                  value={config.progressHeight || 4} 
                  min={2} max={20} step={1} 
                  onChange={v => update('progressHeight', v)} 
                  className="mb-0"
               />
               <RangeControl 
                  label={t('prog_opacity')} 
                  value={config.progressOpacity || 0.8} 
                  min={0.1} max={1} step={0.1} 
                  onChange={v => update('progressOpacity', v)} 
                  className="mb-0"
               />
            </div>
          </div>
        </div>

        <RangeControl label={t('speed')} value={config.speed} min={0.5} max={10} step={0.5} onChange={v => update('speed', v)} />
        <RangeControl label={t('opacity')} value={config.opacity} min={0} max={1} step={0.1} onChange={v => update('opacity', v)} />
        <RangeControl label={t('text_size')} value={config.fontSize} min={12} max={120} step={2} onChange={v => update('fontSize', v)} />
    </div>
  );
};

export default MarqueeSettings;
