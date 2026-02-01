
import React from 'react';
import { AudioWaveform, CloudRain, RadioReceiver } from 'lucide-react';
import ModuleWrapper from '../ModuleWrapper';
import { MixerSettings } from '../modules/EffectModules';
import AmbienceSettings from '../modules/AmbienceSettings';
import { SystemAudioModule } from '../modules/ScreenSettings';
import { NumberedLabel } from '../SettingsSection';
import { AmbienceFile, AmbienceConfig } from '../../../types';

interface SoundSectionProps {
  expandedState: Record<string, boolean>;
  toggleExpand: (id: string, isAdditive: boolean) => void;
  // Props
  crossfadeDuration: number;
  setCrossfadeDuration: (val: number) => void;
  sfxVolume: number;
  setSfxVolume: (v: number) => void;
  smoothStart: boolean;
  setSmoothStart: (v: boolean) => void;
  ambienceFiles: AmbienceFile[];
  ambienceConfig: AmbienceConfig;
  onAmbienceUpload: (files: FileList) => void;
  onAmbienceDelete: (id: string) => void;
  onAmbienceSetActive: (id: string) => void;
  onAmbienceTogglePlay: () => void;
  onAmbienceVolume: (v: number) => void;
  isAudioActive: boolean;
  toggleAudio: () => void;
}

const SoundSection: React.FC<SoundSectionProps> = ({
  expandedState, toggleExpand,
  crossfadeDuration, setCrossfadeDuration, sfxVolume, setSfxVolume, smoothStart, setSmoothStart,
  ambienceFiles, ambienceConfig, onAmbienceUpload, onAmbienceDelete, onAmbienceSetActive, onAmbienceTogglePlay, onAmbienceVolume,
  isAudioActive, toggleAudio
}) => {
  return (
    <>
        <ModuleWrapper id="mixer" label={<NumberedLabel num="01" k="mixer_deck" />} icon={AudioWaveform} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['mixer']} onToggleExpand={(e) => toggleExpand('mixer', e.shiftKey)} onToggleEnable={() => {}}>
            <MixerSettings crossfadeDuration={crossfadeDuration} setCrossfadeDuration={setCrossfadeDuration} sfxVolume={sfxVolume} setSfxVolume={setSfxVolume} smoothStart={smoothStart} setSmoothStart={setSmoothStart} />
        </ModuleWrapper>

        <ModuleWrapper id="ambience" label={<NumberedLabel num="02" k="ambience" />} icon={CloudRain} isEnabled={true} isExpanded={expandedState['ambience']} onToggleExpand={(e) => toggleExpand('ambience', e.shiftKey)} isAlwaysOn={true} onToggleEnable={() => {}}>
            <AmbienceSettings files={ambienceFiles} config={ambienceConfig} onUpload={onAmbienceUpload} onDelete={onAmbienceDelete} onSetActive={onAmbienceSetActive} onTogglePlay={onAmbienceTogglePlay} onVolumeChange={onAmbienceVolume} />
        </ModuleWrapper>

        <ModuleWrapper id="sysaudio" label={<NumberedLabel num="03" k="sys_audio_input" />} icon={RadioReceiver} isEnabled={true} isExpanded={expandedState['sysaudio']} isAlwaysOn={true} onToggleExpand={(e) => toggleExpand('sysaudio', e.shiftKey)} onToggleEnable={() => {}}>
            <SystemAudioModule 
                isAudioActive={isAudioActive} 
                toggleAudio={toggleAudio} 
            />
        </ModuleWrapper>
    </>
  );
};

export default SoundSection;
