
import React from 'react';
import { Timer, Zap, Layers, Aperture, Lightbulb, Film, Sun } from 'lucide-react';
import ModuleWrapper from '../ModuleWrapper';
import { FpsSettings, SignalSettings, ChromaticSettings, VignetteSettings, LightFlickerSettings, VideoColorSettings, BloomSettings } from '../modules/EffectModules';
import { NumberedLabel } from '../SettingsSection';
import { EffectsConfig } from '../../../types';

interface PostProcessingSectionProps {
  expandedState: Record<string, boolean>;
  toggleExpand: (id: string, isAdditive: boolean, forceOpen?: boolean) => void;
  safeAction: (fn: () => void) => void;
  effectsConfig: EffectsConfig;
  updateEffect: (k: keyof EffectsConfig, v: any) => void;
}

const PostProcessingSection: React.FC<PostProcessingSectionProps> = ({
  expandedState, toggleExpand, safeAction, effectsConfig, updateEffect
}) => {
  return (
    <div className="space-y-3">
        <ModuleWrapper id="fps" label={<NumberedLabel num="01" k="fps_limit" />} icon={Timer} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['fps']} onToggleExpand={(e) => toggleExpand('fps', e.shiftKey)} onToggleEnable={() => {}}>
            <FpsSettings config={effectsConfig} update={updateEffect} />
        </ModuleWrapper>
        
        {/* NEW: Bloom Module */}
        <ModuleWrapper id="bloom" label={<span className="flex items-center gap-2"><span className="text-theme-muted opacity-50 font-normal">02 //</span> SCREEN GLOW</span>} icon={Sun} isEnabled={effectsConfig.bloom?.enabled} isExpanded={expandedState['bloom']} onToggleExpand={(e) => toggleExpand('bloom', e.shiftKey)} onToggleEnable={() => safeAction(() => { if (!effectsConfig.bloom?.enabled) toggleExpand('bloom', false, true); updateEffect('bloom', { ...effectsConfig.bloom, enabled: !effectsConfig.bloom?.enabled }); })}>
            <BloomSettings config={effectsConfig.bloom || { enabled: false, strength: 1.0, radius: 10, threshold: 0.5 }} update={(v) => updateEffect('bloom', v)} />
        </ModuleWrapper>

        <ModuleWrapper id="signal" label={<NumberedLabel num="03" k="signal_processor" />} icon={Zap} isEnabled={effectsConfig.signalEnabled} isExpanded={expandedState['signal']} onToggleExpand={(e) => toggleExpand('signal', e.shiftKey)} onToggleEnable={() => safeAction(() => { if (!effectsConfig.signalEnabled) toggleExpand('signal', false, true); updateEffect('signalEnabled', !effectsConfig.signalEnabled); })}>
            <SignalSettings config={effectsConfig} update={updateEffect} />
        </ModuleWrapper>
        
        <ModuleWrapper id="chromatic" label={<NumberedLabel num="04" k="chromatic_aberration" />} icon={Layers} isEnabled={effectsConfig.chromaticEnabled} isExpanded={expandedState['chromatic']} onToggleExpand={(e) => toggleExpand('chromatic', e.shiftKey)} onToggleEnable={() => safeAction(() => { if (!effectsConfig.chromaticEnabled) toggleExpand('chromatic', false, true); updateEffect('chromaticEnabled', !effectsConfig.chromaticEnabled); })}>
            <ChromaticSettings config={effectsConfig} update={updateEffect} />
        </ModuleWrapper>

        <ModuleWrapper id="vignette" label={<NumberedLabel num="05" k="vignette_effect" />} icon={Aperture} isEnabled={effectsConfig.vignette.enabled} isExpanded={expandedState['vignette']} onToggleExpand={(e) => toggleExpand('vignette', e.shiftKey)} onToggleEnable={() => safeAction(() => { if (!effectsConfig.vignette.enabled) toggleExpand('vignette', false, true); updateEffect('vignette', { ...effectsConfig.vignette, enabled: !effectsConfig.vignette.enabled }); })}>
            <VignetteSettings config={effectsConfig.vignette} update={(v) => updateEffect('vignette', v)} />
        </ModuleWrapper>

        <ModuleWrapper id="flicker" label={<NumberedLabel num="06" k="light_flicker" />} icon={Lightbulb} isEnabled={effectsConfig.lightFlicker.enabled} isExpanded={expandedState['flicker']} onToggleExpand={(e) => toggleExpand('flicker', e.shiftKey)} onToggleEnable={() => safeAction(() => { if (!effectsConfig.lightFlicker.enabled) toggleExpand('flicker', false, true); updateEffect('lightFlicker', { ...effectsConfig.lightFlicker, enabled: !effectsConfig.lightFlicker.enabled }); })}>
            <LightFlickerSettings config={effectsConfig.lightFlicker} update={(v) => updateEffect('lightFlicker', v)} />
        </ModuleWrapper>

        <ModuleWrapper id="video" label={<NumberedLabel num="07" k="color_grading" />} icon={Film} isEnabled={effectsConfig.videoSettings?.enabled} isExpanded={expandedState['video']} onToggleExpand={(e) => toggleExpand('video', e.shiftKey)} onToggleEnable={() => safeAction(() => { if (!effectsConfig.videoSettings?.enabled) toggleExpand('video', false, true); updateEffect('videoSettings', { ...effectsConfig.videoSettings, enabled: !effectsConfig.videoSettings?.enabled }); })}>
            <VideoColorSettings config={effectsConfig.videoSettings} update={(v) => updateEffect('videoSettings', v)} />
        </ModuleWrapper>
    </div>
  );
};

export default PostProcessingSection;