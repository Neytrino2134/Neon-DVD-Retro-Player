
import React, { useRef, useState } from 'react';
import { Layers, Palette, List, ChevronDown, ChevronUp, Timer, Trash2, Image as ImageIcon, Music, Download, FileArchive, Check, X } from 'lucide-react';
import { BackgroundMedia, PatternConfig } from '../../types';
import RangeControl from './RangeControl';
import { useLanguage } from '../../contexts/LanguageContext';
import { Tooltip } from '../ui/Tooltip';
import { REQUIRED_SFX_FILES } from '../../hooks/useSFX';

interface BackgroundSettingsProps {
  bgColor: string;
  setBgColor: (color: string) => void;
  bgPattern?: string;
  setBgPattern?: (pattern: string) => void;
  bgPatternConfig?: PatternConfig;
  setBgPatternConfig?: (config: PatternConfig) => void;
  onBgMediaUpload: (files: FileList) => void;
  onAudioUpload: (files: FileList) => void;
  onSfxUpload?: (file: File) => void;
  bgMedia: { type: 'image' | 'video', url: string } | null;
  bgList: BackgroundMedia[];
  currentBgIndex: number;
  onRemoveBg: (id: string) => void;
  onMoveBg: (index: number, dir: 'up' | 'down') => void;
  onSelectBg: (index: number) => void;
  onDeselectBg?: () => void;
  onClearBgMedia: () => void;
  onExportConfig: () => void;
  bgAutoplayInterval: number;
  setBgAutoplayInterval: (val: number) => void;
  sfxMap?: Record<string, string>;
}

const BG_PALETTE = [
  '#0f172a', '#000000', '#1a0505', '#051a05', '#05051a', '#1a051a',
  '#1a1a1a', '#2d1b2e', '#001a1a', '#2e2e2e'
];

const PATTERNS = [
  { id: 'none', label: 'NONE' },
  { id: 'grid', label: 'GRID' },
  { id: 'dots', label: 'DOTS' },
  { id: 'scan-v', label: 'SCAN V' },
  { id: 'scan-h', label: 'SCAN H' },
  { id: 'diag', label: 'DIAG' },
  { id: 'checker', label: 'CHECK' },
  { id: 'circuit', label: 'TECH' },
  { id: 'matrix', label: 'CODE' },
];

const BackgroundSettings: React.FC<BackgroundSettingsProps> = ({
  bgColor, setBgColor, bgPattern, setBgPattern, bgPatternConfig, setBgPatternConfig,
  onBgMediaUpload, onAudioUpload, onSfxUpload, bgMedia, bgList, currentBgIndex, onRemoveBg, onMoveBg, onSelectBg, onDeselectBg,
  onExportConfig, bgAutoplayInterval, setBgAutoplayInterval, sfxMap
}) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const sfxInputRef = useRef<HTMLInputElement>(null);
  
  const [showBgList, setShowBgList] = useState(false);
  const [showBgSettings, setShowBgSettings] = useState(false);

  const getSfxTooltipContent = () => {
    if (!sfxMap) return t('load_sfx_zip');

    // Check if any file in sfxMap starts with the required base name
    const missingFiles = REQUIRED_SFX_FILES.filter(requiredBase => {
        const found = Object.keys(sfxMap).some(uploadedFile => uploadedFile.startsWith(requiredBase));
        return !found;
    });

    const isComplete = missingFiles.length === 0 && Object.keys(sfxMap).length > 0;
    const isEmpty = Object.keys(sfxMap).length === 0;

    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
         <div className="flex items-center justify-between border-b border-gray-700 pb-1 mb-1">
             <span className="text-gray-400">STATUS:</span>
             <span className={`font-bold ${isComplete ? 'text-neon-green' : isEmpty ? 'text-gray-500' : 'text-yellow-500'}`}>
                {isComplete ? 'ACTIVE' : isEmpty ? 'EMPTY' : 'PARTIAL'}
             </span>
         </div>
         
         <div className="space-y-1">
            {REQUIRED_SFX_FILES.map(baseName => {
                const isFound = Object.keys(sfxMap).some(k => k.startsWith(baseName));
                return (
                    <div key={baseName} className="flex items-center gap-2 text-[9px]">
                        {isFound ? <Check size={10} className="text-neon-green" /> : <X size={10} className="text-red-500" />}
                        <span className={isFound ? 'text-gray-300' : 'text-gray-500 line-through'}>{baseName}</span>
                    </div>
                );
            })}
         </div>

         {!isComplete && (
             <div className="text-[9px] text-gray-500 mt-1 italic border-t border-gray-800 pt-1">
                 Required: wav/mp3/m4a with these names
             </div>
         )}
      </div>
    );
  };

  return (
    <div className="p-4 bg-gray-900 border-t border-gray-800 z-10 shrink-0 space-y-3">
      <div>
        <h3 className="flex items-center gap-2 text-xs font-mono text-white mb-2 opacity-80"><Layers size={14} className="text-neon-yellow" /> {t('background')}</h3>
        
        {/* Colors & Patterns Collapsible */}
        <div className="rounded border border-gray-700 bg-black/40 overflow-hidden mb-2">
            <button 
                onClick={() => setShowBgSettings(!showBgSettings)}
                className="w-full flex items-center justify-between p-2 text-xs font-mono text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Palette size={12} />
                    <span>COLORS & PATTERNS</span>
                </div>
                <ChevronDown size={12} className={`transition-transform duration-300 ${showBgSettings ? 'rotate-180' : ''}`} />
            </button>
            
            <div className={`transition-all duration-300 ease-in-out overflow-hidden px-2 ${showBgSettings ? 'max-h-[500px] py-2 border-t border-gray-800' : 'max-h-0'}`}>
              {/* Colors */}
              <div className="grid grid-cols-5 gap-1.5 mb-3">
                {BG_PALETTE.map(c => (
                  <button 
                    key={c} 
                    onClick={() => { 
                      setBgColor(c); 
                      // Do not clear media list, just deselect current media
                      if (onDeselectBg) onDeselectBg(); 
                    }} 
                    className={`h-6 rounded-sm border ${bgColor === c && !bgMedia ? 'border-neon-purple shadow-[0_0_10px_#bc13fe] scale-105' : 'border-gray-600 hover:border-gray-400'}`} 
                    style={{ backgroundColor: c }} 
                  />
                ))}
              </div>
              
              {/* Patterns */}
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {setBgPattern && PATTERNS.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => setBgPattern(p.id)}
                    className={`
                        px-1 py-1 text-[9px] font-mono border rounded-sm transition-all
                        ${bgPattern === p.id 
                            ? 'border-neon-blue bg-neon-blue/20 text-neon-blue shadow-[0_0_5px_rgba(0,243,255,0.4)]' 
                            : 'border-gray-700 bg-black/20 text-gray-400 hover:border-gray-500'}
                    `}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Pattern Intensity & Scale - Only show if pattern is not 'none' */}
              {bgPattern !== 'none' && bgPatternConfig && setBgPatternConfig && (
                 <div className="space-y-3 pt-2 border-t border-gray-800">
                    <RangeControl 
                      label={t('intensity')} 
                      value={bgPatternConfig.intensity} 
                      min={0} max={1} step={0.05} 
                      onChange={(v) => setBgPatternConfig({ ...bgPatternConfig, intensity: v })} 
                      className="mb-0"
                    />
                    <RangeControl 
                      label={t('scale')} 
                      value={bgPatternConfig.scale} 
                      min={0.1} max={5.0} step={0.1} 
                      onChange={(v) => setBgPatternConfig({ ...bgPatternConfig, scale: v })} 
                      className="mb-0"
                    />
                 </div>
              )}
            </div>
        </div>
        
        <div className="space-y-2">
          {/* Moved BG List Resource ABOVE Buttons */}
          {bgList.length > 0 && (
              <div className="rounded border border-gray-700 bg-black/40 overflow-hidden mb-2">
                  <button 
                      onClick={() => setShowBgList(!showBgList)}
                      className="w-full flex items-center justify-between p-2 text-xs font-mono text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                      <div className="flex items-center gap-2">
                          <List size={12} />
                          <span>BG RESOURCES [{bgList.length}]</span>
                      </div>
                      <ChevronDown size={12} className={`transition-transform duration-300 ${showBgList ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showBgList ? 'max-h-60' : 'max-h-0'}`}>
                      <div className="flex items-center justify-between px-3 py-2 border-t border-b border-gray-800 bg-gray-900/50">
                         <div className="flex items-center gap-2 text-gray-400">
                           <Timer size={12} />
                           <span className="text-[10px] font-mono tracking-wider">{t('auto_timer')}</span>
                         </div>
                         <div className="flex items-center gap-2 bg-black rounded border border-gray-700 px-1">
                            <button 
                              onClick={() => setBgAutoplayInterval(Math.max(0, bgAutoplayInterval - 1))}
                              className="p-0.5 hover:text-neon-blue transition-colors"
                            >
                              <ChevronDown size={14} />
                            </button>
                            <span className={`text-xs font-mono font-bold min-w-[20px] text-center ${bgAutoplayInterval > 0 ? 'text-neon-green' : 'text-gray-600'}`}>
                              {String(bgAutoplayInterval).padStart(2, '0')}
                            </span>
                            <button 
                              onClick={() => setBgAutoplayInterval(bgAutoplayInterval + 1)}
                              className="p-0.5 hover:text-neon-blue transition-colors"
                            >
                              <ChevronUp size={14} />
                            </button>
                         </div>
                      </div>

                      <div className="p-2 space-y-1 overflow-y-auto max-h-48 custom-scrollbar">
                          {bgList.map((bg, index) => (
                              <div 
                                  key={bg.id} 
                                  className={`
                                      flex items-center justify-between p-2 rounded text-xs border cursor-pointer group
                                      ${index === currentBgIndex 
                                          ? 'bg-gray-800 border-neon-blue text-neon-blue' 
                                          : 'bg-transparent border-transparent text-gray-400 hover:bg-gray-800/50 hover:text-white'}
                                  `}
                                  onClick={() => onSelectBg(index)}
                              >
                                  <div className="flex items-center gap-2 overflow-hidden">
                                      <div className={`w-1.5 h-1.5 rounded-full ${index === currentBgIndex ? 'bg-neon-blue shadow-[0_0_5px_#00f3ff]' : 'bg-gray-600'}`}></div>
                                      <span className="truncate max-w-[120px] font-mono">{bg.file.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                          onClick={(e) => { e.stopPropagation(); onMoveBg(index, 'up'); }} 
                                          disabled={index === 0}
                                          className="p-1 hover:text-neon-yellow disabled:opacity-30"
                                      >
                                          <ChevronUp size={12} />
                                      </button>
                                      <button 
                                          onClick={(e) => { e.stopPropagation(); onMoveBg(index, 'down'); }} 
                                          disabled={index === bgList.length - 1}
                                          className="p-1 hover:text-neon-yellow disabled:opacity-30"
                                      >
                                          <ChevronDown size={12} />
                                      </button>
                                      <button 
                                          onClick={(e) => { e.stopPropagation(); onRemoveBg(bg.id); }}
                                          className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                                      >
                                          <Trash2 size={12} />
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          <div className="flex gap-2">
              <Tooltip content="LOAD IMAGE/VIDEO" position="top">
                <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 p-2 bg-gray-800 border border-gray-600 rounded text-gray-300 hover:text-white hover:border-neon-yellow transition-colors min-w-0">
                    <ImageIcon size={16} className="text-neon-yellow shrink-0" /> <span className="font-mono text-[10px] md:text-xs truncate">IMG</span>
                </button>
              </Tooltip>
              
              <Tooltip content="LOAD AUDIO" position="top">
                <button onClick={() => audioInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 p-2 bg-gray-800 border border-gray-600 rounded text-gray-300 hover:text-white hover:border-neon-green transition-colors min-w-0">
                    <Music size={16} className="text-neon-green shrink-0" /> <span className="font-mono text-[10px] md:text-xs truncate">AUDIO</span>
                </button>
              </Tooltip>
              
              {onSfxUpload && (
                <Tooltip content={getSfxTooltipContent()} position="top">
                  <button onClick={() => sfxInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 p-2 bg-gray-800 border border-gray-600 rounded text-gray-300 hover:text-white hover:border-neon-pink transition-colors min-w-0">
                      <FileArchive size={16} className="text-neon-pink shrink-0" /> <span className="font-mono text-[10px] md:text-xs truncate">SFX</span>
                  </button>
                </Tooltip>
              )}

              <Tooltip content={t('export_config')} position="top">
                <button onClick={onExportConfig} className="shrink-0 w-10 flex items-center justify-center p-2 bg-gray-800 border border-neon-purple text-neon-purple rounded hover:bg-neon-purple hover:text-black hover:shadow-[0_0_15px_#bc13fe] transition-all active:scale-95">
                  <Download size={16} />
                </button>
              </Tooltip>
          </div>
          
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={e => {
              if(e.target.files && e.target.files.length > 0) {
                  onBgMediaUpload(e.target.files);
                  e.target.value = '';
              }
          }} 
          accept="image/*,video/*" 
          multiple
          className="hidden" 
        />
        <input 
          type="file" 
          ref={audioInputRef} 
          onChange={e => {
              if(e.target.files && e.target.files.length > 0) {
                  onAudioUpload(e.target.files);
                  e.target.value = '';
              }
          }} 
          accept="audio/*" 
          multiple
          className="hidden" 
        />
        <input 
          type="file" 
          ref={sfxInputRef} 
          onChange={e => {
              if(e.target.files && e.target.files.length > 0 && onSfxUpload) {
                  onSfxUpload(e.target.files[0]);
                  e.target.value = '';
              }
          }} 
          accept=".zip" 
          className="hidden" 
        />
      </div>
    </div>
  );
};

export default BackgroundSettings;
