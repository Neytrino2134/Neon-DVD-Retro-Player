import React, { useRef, useState } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, FolderOpen, Music, Volume2, VolumeX, Trash2, ArrowDownAZ, Shuffle, Plus, X } from 'lucide-react';
import { AudioTrack, Playlist } from '../types';
import { Tooltip } from './ui/Tooltip';
import { TranslatedText } from './ui/TranslatedText';
import ConfirmModal from './ConfirmModal';

interface ControlsProps {
  tracks: AudioTrack[];
  playlists: Playlist[];
  activePlaylistId: string;
  playingPlaylistId: string; // New prop
  currentTrackIndex: number;
  currentTrack: AudioTrack | undefined; // New prop for direct access
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
  onClearPlaylist: () => void;
  onSort: () => void;
  onShuffle: () => void;
  // Playlist actions
  onAddPlaylist: () => void;
  onRemovePlaylist: (id: string) => void;
  onRenamePlaylist: (id: string, name: string) => void;
  onSwitchPlaylist: (id: string) => void;
  onReorderPlaylists: (dragIndex: number, hoverIndex: number) => void;
}

// Updated NeonButton to use theme colors primarily
interface NeonButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger'; // Replaced specific colors with semantic variants
}

const NeonButton: React.FC<NeonButtonProps> = ({ onClick, children, className = "", variant = 'primary' }) => {
  let colorClasses = "";
  
  switch(variant) {
      case 'primary':
          colorClasses = "border-theme-primary text-theme-primary shadow-[0_0_10px_var(--color-primary)] hover:bg-theme-primary hover:shadow-[0_0_20px_var(--color-primary)]";
          break;
      case 'secondary':
          colorClasses = "border-theme-secondary text-theme-secondary shadow-[0_0_10px_var(--color-secondary)] hover:bg-theme-secondary hover:shadow-[0_0_20px_var(--color-secondary)]";
          break;
      case 'accent':
          colorClasses = "border-theme-accent text-theme-accent shadow-[0_0_10px_var(--color-accent)] hover:bg-theme-accent hover:shadow-[0_0_20px_var(--color-accent)]";
          break;
      case 'danger':
          colorClasses = "border-red-500 text-red-500 shadow-[0_0_10px_#ff0000] hover:bg-red-500 hover:shadow-[0_0_20px_#ff0000]";
          break;
  }

  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-full border-2 transition-all active:scale-95 hover:text-black flex items-center justify-center ${colorClasses} ${className}`}
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
  playlists,
  activePlaylistId,
  playingPlaylistId,
  currentTrackIndex,
  currentTrack,
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
  onClearPlaylist,
  onSort,
  onShuffle,
  onAddPlaylist,
  onRemovePlaylist,
  onRenamePlaylist,
  onSwitchPlaylist,
  onReorderPlaylists
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Tab Editing State
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
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

  const remainingTime = Math.max(0, duration - currentTime);

  // Drag and Drop for Tabs
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTabId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTabId || draggedTabId === targetId) return;
    
    const dragIndex = playlists.findIndex(p => p.id === draggedTabId);
    const hoverIndex = playlists.findIndex(p => p.id === targetId);
    
    if (dragIndex !== -1 && hoverIndex !== -1) {
        onReorderPlaylists(dragIndex, hoverIndex);
    }
    setDraggedTabId(null);
  };

  const startRename = (id: string, name: string) => {
      setEditingTabId(id);
      setEditingName(name);
  };

  const finishRename = () => {
      if (editingTabId && editingName.trim()) {
          onRenamePlaylist(editingTabId, editingName);
      }
      setEditingTabId(null);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-theme-bg border-l-4 border-theme-panel p-4 shadow-inner">
      
      {/* Animated Confirmation Modal */}
      {showClearConfirm && (
        <ConfirmModal 
          onConfirm={confirmClear} 
          onCancel={() => setShowClearConfirm(false)} 
        />
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-2">
        <h2 className="text-xl md:text-2xl font-mono text-theme-text drop-shadow-[0_0_5px_rgba(255,255,255,0.3)] animate-pulse hidden sm:block">
          CONTROLS
        </h2>
        
        <div className="flex items-center gap-2 ml-auto">
          <Tooltip content="LOAD FILES" position="bottom">
            <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 bg-theme-panel border border-theme-accent text-theme-accent rounded hover:bg-theme-accent hover:text-black transition-colors"
            >
                <FolderOpen size={18} />
                <span className="font-mono text-sm hidden lg:inline">LOAD</span>
            </button>
          </Tooltip>
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

      {/* Progress Bar (Scrubber) with Stop Button */}
      <div className="mb-4">
        <div className="flex justify-between text-xs font-mono text-theme-primary mb-1">
          <span>{formatTime(currentTime)}</span>
          <div className="flex gap-2">
            <span>{formatTime(duration)}</span>
            <span className="text-theme-muted">(-{formatTime(remainingTime)})</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <Tooltip content="STOP PLAYBACK" position="top">
                <button
                    onClick={onStop}
                    className="p-2 border border-theme-secondary text-theme-secondary rounded hover:bg-theme-secondary hover:text-black transition-all shadow-[0_0_5px_var(--color-secondary)] hover:shadow-[0_0_15px_var(--color-secondary)] active:scale-95 shrink-0"
                >
                    <Square size={14} fill="currentColor" />
                </button>
            </Tooltip>
            <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                className="w-full flex-1"
            />
        </div>
      </div>

      {/* Main Buttons */}
      <div className="grid grid-cols-3 gap-4 mb-6 justify-items-center items-center">
        <Tooltip content="PREVIOUS TRACK" position="top">
            <NeonButton onClick={onPrev} variant="secondary">
                <SkipBack size={24} />
            </NeonButton>
        </Tooltip>
        
        {isPlaying ? (
          <Tooltip content="PAUSE" position="top">
            <NeonButton onClick={onPause} variant="primary" className="w-16 h-16">
                <Pause size={32} />
            </NeonButton>
          </Tooltip>
        ) : (
          <Tooltip content="PLAY" position="top">
            <NeonButton onClick={onPlay} variant="primary" className="w-16 h-16">
                <Play size={32} className="ml-1" />
            </NeonButton>
          </Tooltip>
        )}

        <Tooltip content="NEXT TRACK" position="top">
            <NeonButton onClick={onNext} variant="secondary">
                <SkipForward size={24} />
            </NeonButton>
        </Tooltip>
      </div>

      {/* Volume Control */}
      <div className="mb-6 bg-theme-panel p-3 rounded border border-theme-border">
        <div className="flex items-center gap-3 text-theme-text mb-1 opacity-80">
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

      {/* Track Info (LCD Display style) - Themed */}
      <div className="mb-6 p-4 bg-theme-panel/80 border-2 border-theme-border rounded-lg shadow-screen backdrop-blur-sm">
        <p className="text-xs text-gray-400 font-mono mb-1">NOW PLAYING</p>
        <div className="h-12 overflow-hidden flex items-center relative">
           {currentTrack ? (
               <div className="absolute whitespace-nowrap text-theme-primary font-mono text-lg animate-marquee">
                  {currentTrack.name}
               </div>
           ) : (
               <span className="text-gray-600 font-mono">INSERT DISK (LOAD FILES)</span>
           )}
        </div>
        <div className="flex justify-between text-xs font-mono text-theme-accent mt-2">
            <span>STEREO</span>
            <span>44.1kHz</span>
        </div>
      </div>

      {/* PLAYLIST TABS */}
      <div className="flex items-center gap-1 mb-2 overflow-x-auto custom-scrollbar pb-2">
         {playlists.map((playlist) => {
             const isPlayingThis = playlist.id === playingPlaylistId && isPlaying;
             return (
             <div 
                key={playlist.id}
                draggable
                onDragStart={(e) => handleDragStart(e, playlist.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, playlist.id)}
                onClick={() => onSwitchPlaylist(playlist.id)}
                onDoubleClick={() => startRename(playlist.id, playlist.name)}
                className={`
                    group flex items-center gap-2 px-3 py-1.5 rounded-t-md text-xs font-mono cursor-pointer transition-all border-t border-l border-r shrink-0
                    ${playlist.id === activePlaylistId 
                        ? 'bg-theme-panel border-theme-secondary text-theme-secondary font-bold shadow-[0_-2px_10px_rgba(0,0,0,0.2)]' 
                        : 'bg-theme-bg border-theme-border text-theme-muted hover:bg-theme-panel hover:text-theme-text'}
                `}
             >
                {/* Audio indicator if this playlist is making sound but not active */}
                {isPlayingThis && playlist.id !== activePlaylistId && (
                    <div className="w-1.5 h-1.5 rounded-full bg-theme-accent animate-pulse"></div>
                )}

                {editingTabId === playlist.id ? (
                    <input 
                        type="text" 
                        value={editingName} 
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={finishRename}
                        onKeyDown={(e) => e.key === 'Enter' && finishRename()}
                        autoFocus
                        className="bg-black text-white w-20 outline-none border-b border-white"
                    />
                ) : (
                    <span>{playlist.name}</span>
                )}
                
                {playlists.length > 1 && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRemovePlaylist(playlist.id); }}
                        className="opacity-0 group-hover:opacity-100 text-theme-muted hover:text-red-500 transition-opacity p-0.5"
                    >
                        <X size={10} />
                    </button>
                )}
             </div>
         )})}
         
         <button 
            onClick={onAddPlaylist}
            className="px-2 py-1.5 rounded-t-md bg-theme-panel border border-theme-border text-theme-muted hover:text-theme-accent hover:border-theme-accent transition-colors"
         >
            <Plus size={14} />
         </button>
      </div>

      {/* Playlist Content */}
      <div className="flex-1 overflow-hidden flex flex-col border-t border-theme-border bg-theme-bg/50">
        <div className="flex items-center justify-between p-2 border-b border-theme-border">
            <div className="flex items-center gap-2">
                <h3 className="text-theme-text font-mono opacity-80 text-xs">TRACKS [{tracks.length}]</h3>
            </div>
            {tracks.length > 0 && (
                <div className="flex items-center gap-3">
                    <Tooltip content={<TranslatedText k="sort_az" />} position="top">
                        <button 
                            onClick={onSort} 
                            className="text-theme-muted hover:text-theme-primary transition-colors"
                        >
                            <ArrowDownAZ size={16} />
                        </button>
                    </Tooltip>
                    <Tooltip content={<TranslatedText k="shuffle" />} position="top">
                        <button 
                            onClick={onShuffle} 
                            className="text-theme-muted hover:text-theme-secondary transition-colors"
                        >
                            <Shuffle size={16} />
                        </button>
                    </Tooltip>
                    <Tooltip content={<TranslatedText k="clear_playlist" />} position="top">
                        <button 
                            type="button"
                            onClick={requestClear} 
                            className="text-red-500 hover:text-red-400 transition-colors ml-1"
                        >
                            <Trash2 size={16} />
                        </button>
                    </Tooltip>
                </div>
            )}
        </div>
        <div className="flex-1 overflow-y-auto pr-2 space-y-1 p-1">
          {tracks.map((track, index) => {
            const isCurrentTrack = index === currentTrackIndex && activePlaylistId === playingPlaylistId;
            return (
            <div
              key={track.id}
              onClick={() => onTrackSelect(index)}
              className={`
                group flex items-center gap-3 p-2 rounded cursor-pointer transition-all border border-transparent
                ${isCurrentTrack 
                  ? 'bg-theme-panel border-theme-secondary shadow-[inset_0_0_5px_var(--color-secondary)]' 
                  : 'hover:bg-theme-panel hover:border-theme-border'}
              `}
            >
              <div className={`
                ${isCurrentTrack ? 'text-theme-secondary animate-pulse' : 'text-theme-muted group-hover:text-theme-primary'}
              `}>
                <Music size={16} />
              </div>
              <span className={`
                text-sm font-mono truncate w-full
                ${isCurrentTrack ? 'text-theme-secondary' : 'text-theme-muted group-hover:text-theme-text'}
              `}>
                {track.name}
              </span>
            </div>
          )})}
          {tracks.length === 0 && (
            <div className="text-center py-10 text-theme-muted font-mono text-sm italic">
              Drop files here...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Controls;