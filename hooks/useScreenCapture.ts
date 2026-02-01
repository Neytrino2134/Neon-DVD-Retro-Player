
import { useState, useRef, useCallback, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';

interface UseScreenCaptureProps {
  onAudioStream?: (stream: MediaStream) => void;
  onVideoStream?: (stream: MediaStream | null) => void;
}

export const useScreenCapture = ({ onAudioStream, onVideoStream }: UseScreenCaptureProps) => {
  const { addNotification } = useNotification();
  
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [audioSourceType, setAudioSourceType] = useState<'system' | 'mic'>('system');
  
  const videoStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // --- VIDEO CAPTURE ---
  const toggleVideoCapture = useCallback(async () => {
    if (isVideoActive) {
      // STOP
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }
      setIsVideoActive(false);
      if (onVideoStream) onVideoStream(null);
      addNotification("Video Capture Stopped", "info");
    } else {
      // START
      try {
        const stream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: true,
          audio: false
        });
        
        videoStreamRef.current = stream;
        setIsVideoActive(true);
        if (onVideoStream) onVideoStream(stream);
        
        // Handle stream end (user clicking "Stop sharing" in browser UI)
        stream.getVideoTracks()[0].onended = () => {
            setIsVideoActive(false);
            if (onVideoStream) onVideoStream(null);
            videoStreamRef.current = null;
        };
        
      } catch (err) {
        console.error("Screen capture cancelled or failed", err);
        addNotification("Capture Cancelled", "error");
      }
    }
  }, [isVideoActive, onVideoStream, addNotification]);

  // --- AUDIO CAPTURE ---
  const toggleAudioCapture = useCallback(async () => {
    if (isAudioActive) {
      // STOP
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      setIsAudioActive(false);
      addNotification(audioSourceType === 'mic' ? "Microphone Stopped" : "System Audio Stopped", "info");
    } else {
      // START
      try {
        let audioOnlyStream: MediaStream | null = null;

        if (audioSourceType === 'mic') {
            // MICROPHONE
            audioOnlyStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    autoGainControl: false,
                    noiseSuppression: false,
                    latency: 0
                } as any
            });
        } else {
            // SYSTEM (LOOPBACK via Screen Share)
            // NOTE: In Electron/Chrome, getDisplayMedia usually asks for video even if we only want audio.
            const stream = await (navigator.mediaDevices as any).getDisplayMedia({
              video: { width: 1, height: 1 }, // Minimal video requirement
              audio: true
            });
            
            // Important: Verify we actually got an audio track
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
                addNotification("No Audio Track Selected", "warning");
                // Stop any video track we might have gotten accidentally
                stream.getTracks().forEach((t: any) => t.stop());
                return;
            }

            // Stop the dummy video track to save resources
            stream.getVideoTracks().forEach((t: any) => t.stop());
            
            // Create a new stream with only audio
            audioOnlyStream = new MediaStream(audioTracks);
        }
        
        if (audioOnlyStream) {
            audioStreamRef.current = audioOnlyStream;
            setIsAudioActive(true);
            
            if (onAudioStream) onAudioStream(audioOnlyStream);

            // Handle user stopping via UI
            audioOnlyStream.getAudioTracks()[0].onended = () => {
                setIsAudioActive(false);
                audioStreamRef.current = null;
            };
            
            addNotification(audioSourceType === 'mic' ? "Microphone Active" : "System Audio Active", "success");
        }

      } catch (err) {
        console.error("Audio capture failed", err);
        addNotification("Audio Capture Failed", "error");
      }
    }
  }, [isAudioActive, onAudioStream, addNotification, audioSourceType]);

  // Cleanup on unmount
  useEffect(() => {
      return () => {
          if (videoStreamRef.current) videoStreamRef.current.getTracks().forEach(t => t.stop());
          if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(t => t.stop());
      };
  }, []);

  return {
    isVideoActive,
    isAudioActive,
    toggleVideoCapture,
    toggleAudioCapture,
    audioSourceType,
    setAudioSourceType
  };
};
