
import React from 'react';
import { Play, Pause, Square, SkipBack, SkipForward } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { NeonButton } from './NeonButton';
import { WaveformScrubber } from './WaveformScrubber';

interface TransportControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrev: () => void;
  // Scrubber Props
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  trackId?: string;
}

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const TransportControls: React.FC<TransportControlsProps> = ({
  isPlaying, onPlay, onPause, onStop, onNext, onPrev,
  currentTime, duration, onSeek, trackId
}) => {
  const remainingTime = Math.max(0, duration - currentTime);

  return (
    <div className="flex-1 flex flex-col justify-between">
        
        {/* Waveform Area - Recessed "Screen" */}
        {/* Expanded vertically with flex-1 and flex-col */}
        <div className="bg-theme-bg/60 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] rounded-lg p-3 relative overflow-hidden border border-white/5 flex-1 flex flex-col mb-2">
            <div className="flex justify-between text-xs font-mono text-theme-primary mb-2 opacity-60 relative z-10 shrink-0">
                <span>{formatTime(currentTime)}</span>
                <div className="flex gap-2">
                    <span>{formatTime(duration)}</span>
                    <span className="text-theme-muted opacity-50">(-{formatTime(remainingTime)})</span>
                </div>
            </div>
            
            {/* Scrubber Container */}
            <div className="flex items-center gap-3 relative z-10 flex-1">
                <Tooltip content="STOP PLAYBACK" position="top">
                    <button
                        onClick={onStop}
                        className="p-1.5 text-theme-muted rounded hover:text-red-500 hover:bg-white/5 transition-all shrink-0 self-center"
                    >
                        <Square size={12} fill="currentColor" />
                    </button>
                </Tooltip>
                
                <div className="flex-1 h-full flex items-center">
                    <WaveformScrubber 
                        currentTime={currentTime} 
                        duration={duration} 
                        onSeek={onSeek} 
                        trackId={trackId}
                    />
                </div>
            </div>
        </div>

        {/* Play Buttons: Clean, Floating */}
        <div className="flex justify-center items-center gap-6 mt-1 shrink-0">
                <Tooltip content="PREVIOUS TRACK" position="bottom">
                    <NeonButton onClick={onPrev} variant="secondary" className="w-10 h-10">
                        <SkipBack size={18} />
                    </NeonButton>
                </Tooltip>
                
                {isPlaying ? (
                <Tooltip content="PAUSE" position="bottom">
                    <NeonButton id="tutorial-play-btn" onClick={onPause} variant="primary" className="w-16 h-16 shadow-lg bg-theme-panel">
                        <Pause size={32} />
                    </NeonButton>
                </Tooltip>
                ) : (
                <Tooltip content="PLAY" position="bottom">
                    <NeonButton id="tutorial-play-btn" onClick={onPlay} variant="primary" className="w-16 h-16 shadow-lg bg-theme-panel">
                        <Play size={32} className="ml-1" />
                    </NeonButton>
                </Tooltip>
                )}

                <Tooltip content="NEXT TRACK" position="bottom">
                    <NeonButton onClick={onNext} variant="secondary" className="w-10 h-10">
                        <SkipForward size={18} />
                    </NeonButton>
                </Tooltip>
        </div>
    </div>
  );
};
