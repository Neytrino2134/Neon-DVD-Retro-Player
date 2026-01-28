
import { useState, useRef, useCallback } from 'react';
import { useNotification } from '../contexts/NotificationContext';

interface UseSystemCycleProps {
  player: any;
  setViewMode: (mode: any) => void;
  setDevSkip: (v: boolean) => void;
  setIsEditorMode: (v: boolean) => void;
  stopAllSFX: () => void;
}

export const useSystemCycle = ({ player, setViewMode, setDevSkip, setIsEditorMode, stopAllSFX }: UseSystemCycleProps) => {
  const { addNotification } = useNotification();
  
  const [rebootPhase, setRebootPhase] = useState<'idle' | 'waiting' | 'active'>('idle');
  const [introState, setIntroState] = useState<0 | 1 | 2>(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [startupKey, setStartupKey] = useState(0); 
  const hasBootedRef = useRef(false);

  const handleScheduleReload = useCallback(() => {
    // Disable reboot if startup sequence is active (introState < 2)
    if (introState < 2) return;

    if (rebootPhase !== 'idle') {
        setRebootPhase('idle');
        addNotification("Reboot Cancelled", "info");
        return;
    }
    if (player.isPlaying && Number.isFinite(player.duration) && player.duration > player.currentTime) {
        setRebootPhase('waiting');
        addNotification("Reboot scheduled after track", "warning");
    } else {
        setRebootPhase('active');
        player.setIsPlaying(false);
    }
  }, [rebootPhase, player, addNotification, introState]);

  const handleGoHome = useCallback(() => {
      if (introState < 2 || rebootPhase === 'active') return;
      player.stop();
      setIntroState(0);
      setStartupKey(prev => prev + 1); 
      setViewMode('default'); 
      setDevSkip(false); 
      setIsEditorMode(false); 
  }, [introState, rebootPhase, player, setViewMode, setDevSkip, setIsEditorMode]);

  const handleBootComplete = useCallback(() => {
      const tutorialDone = localStorage.getItem('neon_tutorial_complete');
      if (!tutorialDone) {
          setTimeout(() => setShowTutorial(true), 500);
      }
      if (!hasBootedRef.current) {
          hasBootedRef.current = true;
          setTimeout(() => {
              addNotification("SYSTEM ONLINE", "success");
          }, 500);
      }
  }, [addNotification]);

  const handleCancelReboot = useCallback(() => {
      setRebootPhase('idle');
      stopAllSFX();
      addNotification("Reboot Cancelled", "info");
  }, [stopAllSFX, addNotification]);

  return {
    rebootPhase,
    setRebootPhase,
    introState,
    setIntroState,
    showTutorial,
    setShowTutorial,
    startupKey,
    handleScheduleReload,
    handleGoHome,
    handleBootComplete,
    handleCancelReboot
  };
};
