
import React, { useRef, useState } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, FolderOpen, Music, Volume2, VolumeX, HardDrive } from 'lucide-react';
import { AudioTrack } from '../types';
import FileExplorer from './FileExplorer';
import { CatalogItem } from '../data/catalog';

interface ControlsProps {
  tracks: AudioTrack[];
  currentTrackIndex: number;
  isPlaying: boolean;
  volume: number;
  onVolumeChange: (vol: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrev: () => void;
  onTrackSelect: (index: number) => void;
  onFilesSelected: (files: FileList) => void;
  onLibraryTracksSelected: (items: CatalogItem[]) => void;
}

interface NeonButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

const NeonButton: React.FC<NeonButtonProps> = ({ onClick, children, className = "" }) => (
  <button
    onClick={onClick}
    className={`p-3 rounded-full border-2 border-neon-blue text-neon-blue shadow-[0_0_10px_#00f3ff] hover:bg-neon-blue hover:text-black hover:shadow-[0_0_20px_#00f3ff] transition-all active:scale-95 ${className}`}
  >
    {children}
  </button>
);

const Controls: React.FC<ControlsProps> = ({
  tracks,
  currentTrackIndex,
  isPlaying,
  volume,
  onVolumeChange,
  onPlay,
  onPause,
  onStop,
  onNext,
  onPrev,
  onTrackSelect,
  onFilesSelected,
  onLibraryTracksSelected
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 border-l-4 border-gray-800 p-4 shadow-inner">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-mono text-neon-pink shadow-neon-pink drop-shadow-lg animate-pulse">
          CONTROLS
        </h2>
        
        <div className="flex gap-2">
           <button
             onClick={() => setIsExplorerOpen(true)}
             className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-neon-green text-neon-green rounded hover:bg-neon-green hover:text-black transition-colors shadow-neon-green"
             title="Open Library"
           >
             <HardDrive size={18} />
             <span className="font-mono text-sm hidden sm:inline">LIB</span>
           </button>
           <button
             onClick={() => fileInputRef.current?.click()}
             className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-neon-blue text-neon-blue rounded hover:bg-neon-blue hover:text-black transition-colors shadow-neon-blue"
             title="Load from Disk"
           >
             <FolderOpen size={18} />
             <span className="font-mono text-sm hidden sm:inline">DISK</span>
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

      {/* Main Buttons */}
      <div className="grid grid-cols-3 gap-4 mb-6 justify-items-center items-center">
        <NeonButton onClick={onPrev}>
          <SkipBack size={24} />
        </NeonButton>
        
        {isPlaying ? (
          <NeonButton onClick={onPause} className="w-16 h-16 border-neon-pink text-neon-pink shadow-[0_0_10px_#ff00ff] hover:bg-neon-pink hover:text-black hover:shadow-[0_0_20px_#ff00ff]">
            <Pause size={32} />
          </NeonButton>
        ) : (
          <NeonButton onClick={onPlay} className="w-16 h-16 border-neon-green text-neon-green shadow-[0_0_10px_#00ff00] hover:bg-neon-green hover:text-black hover:shadow-[0_0_20px_#00ff00]">
            <Play size={32} />
          </NeonButton>
        )}

        <NeonButton onClick={onNext}>
          <SkipForward size={24} />
        </NeonButton>

        <div className="col-span-3 mt-2">
           <NeonButton onClick={onStop} className="rounded-lg px-6 border-red-500 text-red-500 shadow-[0_0_10px_red] hover:bg-red-500 hover:text-black hover:shadow-[0_0_20px_red]">
            <Square size={20} fill="currentColor" />
          </NeonButton>
        </div>
      </div>

      {/* Volume Control */}
      <div className="mb-6 bg-gray-800 p-3 rounded border border-gray-700">
        <div className="flex items-center gap-3 text-neon-blue mb-1">
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
        <h3 className="text-neon-blue font-mono mb-2 border-b border-gray-700 pb-1">PLAYLIST [{tracks.length}]</h3>
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

      <FileExplorer 
        isOpen={isExplorerOpen}
        onClose={() => setIsExplorerOpen(false)}
        mode="music"
        onSelect={onLibraryTracksSelected}
      />
    </div>
  );
};

export default Controls;
