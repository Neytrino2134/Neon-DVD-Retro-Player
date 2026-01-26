
import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, FolderOpen, Music, Volume2, VolumeX, Trash2, ArrowDownAZ, Shuffle, Plus, X, Lock, Unlock, Upload } from 'lucide-react';
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
  // New actions
  removeTracks: (playlistId: string, trackIds: string[]) => void;
  reorderTracks: (playlistId: string, sourceIndices: number[], targetIndex: number) => void;
  moveTracksToPlaylist: (sourcePlaylistId: string, trackIds: string[], targetPlaylistId: string) => void;
  // Drop to create
  onNewPlaylistWithTracks: (trackIds: string[], sourcePlaylistId: string) => void;
  onNewPlaylistWithFiles: (files: File[]) => void;
}

// Updated NeonButton to use theme colors primarily
interface NeonButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger'; // Replaced specific colors with semantic variants
  id?: string;
}

const NeonButton: React.FC<NeonButtonProps> = ({ onClick, children, className = "", variant = 'primary', id }) => {
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
      id={id}
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
  onReorderPlaylists,
  removeTracks,
  reorderTracks,
  moveTracksToPlaylist,
  onNewPlaylistWithTracks,
  onNewPlaylistWithFiles
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showTabDeleteConfirm, setShowTabDeleteConfirm] = useState(false);
  const [tabToDelete, setTabToDelete] = useState<string | null>(null);
  
  // Tab Editing State
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Lock State
  const [isLocked, setIsLocked] = useState(false);

  // Track Selection State
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [lastSelectedTrackIndex, setLastSelectedTrackIndex] = useState<number>(-1);

  // Drag State for Tracks
  const [draggedTrackIds, setDraggedTrackIds] = useState<string[]>([]);
  const [dragSourcePlaylistId, setDragSourcePlaylistId] = useState<string | null>(null);
  
  // Drag State for List Drop Zone
  const [isListDragOver, setIsListDragOver] = useState(false);
  
  // Drag State for Tabs
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  
  // Drag State for Plus Button
  const [isPlusDragOver, setIsPlusDragOver] = useState(false);

  const tabSwitchTimeoutRef = useRef<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      e.target.value = '';
    }
  };

  const requestClear = () => {
    if (tracks.length > 0 && !isLocked) {
      setShowClearConfirm(true);
    }
  };

  const confirmClear = () => {
    onClearPlaylist();
    setShowClearConfirm(false);
  };

  const requestDeleteTab = (id: string) => {
      setTabToDelete(id);
      setShowTabDeleteConfirm(true);
  };

  const confirmDeleteTab = () => {
      if (tabToDelete) {
          onRemovePlaylist(tabToDelete);
      }
      setTabToDelete(null);
      setShowTabDeleteConfirm(false);
  };

  const remainingTime = Math.max(0, duration - currentTime);

  // Drag and Drop for Tabs
  const handleTabDragStart = (e: React.DragEvent, id: string) => {
    if (isLocked) { e.preventDefault(); return; }
    setDraggedTabId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTabDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (isLocked) return;
    
    // Highlight effect logic
    if (dragOverTabId !== targetId) setDragOverTabId(targetId);

    // Logic for dragging TRACKS onto TABS
    if (draggedTrackIds.length > 0 && targetId !== activePlaylistId) {
        if (!tabSwitchTimeoutRef.current) {
            tabSwitchTimeoutRef.current = window.setTimeout(() => {
                onSwitchPlaylist(targetId);
                tabSwitchTimeoutRef.current = null;
            }, 600); // 600ms delay to switch tab
        }
    }
  };

  const handleTabDragLeave = () => {
      if (tabSwitchTimeoutRef.current) {
          clearTimeout(tabSwitchTimeoutRef.current);
          tabSwitchTimeoutRef.current = null;
      }
      setDragOverTabId(null);
  };

  const handleTabDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverTabId(null);
    if (isLocked) return;

    if (draggedTabId) {
        // Tab Reordering Logic
        if (draggedTabId === targetId) return;
        const dragIndex = playlists.findIndex(p => p.id === draggedTabId);
        const hoverIndex = playlists.findIndex(p => p.id === targetId);
        
        if (dragIndex !== -1 && hoverIndex !== -1) {
            onReorderPlaylists(dragIndex, hoverIndex);
        }
        setDraggedTabId(null);
    } else if (draggedTrackIds.length > 0) {
        // Moving tracks to another playlist via Tab Drop
        if (targetId !== activePlaylistId) {
            moveTracksToPlaylist(activePlaylistId, draggedTrackIds, targetId);
            setDraggedTrackIds([]);
            setSelectedTrackIds(new Set());
            setDragSourcePlaylistId(null);
        }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        // Dropping files directly on a tab - Switch to tab and add files
        onSwitchPlaylist(targetId);
        onFilesSelected(e.dataTransfer.files);
    }
  };

  // --- PLUS BUTTON DRAG HANDLERS ---
  const handlePlusDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      if (!isPlusDragOver) setIsPlusDragOver(true);
  };

  const handlePlusDragLeave = () => {
      setIsPlusDragOver(false);
  };

  const handlePlusDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsPlusDragOver(false);
      
      // 1. Files Drop
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          onNewPlaylistWithFiles(Array.from(e.dataTransfer.files));
          return;
      }

      // 2. Tracks Drop
      if (draggedTrackIds.length > 0 && dragSourcePlaylistId) {
          onNewPlaylistWithTracks(draggedTrackIds, dragSourcePlaylistId);
          setDraggedTrackIds([]);
          setSelectedTrackIds(new Set());
          setDragSourcePlaylistId(null);
      }
  };

  const startRename = (id: string, name: string) => {
      if (isLocked) return;
      setEditingTabId(id);
      setEditingName(name);
  };

  const finishRename = () => {
      if (editingTabId && editingName.trim()) {
          onRenamePlaylist(editingTabId, editingName);
      }
      setEditingTabId(null);
  };

  // --- TRACK LIST HANDLERS ---

  const handleTrackClick = (e: React.MouseEvent, index: number, trackId: string) => {
      if (isLocked) return;

      const newSelection = new Set(selectedTrackIds);

      if (e.shiftKey && lastSelectedTrackIndex !== -1) {
          // Range selection
          const start = Math.min(lastSelectedTrackIndex, index);
          const end = Math.max(lastSelectedTrackIndex, index);
          
          // If ctrl not held, clear others first
          if (!e.ctrlKey && !e.metaKey) {
              newSelection.clear();
          }

          for (let i = start; i <= end; i++) {
              if (tracks[i]) newSelection.add(tracks[i].id);
          }
      } else if (e.ctrlKey || e.metaKey) {
          // Toggle selection
          if (newSelection.has(trackId)) {
              newSelection.delete(trackId);
          } else {
              newSelection.add(trackId);
          }
          setLastSelectedTrackIndex(index);
      } else {
          // Single selection
          newSelection.clear();
          newSelection.add(trackId);
          setLastSelectedTrackIndex(index);
      }

      setSelectedTrackIds(newSelection);
  };

  const handleTrackDoubleClick = (index: number) => {
      if (!isLocked) {
          onTrackSelect(index);
      }
  };

  const handleDeleteSelected = () => {
      if (isLocked || selectedTrackIds.size === 0) return;
      removeTracks(activePlaylistId, Array.from(selectedTrackIds));
      setSelectedTrackIds(new Set());
  };

  const handleDeleteTrack = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (isLocked) return;
      removeTracks(activePlaylistId, [id]);
  };

  // --- KEYBOARD LISTENERS ---
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Delete' && selectedTrackIds.size > 0 && !isLocked) {
              handleDeleteSelected();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTrackIds, isLocked, activePlaylistId]);

  // --- TRACK DRAG & DROP ---
  const handleTrackDragStart = (e: React.DragEvent, _index: number, trackId: string) => {
      if (isLocked) { e.preventDefault(); return; }
      
      // Store which playlist the drag originated from
      setDragSourcePlaylistId(activePlaylistId);

      // If dragging an unselected item, select it alone
      if (!selectedTrackIds.has(trackId)) {
          setSelectedTrackIds(new Set([trackId]));
          setDraggedTrackIds([trackId]);
      } else {
          setDraggedTrackIds(Array.from(selectedTrackIds));
      }
      
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleTrackDragOver = (e: React.DragEvent, _index: number) => {
      e.preventDefault(); // Allow dropping
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
  };

  const handleTrackDrop = (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      if (isLocked || draggedTrackIds.length === 0) return;

      // Handle Cross-Playlist Drop (Moving tracks from source tab to current tab)
      if (dragSourcePlaylistId && dragSourcePlaylistId !== activePlaylistId) {
          moveTracksToPlaylist(dragSourcePlaylistId, draggedTrackIds, activePlaylistId);
          setDraggedTrackIds([]);
          setSelectedTrackIds(new Set());
          setDragSourcePlaylistId(null);
          return;
      }

      // Handle Reorder within same playlist
      const sourceIndices = draggedTrackIds
          .map(id => tracks.findIndex(t => t.id === id))
          .filter(idx => idx !== -1);

      if (sourceIndices.length > 0) {
          reorderTracks(activePlaylistId, sourceIndices, targetIndex);
      }
      setDraggedTrackIds([]);
      setDragSourcePlaylistId(null);
  };

  // --- LIST CONTAINER DRAG & DROP (For Files & Empty Space) ---
  const handleListDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation(); // Stop propagation to prevent MainScreen highlight
      if (!isLocked) setIsListDragOver(true);
  };

  const handleListDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation(); // Stop propagation to prevent MainScreen highlight
      if (!isLocked && !isListDragOver) setIsListDragOver(true);
  };

  const handleListDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Only set to false if we are actually leaving the container, not entering a child
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setIsListDragOver(false);
  };

  const handleListDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsListDragOver(false);

      if (isLocked) return;

      // 1. Check for Files
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          onFilesSelected(e.dataTransfer.files);
          return;
      }

      // 2. Check for Track Drag (dropping in empty space or cross-playlist)
      if (draggedTrackIds.length > 0) {
          if (dragSourcePlaylistId && dragSourcePlaylistId !== activePlaylistId) {
              // Move from other playlist to this one
              moveTracksToPlaylist(dragSourcePlaylistId, draggedTrackIds, activePlaylistId);
          } else {
              // Same playlist, dragged to empty space -> move to end
              // Use the reorder logic targeting the end
              const sourceIndices = draggedTrackIds
                  .map(id => tracks.findIndex(t => t.id === id))
                  .filter(idx => idx !== -1);
              if (sourceIndices.length > 0) {
                  reorderTracks(activePlaylistId, sourceIndices, tracks.length);
              }
          }
          setDraggedTrackIds([]);
          setSelectedTrackIds(new Set());
          setDragSourcePlaylistId(null);
      }
  };

  return (
    <div 
        id="tutorial-player" 
        className="relative w-full h-full flex flex-col bg-theme-bg border-l-4 border-theme-panel p-4 shadow-inner"
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} // Stop drag bubbling for the whole panel
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }} 
    >
      
      {/* Animated Confirmation Modal for Clear */}
      {showClearConfirm && (
        <ConfirmModal 
          onConfirm={confirmClear} 
          onCancel={() => setShowClearConfirm(false)} 
          translationKey="confirm_clear"
        />
      )}

      {/* Animated Confirmation Modal for Tab Delete */}
      {showTabDeleteConfirm && (
        <ConfirmModal 
          onConfirm={confirmDeleteTab} 
          onCancel={() => { setShowTabDeleteConfirm(false); setTabToDelete(null); }} 
          translationKey="confirm_delete_tab"
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
                onClick={() => !isLocked && fileInputRef.current?.click()}
                disabled={isLocked}
                className={`flex items-center gap-2 px-3 py-2 bg-theme-panel border border-theme-accent text-theme-accent rounded transition-colors ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-theme-accent hover:text-black'}`}
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
            <NeonButton id="tutorial-play-btn" onClick={onPause} variant="primary" className="w-16 h-16">
                <Pause size={32} />
            </NeonButton>
          </Tooltip>
        ) : (
          <Tooltip content="PLAY" position="top">
            <NeonButton id="tutorial-play-btn" onClick={onPlay} variant="primary" className="w-16 h-16">
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
             const isDragTarget = dragOverTabId === playlist.id;
             
             return (
             <div 
                key={playlist.id}
                draggable={!isLocked}
                onDragStart={(e) => handleTabDragStart(e, playlist.id)}
                onDragOver={(e) => handleTabDragOver(e, playlist.id)}
                onDragLeave={handleTabDragLeave}
                onDrop={(e) => handleTabDrop(e, playlist.id)}
                onClick={() => onSwitchPlaylist(playlist.id)}
                onDoubleClick={() => startRename(playlist.id, playlist.name)}
                className={`
                    group flex items-center gap-2 px-3 py-1.5 rounded-t-md text-xs font-mono cursor-pointer transition-all border-t border-l border-r shrink-0
                    ${isDragTarget
                        ? 'bg-theme-accent text-black font-bold scale-105 shadow-[0_0_15px_var(--color-accent)] z-10 border-theme-accent'
                        : playlist.id === activePlaylistId 
                            ? 'bg-theme-panel border-theme-secondary text-theme-secondary font-bold shadow-[0_-2px_10px_rgba(0,0,0,0.2)]' 
                            : 'bg-theme-bg border-theme-border text-theme-muted hover:bg-theme-panel hover:text-theme-text'
                    }
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
                
                {playlists.length > 1 && !isLocked && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); requestDeleteTab(playlist.id); }}
                        className="opacity-0 group-hover:opacity-100 text-theme-muted hover:text-red-500 transition-opacity p-0.5"
                    >
                        <X size={10} />
                    </button>
                )}
             </div>
         )})}
         
         {!isLocked && (
            <button 
                onClick={onAddPlaylist}
                onDragOver={handlePlusDragOver}
                onDragLeave={handlePlusDragLeave}
                onDrop={handlePlusDrop}
                className={`
                    px-2 py-1.5 rounded-t-md border transition-all duration-200
                    ${isPlusDragOver 
                        ? 'bg-theme-accent border-theme-accent text-black scale-110 shadow-[0_0_15px_var(--color-accent)]' 
                        : 'bg-theme-panel border-theme-border text-theme-muted hover:text-theme-accent hover:border-theme-accent'
                    }
                `}
            >
                <Plus size={14} className={isPlusDragOver ? "animate-pulse" : ""} />
            </button>
         )}
      </div>

      {/* Playlist Content */}
      <div 
        className={`flex-1 overflow-hidden flex flex-col border-t border-theme-border bg-theme-bg/50 transition-all duration-300 relative
            ${isListDragOver ? 'border-2 border-theme-primary shadow-[inset_0_0_20px_var(--color-primary)]' : ''}
        `}
        onDragEnter={handleListDragEnter}
        onDragOver={handleListDragOver}
        onDragLeave={handleListDragLeave}
        onDrop={handleListDrop}
      >
        
        {/* TV Style Drop Overlay */}
        {isListDragOver && !isLocked && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm border-4 border-dashed border-theme-primary rounded-lg m-2 pointer-events-none animate-pulse">
                <div className="flex flex-col items-center gap-4 text-theme-primary font-mono drop-shadow-[0_0_10px_var(--color-primary)]">
                  <Upload size={48} />
                  <span className="text-xl font-bold tracking-widest">DROP FILES HERE</span>
                </div>
            </div>
        )}

        <div className="flex items-center justify-between p-2 border-b border-theme-border">
            <div className="flex items-center gap-2">
                <h3 className="text-theme-text font-mono opacity-80 text-xs">TRACKS [{tracks.length}]</h3>
                <Tooltip content={isLocked ? "UNLOCK PLAYLIST" : "LOCK PLAYLIST"} position="top">
                    <button 
                        onClick={() => setIsLocked(!isLocked)}
                        className={`p-1 rounded transition-colors ${isLocked ? 'text-red-500 hover:text-red-400' : 'text-theme-muted hover:text-theme-primary'}`}
                    >
                        {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                </Tooltip>
            </div>
            {tracks.length > 0 && !isLocked && (
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
        
        {/* Track List */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-1 p-1">
          {tracks.map((track, index) => {
            const isPlayingTrack = index === currentTrackIndex && activePlaylistId === playingPlaylistId;
            const isSelected = selectedTrackIds.has(track.id);
            
            return (
            <div
              key={track.id}
              draggable={!isLocked}
              onDragStart={(e) => handleTrackDragStart(e, index, track.id)}
              onDragOver={(e) => handleTrackDragOver(e, index)}
              onDrop={(e) => handleTrackDrop(e, index)}
              onClick={(e) => handleTrackClick(e, index, track.id)}
              onDoubleClick={() => handleTrackDoubleClick(index)}
              className={`
                group flex items-center gap-3 p-2 rounded cursor-pointer transition-all border
                ${isPlayingTrack 
                  ? 'bg-theme-panel border-theme-secondary shadow-[inset_0_0_5px_var(--color-secondary)]' 
                  : isSelected 
                    ? 'bg-theme-primary/20 border-theme-primary' 
                    : 'border-transparent hover:bg-theme-panel hover:border-theme-border'}
              `}
            >
              <div className={`
                ${isPlayingTrack ? 'text-theme-secondary animate-pulse' : 'text-theme-muted group-hover:text-theme-primary'}
              `}>
                <Music size={16} />
              </div>
              <span className={`
                text-sm font-mono truncate w-full select-none
                ${isPlayingTrack ? 'text-theme-secondary' : isSelected ? 'text-theme-primary font-bold' : 'text-theme-muted group-hover:text-theme-text'}
              `}>
                {track.name}
              </span>
              
              {!isLocked && (
                  <button 
                    onClick={(e) => handleDeleteTrack(e, track.id)}
                    className="opacity-0 group-hover:opacity-100 text-theme-muted hover:text-red-500 transition-opacity p-1"
                    title="Delete Track"
                  >
                      <Trash2 size={14} />
                  </button>
              )}
            </div>
          )})}
          
          {/* Empty State / Drop Message (Visual fallback if overlay fails) */}
          {tracks.length === 0 && !isListDragOver && (
            <div className={`text-center py-10 font-mono text-sm italic transition-colors text-theme-muted`}>
              {isLocked ? "List Locked" : "Drop files here..."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Controls;
