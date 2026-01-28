
import React, { useState } from 'react';
import { List, ChevronDown, ChevronUp, Timer, Trash2 } from 'lucide-react';
import { BackgroundMedia, PatternConfig, BgTransitionType } from '../../types';
import RangeControl from './RangeControl';
import CustomSelect from './CustomSelect';
import { useLanguage } from '../../contexts/LanguageContext';

interface BackgroundSettingsProps {
  bgColor: string;
  setBgColor: (color: string) => void;
  bgPattern?: string;
  setBgPattern?: (pattern: string) => void;
  bgPatternConfig?: PatternConfig;
  setBgPatternConfig?: (config: PatternConfig) => void;
  bgMedia: { type: 'image' | 'video', url: string } | null;
  bgList: BackgroundMedia[];
  currentBgIndex: number;
  onRemoveBg: (id: string) => void;
  onMoveBg: (index: number, dir: 'up' | 'down') => void;
  onSelectBg: (index: number) => void;
  onDeselectBg?: () => void;
  onClearBgMedia: () => void;
  bgAutoplayInterval: number;
  setBgAutoplayInterval: (val: number) => void;
  bgTransition: BgTransitionType; 
  setBgTransition: (t: BgTransitionType) => void; 
}

const BG_PALETTE = [
  '#0f172a', '#000000', '#030712', '#020617', '#1c1917', '#050A10',
  '#1a0505', '#051a05', '#05051a', '#1a051a', '#2d1b2e', '#001a1a',
  '#171717', '#2e2e2e', '#11001c', '#001510', '#1a1005', '#202020'
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
  bgMedia, bgList, currentBgIndex, onRemoveBg, onMoveBg, onSelectBg, onDeselectBg,
  bgAutoplayInterval, setBgAutoplayInterval,
  bgTransition, setBgTransition
}) => {
  const { t } = useLanguage();
  
  // State for internal collapsible list
  const [showBgList, setShowBgList] = useState(false);

  const transitionOptions = [
      { value: 'glitch', label: t('trans_glitch') },
      { value: 'leaks', label: t('trans_leaks') },
      { value: 'none', label: t('trans_none') }
  ];

  return (
    <div className="pt-2 space-y-4">
      
      {/* 2. Controls */}
      <CustomSelect 
          label={t('transition_type')}
          value={bgTransition}
          options={transitionOptions}
          onChange={(v) => setBgTransition(v as BgTransitionType)}
      />

      {/* Colors */}
      <div>
          <label className="text-theme-text font-mono text-[10px] block mb-2 tracking-widest uppercase opacity-70">PALETTE</label>
          <div className="grid grid-cols-6 gap-1.5 mb-3">
              {BG_PALETTE.map(c => (
              <button 
                  key={c} 
                  onClick={() => { 
                  setBgColor(c); 
                  if (onDeselectBg) onDeselectBg(); 
                  }} 
                  className={`h-6 rounded-sm border ${bgColor === c && !bgMedia ? 'border-theme-secondary shadow-[0_0_10px_var(--color-secondary)] scale-105' : 'border-gray-600 hover:border-theme-primary'}`} 
                  style={{ backgroundColor: c }} 
              />
              ))}
          </div>
      </div>
      
      {/* Patterns */}
      <div>
          <label className="text-theme-text font-mono text-[10px] block mb-2 tracking-widest uppercase opacity-70">OVERLAY PATTERN</label>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
              {setBgPattern && PATTERNS.map(p => (
              <button 
                  key={p.id}
                  onClick={() => setBgPattern(p.id)}
                  className={`
                      px-1 py-1 text-[9px] font-mono border rounded-sm transition-all
                      ${bgPattern === p.id 
                          ? 'border-theme-primary bg-theme-primary/20 text-theme-primary shadow-[0_0_5px_var(--color-primary)]' 
                          : 'border-theme-border bg-black/20 text-theme-muted hover:border-theme-primary hover:text-theme-text'}
                  `}
              >
                  {p.label}
              </button>
              ))}
          </div>
      </div>

      {/* Pattern Intensity & Scale */}
      {bgPattern !== 'none' && bgPatternConfig && setBgPatternConfig && (
          <div className="space-y-3 pt-2 border-t border-theme-border/50">
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

      {/* BG List Resource (Collapsible) */}
      {bgList.length > 0 && (
          <div className="rounded bg-theme-panel/40 overflow-hidden mt-4 transition-all duration-300 border border-theme-border hover:border-theme-primary hover:shadow-[0_0_5px_var(--color-primary)]">
              <button 
                  onClick={() => setShowBgList(!showBgList)}
                  className="w-full flex items-center justify-between p-2 text-xs font-mono text-theme-muted hover:text-theme-text hover:bg-theme-panel transition-colors"
              >
                  <div className="flex items-center gap-2">
                      <List size={12} />
                      <span>BG RESOURCES [{bgList.length}]</span>
                  </div>
                  <ChevronDown size={12} className={`transition-transform duration-300 ${showBgList ? 'rotate-180' : ''}`} />
              </button>
              
              <div 
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out
                    ${showBgList ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}
                `}
              >
                  <div className="overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-t border-b border-theme-border bg-theme-panel/50">
                        <div className="flex items-center gap-2 text-theme-muted">
                        <Timer size={12} />
                        <span className="text-[10px] font-mono tracking-wider">{t('auto_timer')}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-black rounded border border-theme-border px-1">
                            <button 
                            onClick={() => setBgAutoplayInterval(Math.max(0, bgAutoplayInterval - 1))}
                            className="p-0.5 hover:text-theme-primary transition-colors"
                            >
                            <ChevronDown size={14} />
                            </button>
                            <span className={`text-xs font-mono font-bold min-w-[20px] text-center ${bgAutoplayInterval > 0 ? 'text-theme-accent' : 'text-theme-muted'}`}>
                            {String(bgAutoplayInterval).padStart(2, '0')}
                            </span>
                            <button 
                            onClick={() => setBgAutoplayInterval(bgAutoplayInterval + 1)}
                            className="p-0.5 hover:text-theme-primary transition-colors"
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
                                        ? 'bg-theme-panel border-theme-primary text-theme-primary' 
                                        : 'bg-transparent border-transparent text-theme-muted hover:bg-theme-panel/50 hover:text-theme-text'}
                                `}
                                onClick={() => onSelectBg(index)}
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className={`w-1.5 h-1.5 rounded-full ${index === currentBgIndex ? 'bg-theme-primary shadow-[0_0_5px_var(--color-primary)]' : 'bg-gray-600'}`}></div>
                                    <span className="truncate max-w-[120px] font-mono">{bg.file.name}</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onMoveBg(index, 'up'); }} 
                                        disabled={index === 0}
                                        className="p-1 hover:text-theme-accent disabled:opacity-30"
                                    >
                                        <ChevronUp size={12} />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onMoveBg(index, 'down'); }} 
                                        disabled={index === bgList.length - 1}
                                        className="p-1 hover:text-theme-accent disabled:opacity-30"
                                    >
                                        <ChevronDown size={12} />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onRemoveBg(bg.id); }}
                                        className="p-1 text-theme-muted hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default BackgroundSettings;
