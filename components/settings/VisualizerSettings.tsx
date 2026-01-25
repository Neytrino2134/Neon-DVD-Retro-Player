
import React, { useState } from 'react';
import { Maximize, Split, Square, Minus, Grid, ChevronDown } from 'lucide-react';
import { VisualizerConfig, VisualizerPosition } from '../../types';
import RangeControl from './RangeControl';
import ToggleSwitch from './ToggleSwitch';
import CustomSelect from './CustomSelect';
import { useLanguage } from '../../contexts/LanguageContext';

interface VisualizerSettingsProps {
  config: VisualizerConfig;
  update: (key: keyof VisualizerConfig, value: any) => void;
}

const VisualizerSettings: React.FC<VisualizerSettingsProps> = ({ config, update }) => {
  const { t } = useLanguage();
  const [expandSegmented, setExpandSegmented] = useState(true);
  const [expandTips, setExpandTips] = useState(true);

  const styleOptions = [
    { value: 'retro', label: t('style_retro') },
    { value: 'blue', label: t('style_blue') },
    { value: 'pink', label: t('style_pink') },
    { value: 'matrix', label: t('style_matrix') },
    { value: 'inferno', label: t('style_inferno') },
  ];

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
         <CustomSelect 
            label={t('visual_style')} 
            value={config.style} 
            options={styleOptions} 
            onChange={(v) => update('style', v)} 
         />
      </div>

      {/* Toggles Section */}
      <div className="space-y-3">
         <label className="text-white font-mono text-xs block mb-2 tracking-widest uppercase opacity-70">{t('processing')}</label>
         
         {/* Segmented Bars - Custom Collapsible */}
         <div className="bg-gray-800/20 border border-gray-700/50 rounded overflow-hidden mb-2 hover:border-gray-600 transition-colors">
             <div className="flex items-center justify-between p-3">
                <div 
                   className="flex items-center gap-3 cursor-pointer flex-1"
                   onClick={() => setExpandSegmented(!expandSegmented)}
                >
                    <div className="text-neon-yellow opacity-80">
                        <Grid size={16} />
                    </div>
                    <span className="font-mono text-[11px] tracking-widest text-white uppercase">{t('visual_segmented')}</span>
                    {config.segmented && (
                        <ChevronDown size={14} className={`text-neon-blue opacity-70 transition-transform ${expandSegmented ? 'rotate-180' : ''}`} />
                    )}
                </div>
                <button
                    onClick={() => update('segmented', !config.segmented)}
                    className={`relative w-10 h-5 rounded-full transition-all duration-300 shadow-inner ml-2
                    ${config.segmented ? 'bg-neon-purple shadow-[0_0_8px_rgba(188,19,254,0.5)]' : 'bg-gray-700'}
                    `}
                >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300
                    ${config.segmented ? 'translate-x-5' : 'translate-x-0'}
                    `}></div>
                </button>
             </div>
             
             {/* Collapsible Segment Settings */}
             <div className={`transition-[max-height,opacity,padding] duration-300 ease-in-out overflow-hidden ${config.segmented && expandSegmented ? 'max-h-80 opacity-100 p-3 pt-0' : 'max-h-0 opacity-0 p-0'}`}>
                <div className="pl-8 pt-2 space-y-3 border-l-2 border-neon-purple/30 ml-2">
                    <RangeControl 
                        label={t('seg_height')} 
                        value={config.segmentHeight || 4} 
                        min={2} max={30} step={1} 
                        onChange={(v) => update('segmentHeight', v)} 
                        className="mb-0"
                    />
                    <RangeControl 
                        label={t('seg_gap')} 
                        value={config.segmentGap || 2} 
                        min={0} max={10} step={1} 
                        onChange={(v) => update('segmentGap', v)} 
                        className="mb-0"
                    />
                </div>
             </div>
         </div>

         {/* Show Tips - Custom Collapsible */}
         <div className="bg-gray-800/20 border border-gray-700/50 rounded overflow-hidden mb-2 hover:border-gray-600 transition-colors">
             <div className="flex items-center justify-between p-3">
                <div 
                   className="flex items-center gap-3 cursor-pointer flex-1"
                   onClick={() => setExpandTips(!expandTips)}
                >
                    <div className="text-neon-yellow opacity-80">
                        <Minus size={16} />
                    </div>
                    <span className="font-mono text-[11px] tracking-widest text-white uppercase">{t('visual_tips')}</span>
                    {config.showTips && (
                        <ChevronDown size={14} className={`text-neon-blue opacity-70 transition-transform ${expandTips ? 'rotate-180' : ''}`} />
                    )}
                </div>
                <button
                    onClick={() => update('showTips', !config.showTips)}
                    className={`relative w-10 h-5 rounded-full transition-all duration-300 shadow-inner ml-2
                    ${config.showTips ? 'bg-neon-purple shadow-[0_0_8px_rgba(188,19,254,0.5)]' : 'bg-gray-700'}
                    `}
                >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300
                    ${config.showTips ? 'translate-x-5' : 'translate-x-0'}
                    `}></div>
                </button>
             </div>

             {/* Collapsible Tip Settings */}
             <div className={`transition-[max-height,opacity,padding] duration-300 ease-in-out overflow-hidden ${config.showTips && expandTips ? 'max-h-80 opacity-100 p-3 pt-0' : 'max-h-0 opacity-0 p-0'}`}>
                <div className="pl-8 pt-2 space-y-3 border-l-2 border-neon-purple/30 ml-2">
                    <RangeControl 
                        label={t('tip_height')} 
                        value={config.tipHeight || 2} 
                        min={1} max={20} step={1} 
                        onChange={(v) => update('tipHeight', v)} 
                        className="mb-0"
                    />
                    <RangeControl 
                        label={t('tip_speed')} 
                        value={config.tipSpeed || 15} 
                        min={1} max={50} step={1} 
                        onChange={(v) => update('tipSpeed', v)} 
                        className="mb-0"
                    />
                </div>
             </div>
         </div>

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
                min={8} max={512} step={8} 
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
