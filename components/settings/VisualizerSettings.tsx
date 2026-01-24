
import React from 'react';
import { Maximize, Split, Square } from 'lucide-react';
import { VisualizerConfig, VisualizerPosition } from '../../types';
import RangeControl from './RangeControl';
import ToggleSwitch from './ToggleSwitch';
import { useLanguage } from '../../contexts/LanguageContext';

interface VisualizerSettingsProps {
  config: VisualizerConfig;
  update: (key: keyof VisualizerConfig, value: any) => void;
}

const VisualizerSettings: React.FC<VisualizerSettingsProps> = ({ config, update }) => {
  const { t } = useLanguage();

  return (
    <div className="p-4 border-t border-gray-700 space-y-8">
      {/* Position Section */}
      <div className="section-block">
         <label className="text-white font-mono text-xs block mb-3 tracking-widest uppercase opacity-70">{t('position')}</label>
         <div className="grid grid-cols-3 gap-2">
            {(['top', 'center', 'bottom'] as VisualizerPosition[]).map((pos) => (
              <button 
                key={pos} 
                onClick={() => update('position', pos)} 
                className={`px-2 py-2 text-xs font-mono border rounded capitalize transition-all ${
                  config.position === pos 
                    ? 'border-neon-purple text-neon-purple bg-neon-purple/20 shadow-[0_0_8px_rgba(188,19,254,0.3)]' 
                    : 'border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500'
                }`}
              >
                {t(`pos_${pos}` as any)}
              </button>
            ))}
         </div>
      </div>

      {/* Style Section */}
      <div className="section-block">
         <label className="text-white font-mono text-xs block mb-3 tracking-widest uppercase opacity-70">{t('visual_style')}</label>
         <select 
           value={config.style} 
           onChange={(e) => update('style', e.target.value)} 
           className="w-full bg-black border border-gray-700 text-white font-mono text-xs p-3 rounded outline-none focus:border-neon-purple transition-colors"
         >
           <option value="retro">{t('style_retro')}</option>
           <option value="blue">{t('style_blue')}</option>
           <option value="pink">{t('style_pink')}</option>
           <option value="matrix">{t('style_matrix')}</option>
           <option value="inferno">{t('style_inferno')}</option>
         </select>
      </div>

      {/* Toggles Section */}
      <div className="space-y-3">
         <label className="text-white font-mono text-xs block mb-2 tracking-widest uppercase opacity-70">{t('processing')}</label>
         <ToggleSwitch label={t('normalize')} icon={Maximize} value={config.normalize} onChange={(v) => update('normalize', v)} />
         <ToggleSwitch label={t('mirror')} icon={Split} value={config.mirror} onChange={(v) => update('mirror', v)} />
         <ToggleSwitch label={t('stroke')} icon={Square} value={config.strokeEnabled} onChange={(v) => update('strokeEnabled', v)} />
      </div>

      {/* Sliders Section */}
      <div className="pt-2 space-y-4">
        <label className="text-white font-mono text-xs block mb-2 tracking-widest uppercase opacity-70 border-b border-gray-800 pb-2">{t('fine_tuning')}</label>
        
        {/* Amplitude - First */}
        <div className="p-3 bg-gray-800/20 border-2 border-gray-600 rounded">
            <RangeControl 
                label={t('amplitude')} 
                value={config.sensitivity} 
                min={0.1} max={3.0} step={0.1} 
                onChange={(v) => update('sensitivity', v)} 
                className="mb-0"
            />
        </div>

        {/* Bar Count & Gap */}
        <div className="flex flex-col gap-4 p-3 bg-gray-800/20 border-2 border-gray-600 rounded">
            <RangeControl 
                label={t('bar_count')} 
                value={config.barCount} 
                min={16} max={512} step={16} 
                onChange={(v) => update('barCount', v)} 
                className="mb-0"
            />
            <RangeControl 
                label={t('bar_gap')} 
                value={config.barGap} 
                min={0} max={20} step={0.5} 
                onChange={(v) => update('barGap', v)} 
                className="mb-0"
            />
        </div>
        
        {/* Frequency Cutoffs */}
        <div className="flex flex-col gap-4 p-3 bg-gray-800/20 border-2 border-gray-600 rounded">
            <RangeControl 
                label={t('min_freq')} 
                value={config.minFrequency} 
                min={0} 
                max={99} 
                step={1} 
                onChange={(v) => {
                    if (v <= config.maxFrequency - 1) update('minFrequency', v);
                }} 
                className="mb-0"
            />
            <RangeControl 
                label={t('max_freq')} 
                value={config.maxFrequency} 
                min={1} 
                max={100} 
                step={1} 
                onChange={(v) => {
                    if (v >= config.minFrequency + 1) update('maxFrequency', v);
                }} 
                className="mb-0"
            />
        </div>

        {/* Opacity Group */}
        <div className="flex flex-col gap-4 p-3 bg-gray-800/20 border-2 border-gray-600 rounded">
            <RangeControl 
                label={t('fill_opacity')} 
                value={config.fillOpacity} 
                min={0} max={1} step={0.1} 
                onChange={(v) => update('fillOpacity', v)} 
                className="mb-0"
            />
            
            {config.strokeEnabled && (
              <RangeControl 
                  label={t('stroke_opacity')} 
                  value={config.strokeOpacity} 
                  min={0} max={1} step={0.1} 
                  onChange={(v) => update('strokeOpacity', v)} 
                  className="mb-0"
              />
            )}
        </div>
      </div>
    </div>
  );
}

export default VisualizerSettings;
