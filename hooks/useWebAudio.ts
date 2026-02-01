
import { useRef, useState, useEffect } from 'react';

export const useWebAudio = (volume: number) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  
  // Aux Input (System Audio)
  const auxSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const auxGainRef = useRef<GainNode | null>(null);

  // Initialize Audio Context
  useEffect(() => {
    const initCtx = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContext();
            audioContextRef.current = ctx;
            
            const ana = ctx.createAnalyser();
            ana.fftSize = 2048; // Higher res for visualizer
            analyserRef.current = ana;
            setAnalyser(ana);
            
            const gain = ctx.createGain();
            gain.gain.value = volume; 
            gain.connect(ctx.destination);
            gainNodeRef.current = gain;
            
            ana.connect(gain);

            // Init Aux Gain (for system audio mixing)
            const auxGain = ctx.createGain();
            auxGain.connect(ana); // Mix into analyser
            auxGainRef.current = auxGain;
        } catch (e) {
            console.error("AudioContext init failed", e);
        }
    };
    
    initCtx();
    
    return () => {
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
    };
  }, []); // Run once on mount

  // Sync Volume
  useEffect(() => {
      if (gainNodeRef.current && audioContextRef.current) {
          try {
              // Cancel any scheduled ramps to allow immediate manual adjustment
              gainNodeRef.current.gain.cancelScheduledValues(audioContextRef.current.currentTime);
              gainNodeRef.current.gain.value = volume;
          } catch (e) {}
      }
  }, [volume]);

  const connectAuxSource = (stream: MediaStream) => {
      if (!audioContextRef.current || !auxGainRef.current) return;
      if (auxSourceRef.current) auxSourceRef.current.disconnect();
      
      const src = audioContextRef.current.createMediaStreamSource(stream);
      src.connect(auxGainRef.current);
      auxSourceRef.current = src;
  };

  const updateAuxMonitor = (enabled: boolean) => {
      if (!auxGainRef.current || !audioContextRef.current) return;
      if (enabled) {
          auxGainRef.current.connect(audioContextRef.current.destination);
      } else {
          try {
            auxGainRef.current.disconnect(audioContextRef.current.destination);
          } catch(e) {}
      }
  };

  const updateAuxVolume = (vol: number) => {
      if (!auxGainRef.current || !audioContextRef.current) return;
      try {
          auxGainRef.current.gain.setValueAtTime(vol, audioContextRef.current.currentTime);
      } catch(e) {}
  };

  const getAudioStream = () => {
      if (!gainNodeRef.current || !audioContextRef.current) return null;
      const dest = audioContextRef.current.createMediaStreamDestination();
      gainNodeRef.current.connect(dest);
      return dest.stream;
  };

  const resumeContext = async () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
      }
  };

  return {
      audioContextRef,
      gainNodeRef,
      analyser,
      connectAuxSource,
      updateAuxMonitor,
      updateAuxVolume,
      getAudioStream,
      resumeContext
  };
};
