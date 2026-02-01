
import { useRef, useState, useEffect } from 'react';

export const useWebAudio = (volume: number) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  
  // Independent Source Nodes
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sysSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

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
            
            // NOTE: We do NOT connect Analyser to Gain/Destination.
            // Sources (Music) must connect to BOTH Analyser (for visuals) AND Gain (for audio).
            // Input Sources (Mic/Sys) connect ONLY to Analyser (visuals only, no echo).

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

  // Sync Volume (Only affects Music Playback, not inputs)
  useEffect(() => {
      if (gainNodeRef.current && audioContextRef.current) {
          try {
              gainNodeRef.current.gain.cancelScheduledValues(audioContextRef.current.currentTime);
              gainNodeRef.current.gain.value = volume;
          } catch (e) {}
      }
  }, [volume]);

  // --- MICROPHONE INPUT (Visualizer Only) ---
  const connectMic = (stream: MediaStream) => {
      if (!audioContextRef.current || !analyserRef.current) return;
      
      // Cleanup old
      if (micSourceRef.current) micSourceRef.current.disconnect();

      const src = audioContextRef.current.createMediaStreamSource(stream);
      // Connect ONLY to Analyser. Do NOT connect to destination/speakers.
      src.connect(analyserRef.current);
      micSourceRef.current = src;
  };

  const disconnectMic = () => {
      if (micSourceRef.current) {
          micSourceRef.current.disconnect();
          micSourceRef.current = null;
      }
  };

  // --- SYSTEM AUDIO INPUT (Visualizer Only) ---
  const connectSys = (stream: MediaStream) => {
      if (!audioContextRef.current || !analyserRef.current) return;

      // Cleanup old
      if (sysSourceRef.current) sysSourceRef.current.disconnect();

      const src = audioContextRef.current.createMediaStreamSource(stream);
      // Connect ONLY to Analyser. Do NOT connect to destination/speakers.
      src.connect(analyserRef.current);
      sysSourceRef.current = src;
  };

  const disconnectSys = () => {
      if (sysSourceRef.current) {
          sysSourceRef.current.disconnect();
          sysSourceRef.current = null;
      }
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
      connectMic,
      disconnectMic,
      connectSys,
      disconnectSys,
      getAudioStream,
      resumeContext
  };
};
