
import React from 'react';
import { Type, Disc, Sun, CloudRain, MessageSquare, Bot, Tv, Terminal, AlertTriangle, Gamepad2 } from 'lucide-react';
import ModuleWrapper from '../ModuleWrapper';
import MarqueeSettings from '../modules/MarqueeSettings';
import HologramSettings from '../modules/HologramSettings';
import GeminiSettings from '../modules/GeminiSettings';
import RainSettings from '../modules/RainSettings';
import TronSettings from '../modules/TronSettings';
import { DvdSettings, ScanlineSettings, CyberSettings, GlitchSettings, LightLeaksSettings } from '../modules/EffectModules';
import { NumberedLabel } from '../SettingsSection';
import { MarqueeConfig, DvdConfig, EffectsConfig } from '../../../types';

interface ModulesSectionProps {
  expandedState: Record<string, boolean>;
  toggleExpand: (id: string, isAdditive: boolean) => void;
  safeAction: (fn: () => void) => void;
  // Props
  marqueeConfig: MarqueeConfig;
  updateMarquee: (k: keyof MarqueeConfig, v: any) => void;
  showDvd: boolean;
  setShowDvd: (v: boolean) => void;
  dvdConfig: DvdConfig;
  updateDvd: (k: keyof DvdConfig, v: any) => void;
  effectsConfig: EffectsConfig;
  updateEffect: (k: keyof EffectsConfig, v: any) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}

const ModulesSection: React.FC<ModulesSectionProps> = ({
  expandedState, toggleExpand, safeAction,
  marqueeConfig, updateMarquee,
  showDvd, setShowDvd, dvdConfig, updateDvd,
  effectsConfig, updateEffect, apiKey, setApiKey
}) => {
  return (
    <div id="tutorial-modules" className="space-y-3">
        <ModuleWrapper id="marquee" label={<NumberedLabel num="01" k="top_marquee" />} icon={Type} isEnabled={marqueeConfig.enabled} isExpanded={expandedState['marquee']} onToggleExpand={(e) => toggleExpand('marquee', e.shiftKey)} onToggleEnable={() => safeAction(() => updateMarquee('enabled', !marqueeConfig.enabled))}>
            <MarqueeSettings config={marqueeConfig} update={updateMarquee} />
        </ModuleWrapper>
        <ModuleWrapper id="dvd" label={<NumberedLabel num="02" k="dvd_saver" />} icon={Disc} isEnabled={showDvd} isExpanded={expandedState['dvd']} onToggleExpand={(e) => toggleExpand('dvd', e.shiftKey)} onToggleEnable={() => safeAction(() => setShowDvd(!showDvd))}>
            <DvdSettings config={dvdConfig} update={updateDvd} />
        </ModuleWrapper>
        <ModuleWrapper id="leaks" label={<NumberedLabel num="03" k="light_leaks" />} icon={Sun} isEnabled={effectsConfig.lightLeaks.enabled} isExpanded={expandedState['leaks']} onToggleExpand={(e) => toggleExpand('leaks', e.shiftKey)} onToggleEnable={() => safeAction(() => updateEffect('lightLeaks', { ...effectsConfig.lightLeaks, enabled: !effectsConfig.lightLeaks.enabled }))}>
            <LightLeaksSettings config={effectsConfig.lightLeaks} update={(v) => updateEffect('lightLeaks', v)} />
        </ModuleWrapper>
        <ModuleWrapper id="rain" label={<NumberedLabel num="04" k="rain_effect" />} icon={CloudRain} isEnabled={effectsConfig.rain.enabled} isExpanded={expandedState['rain']} onToggleExpand={(e) => toggleExpand('rain', e.shiftKey)} onToggleEnable={() => safeAction(() => updateEffect('rain', { ...effectsConfig.rain, enabled: !effectsConfig.rain.enabled }))}>
            <RainSettings config={effectsConfig.rain} update={(v) => updateEffect('rain', v)} />
        </ModuleWrapper>
        <ModuleWrapper id="tron" label={<NumberedLabel num="05" k="tron_game" />} icon={Gamepad2} isEnabled={effectsConfig.tron.enabled} isExpanded={expandedState['tron']} onToggleExpand={(e) => toggleExpand('tron', e.shiftKey)} onToggleEnable={() => safeAction(() => updateEffect('tron', { ...effectsConfig.tron, enabled: !effectsConfig.tron.enabled }))}>
            <TronSettings config={effectsConfig.tron} update={(v) => updateEffect('tron', v)} />
        </ModuleWrapper>
        <ModuleWrapper id="hologram" label={<NumberedLabel num="06" k="holograms" />} icon={MessageSquare} isEnabled={effectsConfig.holograms.enabled} isExpanded={expandedState['hologram']} onToggleExpand={(e) => toggleExpand('hologram', e.shiftKey)} onToggleEnable={() => safeAction(() => updateEffect('holograms', { ...effectsConfig.holograms, enabled: !effectsConfig.holograms.enabled }))}>
            <HologramSettings config={effectsConfig.holograms} update={(v) => updateEffect('holograms', v)} />
        </ModuleWrapper>
        <ModuleWrapper id="gemini" label={<NumberedLabel num="07" k="gemini_chat" />} icon={Bot} isEnabled={effectsConfig.geminiChat.enabled} isExpanded={expandedState['gemini']} onToggleExpand={(e) => toggleExpand('gemini', e.shiftKey)} onToggleEnable={() => safeAction(() => updateEffect('geminiChat', { ...effectsConfig.geminiChat, enabled: !effectsConfig.geminiChat.enabled }))}>
            <GeminiSettings config={effectsConfig.geminiChat} update={(v) => updateEffect('geminiChat', v)} apiKey={apiKey} setApiKey={setApiKey} />
        </ModuleWrapper>
        <ModuleWrapper id="scan" label={<NumberedLabel num="08" k="scanlines" />} icon={Tv} isEnabled={effectsConfig.scanlineEnabled} isExpanded={expandedState['scan']} onToggleExpand={(e) => toggleExpand('scan', e.shiftKey)} onToggleEnable={() => safeAction(() => updateEffect('scanlineEnabled', !effectsConfig.scanlineEnabled))}>
            <ScanlineSettings config={effectsConfig} update={updateEffect} />
        </ModuleWrapper>
        <ModuleWrapper id="cyber" label={<NumberedLabel num="09" k="cyber_hack" />} icon={Terminal} isEnabled={effectsConfig.cyberHack.enabled} isExpanded={expandedState['cyber']} onToggleExpand={(e) => toggleExpand('cyber', e.shiftKey)} onToggleEnable={() => safeAction(() => updateEffect('cyberHack', { ...effectsConfig.cyberHack, enabled: !effectsConfig.cyberHack.enabled }))}>
            <CyberSettings config={effectsConfig.cyberHack} update={(v) => updateEffect('cyberHack', v)} />
        </ModuleWrapper>
        <ModuleWrapper id="glitch" label={<NumberedLabel num="10" k="digital_glitch" />} icon={AlertTriangle} isEnabled={effectsConfig.glitch.enabled} isExpanded={expandedState['glitch']} onToggleExpand={(e) => toggleExpand('glitch', e.shiftKey)} onToggleEnable={() => safeAction(() => updateEffect('glitch', { ...effectsConfig.glitch, enabled: !effectsConfig.glitch.enabled }))}>
            <GlitchSettings config={effectsConfig.glitch} update={(v) => updateEffect('glitch', v)} />
        </ModuleWrapper>
    </div>
  );
};

export default ModulesSection;
