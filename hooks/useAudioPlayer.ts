
import { useState, useRef, useEffect, useCallback } from 'react';
import { AudioTrack } from '../types';
import { getAllTracks, saveTrack } from '../lib/db';

export const useAudioPlayer = () => {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceConnectedRef = useRef(false);

  // Load tracks from DB on mount
  useEffect(() => {
    const loadTracks = async () => {
      const savedTracks = await getAllTracks();
      if (savedTracks.length > 0) {
        setTracks(savedTracks.map(t => ({ 
          id: t.id, 
          name: t.name, 
          url: URL.createObjectURL(t.file), 
          file: t.file 
        })));
      }
    };
    loadTracks();
  }, []);

  // Initialize Audio Context
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const context = new AC();
      audioContextRef.current = context;
      
      const analyserNode = context.createAnalyser();
      setAnalyser(analyserNode);

      if (audioRef.current && !sourceConnectedRef.current) {
        try {
          const source = context.createMediaElementSource(audioRef.current);
          source.connect(analyserNode);
          analyserNode.connect(context.destination);
          sourceConnectedRef.current = true;
        } catch (e) {
          console.warn("Audio connection error:", e);
        }
      }
    }
    
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  const processAudioFiles = async (files: File[]) => {
    const newTracks = files.map(file => ({ id: crypto.randomUUID(), name: file.name, url: URL.createObjectURL(file), file }));
    for (const t of newTracks) await saveTrack({ id: t.id, name: t.name, file: t.file });
    const prevCount = tracks.length;
    setTracks(prev => [...prev, ...newTracks]);
    if (prevCount === 0 || (!isPlaying && currentTrackIndex === -1)) { 
      setCurrentTrackIndex(prevCount); 
      setIsPlaying(true); 
    }
  };

  const nextTrack = useCallback(() => {
    if (tracks.length === 0) return;
    if (tracks.length === 1) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        if (isPlaying) audioRef.current.play().catch(console.warn);
      }
      return;
    }
    setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
  }, [tracks.length, isPlaying]);

  const prevTrack = useCallback(() => {
    if (tracks.length === 0) return;
    if (tracks.length === 1) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        if (isPlaying) audioRef.current.play().catch(console.warn);
      }
      return;
    }
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
  }, [tracks.length, isPlaying]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      initAudio();
      audioRef.current?.play();
      setIsPlaying(true);
    }
  }, [isPlaying, initAudio]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }, []);

  const selectTrack = useCallback((index: number) => {
    setCurrentTrackIndex(index);
    setIsPlaying(true);
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Sync Track Source and Auto-play
  useEffect(() => {
    if (currentTrackIndex >= 0 && tracks[currentTrackIndex] && audioRef.current) {
      audioRef.current.src = tracks[currentTrackIndex].url;
      if (isPlaying) { 
        initAudio(); 
        audioRef.current.play().catch(e => {
          console.warn("Auto-play blocked:", e);
          setIsPlaying(false);
        });
      }
    }
  }, [currentTrackIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    audioRef,
    tracks,
    currentTrackIndex,
    isPlaying,
    volume,
    currentTime,
    duration,
    analyser,
    setVolume,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    processAudioFiles,
    nextTrack,
    prevTrack,
    togglePlay,
    stop,
    selectTrack,
    seek,
    initAudio
  };
};
