import React, { useRef } from 'react';
import { Settings, Eye, Disc, Image as ImageIcon, Trash2, Activity, Sliders, Layers } from 'lucide-react';
import { VisualizerConfig, VisualizerStyle, VisualizerPosition } from '../types';

interface SettingsPanelProps {
  showVisualizer: boolean;
  setShowVisualizer: (v: boolean) => void;
  showDvd: boolean;
  setShowDvd: (v: boolean) => void;
  visualizerConfig: VisualizerConfig;
  setVisualizerConfig: (config: VisualizerConfig) => void;
  bgColor: string;
  setBgColor: (color: string) => void;
  onBgMediaUpload: (file: File) => void;
  bgMedia: { type: 'image' | 'video', url: string } | null;
  onClearBgMedia: () => void;
}

const BG_PALETTE = [
  '#0f172a', // Slate 900
  '#000000', // Pitch Black
  '#1a0505', // Dark Red
  '#051a05', // Dark Green
  '#05051a', // Dark Blue
  '#1a051a', // Dark Purple
];

const ToggleSwitch = ({ label, icon: Icon, value, onChange }: { label: string, icon: any, value: boolean, onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded mb-4 hover:border-gray-500 transition-colors">
    <div className="flex items-center gap-2 text-neon-yellow">
      <Icon size={18} />
      <span className="font-mono text-sm tracking-wider">{label}</span>
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 shadow-inner
        ${value ? 'bg-neon-green shadow-[0_0_10px_#00ff00]' : 'bg-gray-700'}
      `}
    >
      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300
        ${value ? 'translate-x-6' : 'translate-x-0'}
      `}></div>
    </button>
  </div>
);

const RangeControl = ({ label, value, min, max, step, onChange }: { label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void }) => (
  <div className="mb-4">
    <div className="flex justify-between text-gray-400 font-mono text-xs mb-1">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <input 
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
    />
  </div>
);

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  showVisualizer,
  setShowVisualizer,
  showDvd,
  setShowDvd,
  visualizerConfig,
  setVisualizerConfig,
  bgColor,
  setBgColor,
  onBgMediaUpload,
  bgMedia,
  onClearBgMedia
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onBgMediaUpload(e.target.files[0]);
    }
  };

  const updateConfig = (key: keyof VisualizerConfig, value: any) => {
    setVisualizerConfig({ ...visualizerConfig, [key]: value });
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 border-r-4 border-gray-800 p-4 shadow-inner">
      <div className="mb-6 flex items-center gap-2 text-neon-yellow border-b border-gray-700 pb-2">
        <Settings className="animate-spin-slow" />
        <h2 className="text-xl font-mono shadow-neon-yellow">SYSTEM</h2>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {/* Modules Toggles */}
        <div className="mb-6">
          <h3 className="text-xs font-mono text-gray-500 mb-2">MODULES</h3>
          <ToggleSwitch label="WAVEFORM" icon={Eye} value={showVisualizer} onChange={setShowVisualizer} />
          <ToggleSwitch label="DVD SAVER" icon={Disc} value={showDvd} onChange={setShowDvd} />
        </div>

        {/* Visualizer Configuration */}
        {showVisualizer && (
          <div className="mb-6 p-3 bg-gray-800/50 rounded border border-gray-700">
            <h3 className="flex items-center gap-2 text-xs font-mono text-neon-blue mb-4">
              <Activity size={14} /> WAVEFORM CONFIG
            </h3>

            {/* Position */}
            <div className="mb-3">
               <label className="text-gray-400 font-mono text-xs block mb-1">POSITION</label>
               <div className="grid grid-cols-3 gap-1">
                  {(['top', 'center', 'bottom'] as VisualizerPosition[]).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => updateConfig('position', pos)}
                      className={`px-2 py-1 text-xs font-mono border rounded capitalize ${
                        visualizerConfig.position === pos 
                        ? 'border-neon-blue text-neon-blue bg-neon-blue/10' 
                        : 'border-gray-600 text-gray-500 hover:text-white'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
               </div>
            </div>

            {/* Style */}
            <div className="mb-4">
               <label className="text-gray-400 font-mono text-xs block mb-1">STYLE</label>
               <select 
                  value={visualizerConfig.style}
                  onChange={(e) => updateConfig('style', e.target.value)}
                  className="w-full bg-black border border-gray-600 text-white font-mono text-xs p-2 rounded outline-none focus:border-neon-pink"
               >
                 <option value="retro">RETRO (MULTI)</option>
                 <option value="blue">NEON BLUE</option>
                 <option value="pink">NEON PINK</option>
                 <option value="matrix">MATRIX</option>
                 <option value="inferno">INFERNO</option>
               </select>
            </div>

            {/* Bar Density - Using Select to ensure Power of 2 */}
            <div className="mb-4">
               <label className="text-gray-400 font-mono text-xs block mb-1">BAR DENSITY</label>
               <select 
                  value={visualizerConfig.barCount}
                  onChange={(e) => updateConfig('barCount', parseInt(e.target.value))}
                  className="w-full bg-black border border-gray-600 text-white font-mono text-xs p-2 rounded outline-none focus:border-neon-pink"
               >
                 <option value="32">LOW (32)</option>
                 <option value="64">MEDIUM (64)</option>
                 <option value="128">HIGH (128)</option>
                 <option value="256">ULTRA (256)</option>
                 <option value="512">EXTREME (512)</option>
               </select>
            </div>

            {/* Sliders */}
            <RangeControl 
              label="AMPLITUDE" 
              value={visualizerConfig.sensitivity} 
              min={0.1} max={3.0} step={0.1} 
              onChange={(v) => updateConfig('sensitivity', v)} 
            />

            <RangeControl 
              label="FILL OPACITY" 
              value={visualizerConfig.fillOpacity} 
              min={0} max={1} step={0.1} 
              onChange={(v) => updateConfig('fillOpacity', v)} 
            />

            {/* Stroke Controls */}
            <div className="pt-2 border-t border-gray-700 mt-2">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 font-mono text-xs">OUTLINE</span>
                    <button 
                       onClick={() => updateConfig('strokeEnabled', !visualizerConfig.strokeEnabled)}
                       className={`w-8 h-4 rounded-full relative transition-colors ${visualizerConfig.strokeEnabled ? 'bg-neon-pink' : 'bg-gray-600'}`}
                    >
                       <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${visualizerConfig.strokeEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </button>
                </div>
                {visualizerConfig.strokeEnabled && (
                  <RangeControl 
                    label="OUTLINE OPACITY" 
                    value={visualizerConfig.strokeOpacity} 
                    min={0} max={1} step={0.1} 
                    onChange={(v) => updateConfig('strokeOpacity', v)} 
                  />
                )}
            </div>
          </div>
        )}

        {/* Background Settings */}
        <div className="mb-6">
          <h3 className="flex items-center gap-2 text-xs font-mono text-gray-500 mb-2">
             <Layers size={14} /> BACKGROUND
          </h3>
          
          {/* Color Palette */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {BG_PALETTE.map((color) => (
              <button
                key={color}
                onClick={() => {
                   setBgColor(color);
                   onClearBgMedia();
                }}
                className={`h-8 rounded border-2 transition-all ${
                  bgColor === color && !bgMedia
                    ? 'border-neon-blue shadow-[0_0_10px_#00f3ff] scale-105' 
                    : 'border-gray-600 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {/* Media Upload */}
          <div className="space-y-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 p-2 bg-gray-800 border border-gray-600 rounded text-gray-300 hover:text-white hover:border-neon-purple hover:bg-gray-700 transition-colors"
            >
              <ImageIcon size={16} />
              <span className="font-mono text-xs">LOAD IMG/VIDEO</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,video/*"
              className="hidden"
              style={{ display: 'none' }}
            />

            {bgMedia && (
              <button
                onClick={onClearBgMedia}
                className="w-full flex items-center justify-center gap-2 p-2 bg-red-900/30 border border-red-800 rounded text-red-400 hover:text-red-200 hover:border-red-500 transition-colors"
              >
                <Trash2 size={16} />
                <span className="font-mono text-xs">RESET TO COLOR</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto opacity-50 text-xs font-mono text-center text-gray-500 pt-4 border-t border-gray-800">
        VER 1.2.0<br/>
        RETRO-OS
      </div>
    </div>
  );
};

export default SettingsPanel;