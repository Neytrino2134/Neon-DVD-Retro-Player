
import React from 'react';
import { Video, Cast, Mic, MicOff, AlertTriangle } from 'lucide-react';
import ToggleSwitch from '../ToggleSwitch';
import { useLanguage } from '../../../contexts/LanguageContext';
import CustomSelect from '../CustomSelect'; // Import CustomSelect

// Full interface for reference/parent usage
interface ScreenSettingsProps {
  isVideoActive: boolean;
  toggleVideo: () => void;
  isAudioActive: boolean;
  toggleAudio: () => void;
  audioVolume: number;
  setAudioVolume: (v: number) => void;
  isMonitoring: boolean;
  setMonitoring: (v: boolean) => void;
}

// Additional props for video module
interface ScreenVideoModuleProps extends Pick<ScreenSettingsProps, 'isVideoActive' | 'toggleVideo'> {
    streamMode?: 'bg' | 'window';
    setStreamMode?: (m: 'bg' | 'window') => void;
}

// Sub-component for System Audio settings
export const SystemAudioModule: React.FC<Pick<ScreenSettingsProps, 'isAudioActive' | 'toggleAudio'>> = ({ 
    isAudioActive, toggleAudio 
}) => {
    const { t } = useLanguage();
    
    // Check if running in Electron.
    const isElectron = typeof navigator !== 'undefined' && /Electron/.test(navigator.userAgent);
    
    return (
        <div className="pt-2 space-y-4">
            <ToggleSwitch 
                label={t('capture_audio')} 
                icon={isAudioActive ? Mic : MicOff} 
                value={isAudioActive} 
                onChange={toggleAudio} 
                color="green"
                disabled={!isElectron}
            />
            
            {!isElectron && (
                <div className="bg-red-500/10 border border-red-500/30 p-2 rounded flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-500 shrink-0" />
                    <p className="text-[9px] text-red-400 font-mono leading-tight">
                        SYSTEM AUDIO CAPTURE IS AVAILABLE ONLY IN DESKTOP APP VERSION.
                    </p>
                </div>
            )}
            
            <div className="bg-black/20 p-3 rounded border border-theme-border flex flex-col gap-2">
                <p className="text-[10px] text-theme-muted font-mono leading-relaxed">
                    ANALYZER LINK ESTABLISHED.
                </p>
                <p className="text-[9px] text-theme-muted/50 font-mono italic">
                    * Audio is routed directly to the visualizer core.
                    * Playback is muted to prevent feedback loops.
                </p>
            </div>
        </div>
    );
};

// Sub-component for Video Capture (only needs video props)
export const ScreenVideoModule: React.FC<ScreenVideoModuleProps> = ({ isVideoActive, toggleVideo, streamMode, setStreamMode }) => {
    const { t } = useLanguage();
    
    // Check if running in Electron.
    const isElectron = typeof navigator !== 'undefined' && /Electron/.test(navigator.userAgent);

    const modeOptions = [
        { value: 'bg', label: 'TV SCREEN (BG)' },
        { value: 'window', label: 'FLOATING WINDOW' }
    ];

    return (
        <div className="pt-2">
            
            {/* Mode Selection */}
            {isElectron && setStreamMode && (
                <div className="mb-3">
                    <CustomSelect 
                        label="TARGET DISPLAY MODE" 
                        value={streamMode || 'bg'} 
                        options={modeOptions} 
                        onChange={(v) => setStreamMode(v as 'bg' | 'window')} 
                    />
                </div>
            )}

            <div className={`bg-black/20 p-2 rounded border border-theme-border mb-2 ${!isElectron ? 'opacity-70' : ''}`}>
                <button
                    onClick={() => isElectron && toggleVideo()}
                    disabled={!isElectron}
                    className={`w-full py-3 rounded border flex items-center justify-center gap-2 transition-all 
                        ${!isElectron 
                            ? 'cursor-not-allowed bg-gray-800 border-gray-700 text-gray-500' 
                            : isVideoActive 
                                ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' 
                                : 'bg-theme-panel border-theme-accent/50 text-theme-accent hover:bg-theme-accent hover:text-black'
                        }
                    `}
                >
                    {isVideoActive ? <Video size={16} /> : <Cast size={16} />}
                    <span className="font-mono text-xs font-bold tracking-widest">
                        {isVideoActive ? t('stop_screen') : t('start_screen')}
                    </span>
                </button>
                <p className="text-[9px] text-theme-muted mt-2 text-center font-mono leading-relaxed">
                    {isVideoActive 
                        ? (streamMode === 'window' ? "STREAMING TO WINDOW..." : "STREAMING TO TV BACKGROUND...") 
                        : "SELECT SOURCE IN NEXT DIALOG"}
                </p>
            </div>

            {!isElectron && (
                <div className="bg-red-500/10 border border-red-500/30 p-2 rounded flex items-center gap-2 mt-2">
                    <AlertTriangle size={14} className="text-red-500 shrink-0" />
                    <p className="text-[9px] text-red-400 font-mono leading-tight">
                        SCREEN CAPTURE IS AVAILABLE ONLY IN DESKTOP APP VERSION.
                    </p>
                </div>
            )}
        </div>
    );
};
