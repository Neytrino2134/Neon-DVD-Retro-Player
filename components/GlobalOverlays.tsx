
import React, { MutableRefObject } from 'react';
import StartupOverlay from './StartupOverlay';
import ShutdownOverlay from './ShutdownOverlay';
import TutorialOverlay from './TutorialOverlay';
import RecordingSettingsModal from './modals/RecordingSettingsModal';
import { RecorderConfig } from '../types';

interface GlobalOverlaysProps {
  system: any; // Type from useSystemCycle
  view: any;   // Type from useViewLayout
  recorder: any; // Type from useRecorder
  config: any;   // Type from useAppConfig
  player: any;   // Type from useAudioPlayer
  appState: any; // Type from useAppState
  playSFX: (name: string) => void;
  stopAllSFX: () => void;
  autoLaunchRef: MutableRefObject<boolean>;
  addNotification: (msg: string, type: any) => void;
}

const GlobalOverlays: React.FC<GlobalOverlaysProps> = ({
  system, view, recorder, config, player, appState, playSFX, stopAllSFX, autoLaunchRef, addNotification
}) => {
  
  // Show loader overlay ONLY for specific loading states
  // We do NOT show it for 'exiting_focus', 'void_layout' or 'reveal_*' phases,
  // because we want a clean dark screen (app fades out to body bg) for cinematic transitions.
  const shouldShowLoader = 
      view.animSequence === 'loading' || 
      view.animSequence === 'exiting_mini' || // Keep loader for mini mode switch as it's a layout swap
      view.animSequence === 'exiting_center'; // Keep for simple exits

  const loaderOpacity = shouldShowLoader ? 'opacity-100' : 'opacity-0';
  const pointerEvents = shouldShowLoader ? 'pointer-events-auto' : 'pointer-events-none';

  return (
    <>
      {/* LOADING SPINNER */}
      <div className={`fixed inset-0 z-[100000] bg-[#030712] flex items-center justify-center transition-opacity duration-500 ${loaderOpacity} ${pointerEvents}`}>
          <div className="flex flex-col items-center justify-center">
              <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-transparent border-t-theme-primary animate-spin"></div>
              </div>
          </div>
      </div>

      {/* STARTUP */}
      <StartupOverlay
        key={system.startupKey}
        onFadeOut={() => system.setIntroState(2)}
        onComplete={system.handleBootComplete}
        onPlaySfx={playSFX}
        onStopSfx={stopAllSFX}
        apiKey={config.apiKey}
        setApiKey={config.setApiKey}
        forceSkip={appState.devSkip}
        onAutoLaunch={() => {
          autoLaunchRef.current = true;
          recorder.startRecording(appState.recorderConfig);
        }}
      />

      {/* SHUTDOWN */}
      <ShutdownOverlay
        active={system.rebootPhase === 'active'}
        onPlayRebootSfx={() => playSFX('SFX_REBOOT.mp3')}
        onCancel={system.handleCancelReboot}
        isRecording={recorder.isRecording}
        stopRecording={recorder.stopRecording}
      />

      {/* TUTORIAL */}
      {system.showTutorial && !appState.devSkip && (
        <TutorialOverlay
          onComplete={() => {
            system.setShowTutorial(false);
            localStorage.setItem('neon_tutorial_complete', 'true');
            addNotification("TUTORIAL COMPLETE", "success");
          }}
          trackCount={player.tracks.length}
          isPlaying={player.isPlaying}
          visualizerConfig={config.visualizerConfig}
          setVisualizerConfig={config.setVisualizerConfig}
          setShowVisualizer={config.setShowVisualizer}
          isSettingsOpen={view.showLeftPanel}
          presetsCount={config.savedPresets.length}
        />
      )}

      {/* RECORDING SETTINGS MODAL */}
      {appState.showRecModal && (
        <RecordingSettingsModal
          currentConfig={appState.recorderConfig}
          onClose={() => appState.setShowRecModal(false)}
          onSave={(newConfig: RecorderConfig) => {
            appState.setRecorderConfig(newConfig);
            addNotification("Recording config saved", "success");
          }}
        />
      )}
    </>
  );
};

export default GlobalOverlays;
