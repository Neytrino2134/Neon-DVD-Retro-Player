
import React, { useRef, useState, useEffect } from 'react';
import RangeControl from '../RangeControl';
import CustomSelect from '../CustomSelect';
import ToggleSwitch from '../ToggleSwitch';
import { useLanguage } from '../../../contexts/LanguageContext';
import { DvdConfig, EffectsConfig, VideoColorConfig } from '../../../types';
import { Volume2, Power, Play, Timer, Upload, Film, Trash2, Check } from 'lucide-react';
import { saveDvdLogo, getAllDvdLogos, deleteDvdLogo } from '../../../lib/db';

const FPS_OPTIONS = [
  { value: 60, label: '60 FPS (OFF)' },
  { value: 30, label: '30 FPS' },
  { value: 25, label: '25 FPS (PAL)' },
  { value: 24, label: '24 FPS (CINEMA)' },
  { value: 12, label: '12 FPS (RETRO)' },
];

const PRESET_LOOKS: Record<string, Partial<VideoColorConfig>> = {
    'none': { brightness: 1, contrast: 1, saturation: 1, grayscale: 0, sepia: 0, hueRotate: 0, warmth: 0 },
    'noir': { brightness: 1.1, contrast: 1.4, saturation: 0, grayscale: 1, sepia: 0, hueRotate: 0, warmth: -0.1 },
    'vintage': { brightness: 0.9, contrast: 0.9, saturation: 0.6, grayscale: 0, sepia: 0.6, hueRotate: 0, warmth: 0.2 },
    'cyber': { brightness: 1.1, contrast: 1.2, saturation: 1.5, grayscale: 0, sepia: 0, hueRotate: 20, warmth: -0.2 },
    'matrix': { brightness: 1.0, contrast: 1.2, saturation: 0.8, grayscale: 0, sepia: 0, hueRotate: 90, warmth: 0 },
    'washed': { brightness: 1.2, contrast: 0.8, saturation: 0.5, grayscale: 0, sepia: 0.2, hueRotate: 0, warmth: 0.1 },
    'cinematic': { brightness: 0.95, contrast: 1.1, saturation: 1.2, grayscale: 0, sepia: 0, hueRotate: 0, warmth: -0.1 }, // Teal/Orange-ish
    'vcr': { brightness: 1.1, contrast: 0.9, saturation: 1.8, grayscale: 0, sepia: 0.1, hueRotate: -10, warmth: 0 },
};

interface MixerSettingsProps {
    crossfadeDuration: number;
    setCrossfadeDuration: (v: number) => void;
    sfxVolume: number;
    setSfxVolume: (v: number) => void;
    smoothStart: boolean;
    setSmoothStart: (v: boolean) => void;
}

export const MixerSettings: React.FC<MixerSettingsProps> = ({ crossfadeDuration, setCrossfadeDuration, sfxVolume, setSfxVolume, smoothStart, setSmoothStart }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2 space-y-3">
            <div className="p-3 bg-theme-panel/50 border border-theme-border rounded">
                <RangeControl 
                    label={t('crossfade_duration')} 
                    value={crossfadeDuration} 
                    min={0} max={15} step={0.5} 
                    onChange={setCrossfadeDuration} 
                    className="mb-0"
                />
                <div className="mt-2 text-[10px] text-gray-500 font-mono flex items-start gap-1">
                    <div className="text-neon-blue">*</div>
                    <span>{t('constant_power_hint')}</span>
                </div>
            </div>

            <div className="p-3 bg-theme-panel/50 border border-theme-border rounded">
                <div className="mb-4">
                    <ToggleSwitch 
                        label={t('smooth_start')} 
                        icon={Play} 
                        value={smoothStart} 
                        onChange={setSmoothStart} 
                        color="green"
                    />
                </div>
                <RangeControl 
                    label={t('sfx_volume')} 
                    value={sfxVolume} 
                    min={0} max={1} step={0.05} 
                    onChange={setSfxVolume} 
                    className="mb-0"
                />
            </div>
        </div>
    );
};

interface StoredLogo {
    id: string;
    name: string;
    url: string;
}

export const DvdSettings: React.FC<{ config: DvdConfig, update: (k: keyof DvdConfig | Partial<DvdConfig>, v?: any) => void }> = ({ config, update }) => {
    const { t } = useLanguage();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [savedLogos, setSavedLogos] = useState<StoredLogo[]>([]);

    useEffect(() => {
        const load = async () => {
            const stored = await getAllDvdLogos();
            setSavedLogos(stored.map(s => ({ ...s, url: URL.createObjectURL(s.file) })));
        };
        load();
    }, []);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const id = crypto.randomUUID();
            
            // Save to DB
            await saveDvdLogo({ id, name: file.name, file });
            
            // Update Local State
            const url = URL.createObjectURL(file);
            const newLogo: StoredLogo = { id, name: file.name, url };
            setSavedLogos(prev => [...prev, newLogo]);

            // Update Config
            update({ 
                customLogoUrl: url, 
                logoType: 'custom',
                activeDvdLogoId: id
            });
            
            e.target.value = '';
        }
    };

    const handleSelectLogo = (logo: StoredLogo) => {
        update({ 
            customLogoUrl: logo.url, 
            logoType: 'custom',
            activeDvdLogoId: logo.id
        });
    };

    const handleDeleteLogo = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await deleteDvdLogo(id);
        
        // Cleanup URL
        const logo = savedLogos.find(l => l.id === id);
        if (logo) URL.revokeObjectURL(logo.url);

        setSavedLogos(prev => prev.filter(l => l.id !== id));
        
        // If deleted currently selected, reset? Or keep as is in memory until refresh.
        // Let's reset to neon waves if active one is deleted.
        if (config.activeDvdLogoId === id) {
            update({ logoType: 'neon_waves', activeDvdLogoId: undefined });
        }
    };

    return (
        <div className="pt-2">
            <div className="mb-4">
                <ToggleSwitch 
                    label={t('sfx_enabled')} 
                    icon={Volume2} 
                    value={config.enableSfx} 
                    onChange={(v) => update('enableSfx', v)} 
                    color="blue"
                />
            </div>
            
            <CustomSelect 
              label={t('dvd_logo_type')}
              value={config.logoType || 'dvd'}
              options={[
                { value: 'dvd', label: t('logo_dvd') },
                { value: 'neon_waves', label: t('logo_neon') },
                { value: 'custom', label: t('logo_custom') }
              ]}
              onChange={v => update('logoType', v)}
           />

           {config.logoType === 'custom' && (
               <div className="mb-6 space-y-3">
                   <button 
                       onClick={() => fileInputRef.current?.click()}
                       className="w-full py-2 bg-theme-panel border border-theme-border rounded text-theme-muted hover:text-theme-text hover:border-theme-accent transition-all flex items-center justify-center gap-2 group text-xs font-mono"
                   >
                       <Upload size={14} className="text-theme-accent group-hover:scale-110 transition-transform" />
                       <span>{t('upload_logo')}</span>
                   </button>
                   <input 
                       type="file" 
                       ref={fileInputRef} 
                       onChange={handleUpload} 
                       accept="image/png, image/svg+xml" 
                       className="hidden" 
                   />
                   
                   {/* Saved Logos Grid */}
                   {savedLogos.length > 0 && (
                       <div className="grid grid-cols-4 gap-2 bg-black/20 p-2 rounded border border-theme-border max-h-32 overflow-y-auto custom-scrollbar">
                           {savedLogos.map(logo => (
                               <div 
                                   key={logo.id} 
                                   onClick={() => handleSelectLogo(logo)}
                                   className={`relative aspect-square rounded border cursor-pointer overflow-hidden group
                                       ${config.activeDvdLogoId === logo.id 
                                           ? 'border-theme-primary ring-1 ring-theme-primary' 
                                           : 'border-transparent hover:border-theme-muted'}
                                   `}
                               >
                                   <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-1">
                                       <img src={logo.url} alt="logo" className="max-w-full max-h-full object-contain" />
                                   </div>
                                   
                                   {/* Delete Button */}
                                   <button 
                                       onClick={(e) => handleDeleteLogo(logo.id, e)}
                                       className="absolute top-0 right-0 p-1 bg-black/80 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all rounded-bl"
                                   >
                                       <Trash2 size={10} />
                                   </button>
                                   
                                   {config.activeDvdLogoId === logo.id && (
                                       <div className="absolute bottom-0 right-0 p-0.5 bg-theme-primary text-black rounded-tl">
                                           <Check size={8} />
                                       </div>
                                   )}
                               </div>
                           ))}
                       </div>
                   )}
               </div>
           )}

            <RangeControl label={t('size')} value={config.size} min={60} max={300} step={10} onChange={v => update('size', v)} />
            <RangeControl label={t('speed')} value={config.speed} min={1} max={15} step={1} onChange={v => update('speed', v)} />
            <RangeControl label={t('opacity')} value={config.opacity} min={0} max={1} step={0.1} onChange={v => update('opacity', v)} />
        </div>
    );
};

export const DebugSettings: React.FC<{ config: EffectsConfig['debugConsole'], update: (v: EffectsConfig['debugConsole']) => void }> = ({ config, update }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2">
           <div className="mb-4">
             <ToggleSwitch 
                label={t('debug_console')} 
                icon={Power} 
                value={config.enabled} 
                onChange={(v) => update({ ...config, enabled: v })} 
             />
           </div>
           <RangeControl label={t('opacity')} value={config.opacity} min={0.1} max={1} step={0.1} onChange={v => update({ ...config, opacity: v })} />
           <RangeControl label={t('scale')} value={config.scale} min={0.5} max={1.5} step={0.1} onChange={v => update({ ...config, scale: v })} />
        </div>
    );
};

export const ScanlineSettings: React.FC<{ config: EffectsConfig, update: (k: keyof EffectsConfig, v: any) => void }> = ({ config, update }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2">
          <RangeControl label={t('intensity')} value={config.scanlineIntensity} min={0} max={0.8} step={0.05} onChange={v => update('scanlineIntensity', v)} />
          <RangeControl label={t('thickness')} value={config.scanlineThickness} min={2} max={16} step={1} onChange={v => update('scanlineThickness', v)} />
        </div>
    );
};

export const CyberSettings: React.FC<{ config: EffectsConfig['cyberHack'], update: (v: EffectsConfig['cyberHack']) => void }> = ({ config, update }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2">
           <RangeControl label={t('print_speed')} value={config.speed} min={1} max={10} step={1} onChange={v => update({ ...config, speed: v })} />
           <RangeControl label={t('scale')} value={config.scale} min={0.5} max={3.0} step={0.1} onChange={v => update({ ...config, scale: v })} />
           <RangeControl label={t('bg_opacity')} value={config.backgroundOpacity} min={0} max={1} step={0.05} onChange={v => update({ ...config, backgroundOpacity: v })} />
        </div>
    );
};

export const GlitchSettings: React.FC<{ config: EffectsConfig['glitch'], update: (v: EffectsConfig['glitch']) => void }> = ({ config, update }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2">
           <CustomSelect 
              label={t('glitch_variant')}
              value={config.variant}
              options={[
                { value: 'v1', label: t('variant_v1') },
                { value: 'v2', label: t('variant_v2') }
              ]}
              onChange={v => update({ ...config, variant: v })}
           />
           <RangeControl label={t('intensity')} value={config.intensity} min={0.05} max={1.0} step={0.05} onChange={v => update({ ...config, intensity: v })} />
           <RangeControl label={t('speed')} value={config.speed} min={0.05} max={1.0} step={0.05} onChange={v => update({ ...config, speed: v })} />
           <RangeControl label={t('opacity')} value={config.opacity ?? 1.0} min={0} max={1} step={0.05} onChange={v => update({ ...config, opacity: v })} />
        </div>
    );
};

// New FPS Settings Component
export const FpsSettings: React.FC<{ config: EffectsConfig, update: (k: keyof EffectsConfig, v: any) => void }> = ({ config, update }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2">
            <div className="mb-4">
                <ToggleSwitch 
                    label={t('show_fps')} 
                    icon={Timer} 
                    value={config.showFps} 
                    onChange={(v) => update('showFps', v)} 
                    color="green"
                />
            </div>
            <CustomSelect 
              label={t('fps_limit')} 
              value={config.fps} 
              options={FPS_OPTIONS} 
              onChange={(v) => update('fps', v)} 
            />
        </div>
    );
};

// Updated SignalSettings (Removed FPS)
export const SignalSettings: React.FC<{ config: EffectsConfig, update: (k: keyof EffectsConfig, v: any) => void }> = ({ config, update }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2">
            <RangeControl label={t('pixelation')} value={config.pixelation} min={1} max={20} step={1} onChange={v => update('pixelation', v)} />
            <RangeControl label={t('static_noise')} value={config.noise} min={0} max={0.5} step={0.01} onChange={v => update('noise', v)} />
            <RangeControl label={t('vhs_jitter')} value={config.vhsJitter} min={0} max={10} step={0.5} onChange={v => update('vhsJitter', v)} />
        </div>
    );
};

export const ChromaticSettings: React.FC<{ config: EffectsConfig, update: (k: keyof EffectsConfig, v: any) => void }> = ({ config, update }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2">
            <RangeControl label={t('chromatic_aberration')} value={config.chromaticAberration ?? 0} min={0} max={20} step={0.5} onChange={v => update('chromaticAberration', v)} />
        </div>
    );
};

// Updated VignetteSettings
export const VignetteSettings: React.FC<{ config: EffectsConfig['vignette'], update: (v: EffectsConfig['vignette']) => void }> = ({ config, update }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2">
           <RangeControl label={t('vignette_intensity')} value={config.intensity} min={0.1} max={1.0} step={0.05} onChange={v => update({ ...config, intensity: v })} />
           <RangeControl label={t('vignette_roundness')} value={config.roundness} min={0.1} max={1.0} step={0.05} onChange={v => update({ ...config, roundness: v })} />
        </div>
    );
};

export const LightLeaksSettings: React.FC<{ config: EffectsConfig['lightLeaks'], update: (v: EffectsConfig['lightLeaks']) => void }> = ({ config, update }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2">
           <RangeControl label={t('quantity')} value={config.number} min={1} max={20} step={1} onChange={v => update({ ...config, number: v })} />
           <RangeControl label={t('intensity')} value={config.intensity} min={0.1} max={1.0} step={0.05} onChange={v => update({ ...config, intensity: v })} />
           <RangeControl label={t('speed')} value={config.speed} min={0.1} max={2.0} step={0.1} onChange={v => update({ ...config, speed: v })} />
        </div>
    );
};

export const LightFlickerSettings: React.FC<{ config: EffectsConfig['lightFlicker'], update: (v: EffectsConfig['lightFlicker']) => void }> = ({ config, update }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-2">
           <RangeControl label={t('flicker_intensity')} value={config.intensity} min={0.1} max={1.0} step={0.05} onChange={v => update({ ...config, intensity: v })} />
           <RangeControl label={t('flicker_speed')} value={config.speed} min={0.1} max={2.0} step={0.1} onChange={v => update({ ...config, speed: v })} />
        </div>
    );
};

// NEW: Video Color Settings
export const VideoColorSettings: React.FC<{ config: EffectsConfig['videoSettings'], update: (v: EffectsConfig['videoSettings']) => void }> = ({ config, update }) => {
    const { t } = useLanguage();

    const handlePresetChange = (presetId: string) => {
        const settings = PRESET_LOOKS[presetId];
        if (settings) {
            update({ ...config, ...settings, preset: presetId });
        }
    };

    const presetOptions = Object.keys(PRESET_LOOKS).map(key => ({
        value: key,
        label: key.toUpperCase().replace('_', ' ')
    }));

    return (
        <div className="pt-2">
            {/* Master Toggle */}
            <div className="mb-4">
                <ToggleSwitch 
                    label={t('color_grading')} 
                    icon={Film} 
                    value={config.enabled} 
                    onChange={(v) => update({ ...config, enabled: v })} 
                    color="blue"
                />
            </div>

            <div className={`transition-opacity duration-300 ${config.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                {/* Preset Selector */}
                <CustomSelect 
                    label={t('video_presets')} 
                    value={config.preset || 'none'} 
                    options={presetOptions} 
                    onChange={handlePresetChange} 
                />

                <div className="space-y-1">
                    <RangeControl label={t('vid_brightness')} value={config.brightness} min={0} max={3.0} step={0.05} onChange={v => update({ ...config, brightness: v, preset: 'custom' })} className="mb-4" />
                    <RangeControl label={t('vid_contrast')} value={config.contrast} min={0} max={3.0} step={0.05} onChange={v => update({ ...config, contrast: v, preset: 'custom' })} className="mb-4" />
                    <RangeControl label={t('vid_saturation')} value={config.saturation} min={0} max={3.0} step={0.05} onChange={v => update({ ...config, saturation: v, preset: 'custom' })} className="mb-4" />
                    <RangeControl label={t('vid_grayscale')} value={config.grayscale} min={0} max={1.0} step={0.05} onChange={v => update({ ...config, grayscale: v, preset: 'custom' })} className="mb-4" />
                    <RangeControl label={t('vid_sepia')} value={config.sepia} min={0} max={1.0} step={0.05} onChange={v => update({ ...config, sepia: v, preset: 'custom' })} className="mb-4" />
                    <RangeControl label={t('vid_hue')} value={config.hueRotate} min={0} max={360} step={10} onChange={v => update({ ...config, hueRotate: v, preset: 'custom' })} className="mb-4" />
                    <RangeControl label={t('vid_warmth')} value={config.warmth} min={-1.0} max={1.0} step={0.05} onChange={v => update({ ...config, warmth: v, preset: 'custom' })} className="mb-0" />
                </div>
            </div>
        </div>
    );
};