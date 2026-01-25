
import React, { useRef, useState } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, FolderOpen, Music, Volume2, VolumeX, Trash2, AlertTriangle, ArrowDownAZ, Shuffle } from 'lucide-react';
import { AudioTrack } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ControlsProps {
  tracks: AudioTrack[];
  currentTrackIndex: number;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  onVolumeChange: (vol: number) => void;
  onSeek: (time: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrev: () => void;
  onTrackSelect: (index: number) => void;
  onFilesSelected: (files: FileList) => void;
  onToggleCinema: () => void;
  onClearPlaylist: () => void;
  onSort: () => void;
  onShuffle: () => void;
}

interface NeonButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  color?: 'blue' | 'purple' | 'green' | 'pink';
}

const NeonButton: React.FC<NeonButtonProps> = ({ onClick, children, className = "", color = 'blue' }) => {
  const colorClasses = {
    blue: "border-neon-blue text-neon-blue shadow-[0_0_10px_#00f3ff] hover:bg-neon-blue hover:shadow-[0_0_20px_#00f3ff]",
    purple: "border-neon-purple text-neon-purple shadow-[0_0_10px_#bc13fe] hover:bg-neon-purple hover:shadow-[0_0_20px_#bc13fe]",
    green: "border-neon-green text-neon-green shadow-[0_0_10px_#00ff00] hover:bg-neon-green hover:shadow-[0_0_20px_#00ff00]",
    pink: "border-neon-pink text-neon-pink shadow-[0_0_10px_#ff00ff] hover:bg-neon-pink hover:shadow-[0_0_20px_#ff00ff]",
  };

  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-full border-2 transition-all active:scale-95 hover:text-black ${colorClasses[color]} ${className}`}
    >
      {children}
    </button>
  );
};

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const Controls: React.FC<ControlsProps> = ({
  tracks,
  currentTrackIndex,
  isPlaying,
  volume,
  currentTime,
  duration,
  onVolumeChange,
  onSeek,
  onPlay,
  onPause,
  onStop,
  onNext,
  onPrev,
  onTrackSelect,
  onFilesSelected,
  onToggleCinema,
  onClearPlaylist,
  onSort,
  onShuffle
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { t } = useLanguage();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      // Reset input value to allow re-uploading same file
      e.target.value = '';
    }
  };

  const requestClear = () => {
    if (tracks.length > 0) {
      setShowClearConfirm(true);
    }
  };

  const confirmClear = () => {
    onClearPlaylist();
    setShowClearConfirm(false);
  };

  const cancelClear = () => {
    setShowClearConfirm(false);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-gray-900 border-l-4 border-gray-800 p-4 shadow-inner">
      
      {/* Confirmation Modal Overlay */}
      {showClearConfirm && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 rounded-lg">
          <div className="w-full bg-gray-900 border-2 border-red-500 rounded-lg p-4 shadow-[0_0_20px_rgba(255,0,0,0.4)] animate-pulse-fast">
            <div className="flex flex-col items-center text-center gap-3">
              <AlertTriangle className="text-red-500 w-10 h-10" />
              <h3 className="text-white font-mono font-bold text-lg uppercase">Warning</h3>
              <p className="text-gray-300 font-mono text-xs mb-2">
                {t('confirm_clear')}
              </p>
              <div className="flex gap-3 w-full justify-center">
                <button 
                  onClick={confirmClear}
                  className="px-4 py-2 bg-red-500 text-black font-mono font-bold rounded hover:bg-red-400 hover:shadow-[0_0_10px_#ff0000] transition-all"
                >
                  YES
                </button>
                <button 
                  onClick={cancelClear}
                  className="px-4 py-2 border border-gray-500 text-gray-300 font-mono rounded hover:bg-gray-800 hover:text-white transition-all"
                >
                  NO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-2">
        <h2 className="text-xl md:text-2xl font-mono text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)] animate-pulse hidden sm:block">
          CONTROLS
        </h2>
        
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-neon-green text-neon-green rounded hover:bg-neon-green hover:text-black transition-colors"
          >
            <FolderOpen size={18} />
            <span className="font-mono text-sm hidden lg:inline">LOAD</span>
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept="audio/*"
          className="hidden"
          style={{ display: 'none' }} 
        />
      </div>

      {/* Progress Bar (Scrubber) */}
      <div className="mb-4">
        <div className="flex justify-between text-xs font-mono text-neon-blue mb-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Main Buttons */}
      <div className="grid grid-cols-3 gap-4 mb-6 justify-items-center items-center">
        <NeonButton onClick={onPrev} color="blue">
          <SkipBack size={24} />
        </NeonButton>
        
        {isPlaying ? (
          <NeonButton onClick={onPause} color="pink" className="w-16 h-16">
            <Pause size={32} />
          </NeonButton>
        ) : (
          <NeonButton onClick={onPlay} color="purple" className="w-16 h-16">
            <Play size={32} />
          </NeonButton>
        )}

        <NeonButton onClick={onNext} color="blue">
          <SkipForward size={24} />
        </NeonButton>
      </div>

      {/* Volume Control */}
      <div className="mb-6 bg-gray-800 p-3 rounded border border-gray-700">
        <div className="flex items-center gap-3 text-white mb-1 opacity-80">
            {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            <span className="text-xs font-mono">VOL</span>
        </div>
        <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full"
        />
      </div>

      {/* Track Info (LCD Display style) */}
      <div className="mb-6 p-4 bg-black border-2 border-gray-700 rounded-lg shadow-screen">
        <p className="text-xs text-gray-400 font-mono mb-1">NOW PLAYING</p>
        <div className="h-12 overflow-hidden flex items-center relative">
           {tracks.length > 0 ? (
               <div className="absolute whitespace-nowrap text-neon-blue font-mono text-lg animate-marquee">
                  {currentTrackIndex >= 0 ? tracks[currentTrackIndex].name : "Ready"}
               </div>
           ) : (
               <span className="text-gray-600 font-mono">INSERT DISK (LOAD FILES)</span>
           )}
        </div>
        <div className="flex justify-between text-xs font-mono text-neon-yellow mt-2">
            <span>STEREO</span>
            <span>44.1kHz</span>
        </div>
      </div>

      {/* Playlist */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-700 pb-1 mb-2">
            <div className="flex items-center gap-2">
                <h3 className="text-white font-mono opacity-80">PLAYLIST [{tracks.length}]</h3>
            </div>
            {tracks.length > 0 && (
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onSort} 
                        className="text-gray-400 hover:text-neon-blue transition-colors"
                        title={t('sort_az')}
                    >
                        <ArrowDownAZ size={16} />
                    </button>
                    <button 
                        onClick={onShuffle} 
                        className="text-gray-400 hover:text-neon-purple transition-colors"
                        title={t('shuffle')}
                    >
                        <Shuffle size={16} />
                    </button>
                    <button 
                      type="button"
                      onClick={requestClear} 
                      className="text-red-500 hover:text-red-400 transition-colors ml-1"
                      title={t('clear_playlist')}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )}
        </div>
        <div className="flex-1 overflow-y-auto pr-2 space-y-1">
          {tracks.map((track, index) => (
            <div
              key={track.id}
              onClick={() => onTrackSelect(index)}
              className={`
                group flex items-center gap-3 p-2 rounded cursor-pointer transition-all border border-transparent
                ${index === currentTrackIndex 
                  ? 'bg-gray-800 border-neon-pink shadow-[inset_0_0_5px_#ff00ff]' 
                  : 'hover:bg-gray-800 hover:border-gray-600'}
              `}
            >
              <div className={`
                ${index === currentTrackIndex ? 'text-neon-pink animate-pulse' : 'text-gray-600 group-hover:text-neon-blue'}
              `}>
                <Music size={16} />
              </div>
              <span className={`
                text-sm font-mono truncate w-full
                ${index === currentTrackIndex ? 'text-neon-pink' : 'text-gray-400 group-hover:text-white'}
              `}>
                {track.name}
              </span>
            </div>
          ))}
          {tracks.length === 0 && (
            <div className="text-center py-10 text-gray-600 font-mono text-sm italic">
              No tracks loaded...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Controls;
