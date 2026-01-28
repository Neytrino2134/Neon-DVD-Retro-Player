
import React, { useRef, useState, useEffect } from 'react';
import { FolderOpen, Lock, Unlock, ArrowDownAZ, Shuffle, Trash2, Upload, Music, Activity } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { useLanguage } from '../../contexts/LanguageContext';
import { AudioTrack, VisualizerConfig } from '../../types';
import ConfirmModal from '../ConfirmModal';
import Visualizer from '../Visualizer';

interface TrackListProps {
  tracks: AudioTrack[];
  activePlaylistId: string;
  playingPlaylistId: string;
  currentTrackIndex: number;
  
  // Visualizer Props
  analyser?: AnalyserNode | null;
  visualizerConfig?: VisualizerConfig;
  isPlaying?: boolean;
  volume?: number;

  // Actions
  onTrackSelect: (index: number) => void;
  onFilesSelected: (files: FileList) => void;
  // Insert files at specific index
  onFilesInserted?: (files: File[], index: number) => void;
  onClearPlaylist: () => void;
  onSort: () => void;
  onShuffle: () => void;
  removeTracks: (playlistId: string, trackIds: string[]) => void;
  reorderTracks: (playlistId: string, sourceIndices: number[], targetIndex: number) => void;
  moveTracksToPlaylist: (sourceId: string, trackIds: string[], targetId: string) => void;

  // Drag State Props
  setDraggedTrackIds: (ids: string[]) => void;
  setDragSourcePlaylistId: (id: string | null) => void;
  draggedTrackIds: string[];
  dragSourcePlaylistId: string | null;
}

export const TrackList: React.FC<TrackListProps> = ({
  tracks, activePlaylistId, playingPlaylistId, currentTrackIndex,
  analyser, visualizerConfig, isPlaying = false, volume = 1,
  onTrackSelect, onFilesSelected, onFilesInserted, onClearPlaylist, onSort, onShuffle, removeTracks, reorderTracks, moveTracksToPlaylist,
  setDraggedTrackIds, setDragSourcePlaylistId, draggedTrackIds, dragSourcePlaylistId
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  
  const [isLocked, setIsLocked] = useState(false);
  const [showBgVisualizer, setShowBgVisualizer] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [lastSelectedTrackIndex, setLastSelectedTrackIndex] = useState<number>(-1);
  const [isListDragOver, setIsListDragOver] = useState(false);
  
  // New state for insertion line
  // index: where to insert (before which track index)
  // position: 'top' or 'bottom' relative to the item being hovered
  const [dropIndicator, setDropIndicator] = useState<{ index: number, position: 'top' | 'bottom' } | null>(null);

  // Drag counter to safely handle enter/leave on children
  const dragCounterRef = useRef(0);
  
  // Ref to track hover state for hotkeys
  const listHoverRef = useRef(false);

  // Clear selection if switching tabs
  useEffect(() => {
      setSelectedTrackIds(new Set());
      setLastSelectedTrackIndex(-1);
      // Reset drag state on tab switch to prevent stuck overlay
      dragCounterRef.current = 0;
      setIsListDragOver(false);
      setDropIndicator(null);
  }, [activePlaylistId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      e.target.value = '';
    }
  };

  const handleTrackClick = (e: React.MouseEvent, index: number, trackId: string) => {
      if (isLocked) return;

      const newSelection = new Set(selectedTrackIds);

      if (e.shiftKey && lastSelectedTrackIndex !== -1) {
          const start = Math.min(lastSelectedTrackIndex, index);
          const end = Math.max(lastSelectedTrackIndex, index);
          if (!e.ctrlKey && !e.metaKey) {
              newSelection.clear();
          }
          for (let i = start; i <= end; i++) {
              if (tracks[i]) newSelection.add(tracks[i].id);
          }
      } else if (e.ctrlKey || e.metaKey) {
          if (newSelection.has(trackId)) {
              newSelection.delete(trackId);
          } else {
              newSelection.add(trackId);
          }
          setLastSelectedTrackIndex(index);
      } else {
          newSelection.clear();
          newSelection.add(trackId);
          setLastSelectedTrackIndex(index);
      }
      setSelectedTrackIds(newSelection);
  };

  const handleTrackDoubleClick = (index: number) => {
      if (!isLocked) onTrackSelect(index);
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

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // DELETE Selected
          if (e.key === 'Delete' && selectedTrackIds.size > 0 && !isLocked) {
              handleDeleteSelected();
          }

          // CTRL + A (Select All)
          // Only triggers if the mouse is currently hovering over the tracklist
          if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyA')) {
              if (listHoverRef.current && !isLocked && tracks.length > 0) {
                  e.preventDefault(); // Prevent browser text selection
                  const allIds = new Set(tracks.map(t => t.id));
                  setSelectedTrackIds(allIds);
              }
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTrackIds, isLocked, activePlaylistId, tracks]);

  // Drag Handlers
  const handleTrackDragStart = (e: React.DragEvent, _index: number, trackId: string) => {
      if (isLocked) { e.preventDefault(); return; }
      setDragSourcePlaylistId(activePlaylistId);
      
      let draggingIds: string[] = [];
      if (!selectedTrackIds.has(trackId)) {
          setSelectedTrackIds(new Set([trackId]));
          draggingIds = [trackId];
      } else {
          draggingIds = Array.from(selectedTrackIds);
      }
      
      setDraggedTrackIds(draggingIds);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleTrackDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault(); 
      e.stopPropagation(); // Stop bubbling to list container to avoid double handling
      
      if (isLocked) return;

      // Set proper drop effect
      if (draggedTrackIds.length > 0) {
          e.dataTransfer.dropEffect = 'move';
      } else {
          e.dataTransfer.dropEffect = 'copy';
      }

      // Calculate if we are in the top or bottom half of the item
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const midPoint = rect.top + rect.height / 2;
      
      if (e.clientY < midPoint) {
          setDropIndicator({ index: index, position: 'top' });
      } else {
          setDropIndicator({ index: index, position: 'bottom' });
      }
  };

  const handleTrackDragLeave = () => {
      setDropIndicator(null);
  };

  const handleTrackDrop = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Calculate final target index based on drop position
      // If we dropped on "top" of item 5, we insert at 5.
      // If we dropped on "bottom" of item 5, we insert at 6.
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const midPoint = rect.top + rect.height / 2;
      const targetIndex = e.clientY < midPoint ? index : index + 1;

      // Reset UI states
      setDropIndicator(null);
      dragCounterRef.current = 0;
      setIsListDragOver(false);

      if (isLocked) return;

      // 1. Handle File Drop (Insertion)
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          if (onFilesInserted) {
              onFilesInserted(Array.from(e.dataTransfer.files), targetIndex);
          } else {
              // Fallback to append if insert not supported
              onFilesSelected(e.dataTransfer.files);
          }
          return;
      }

      // 2. Handle Reorder (Internal Drag)
      if (draggedTrackIds.length > 0) {
          if (dragSourcePlaylistId && dragSourcePlaylistId !== activePlaylistId) {
              moveTracksToPlaylist(dragSourcePlaylistId, draggedTrackIds, activePlaylistId);
          } else {
              const sourceIndices = draggedTrackIds
                  .map(id => tracks.findIndex(t => t.id === id))
                  .filter(idx => idx !== -1);

              if (sourceIndices.length > 0) {
                  reorderTracks(activePlaylistId, sourceIndices, targetIndex);
              }
          }
          setDraggedTrackIds([]);
          setSelectedTrackIds(new Set());
          setDragSourcePlaylistId(null);
      }
  };

  const handleListDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation(); 
      if (!isLocked) {
          dragCounterRef.current += 1;
          if (e.dataTransfer.types.includes('Files') || draggedTrackIds.length > 0) {
              setIsListDragOver(true);
          }
      }
  };

  const handleListDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation(); 
      
      if (draggedTrackIds.length > 0) {
          e.dataTransfer.dropEffect = 'move';
      }

      // If we are dragging over the list but NOT over a specific track (e.g. empty space at bottom),
      // clear the track-specific indicator
      setDropIndicator(null); 

      if (!isLocked && dragCounterRef.current > 0 && !isListDragOver) {
          setIsListDragOver(true);
      }
  };

  const handleListDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
          dragCounterRef.current = 0; 
          setIsListDragOver(false);
          setDropIndicator(null);
      }
  };

  const handleListDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      dragCounterRef.current = 0;
      setIsListDragOver(false);
      setDropIndicator(null);

      if (isLocked) return;

      // Drop on empty space = Append to end
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          onFilesSelected(e.dataTransfer.files);
          return;
      }

      if (draggedTrackIds.length > 0) {
          if (dragSourcePlaylistId && dragSourcePlaylistId !== activePlaylistId) {
              moveTracksToPlaylist(dragSourcePlaylistId, draggedTrackIds, activePlaylistId);
          } else {
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
        className={`flex-1 overflow-hidden flex flex-col h-full relative z-10 transition-colors duration-300
            ${isListDragOver ? 'bg-theme-accent/5' : ''}
        `}
        onDragEnter={handleListDragEnter}
        onDragOver={handleListDragOver}
        onDragLeave={handleListDragLeave}
        onDrop={handleListDrop}
        onMouseEnter={() => listHoverRef.current = true}
        onMouseLeave={() => listHoverRef.current = false}
    >
        {showClearConfirm && (
            <ConfirmModal 
            onConfirm={() => { onClearPlaylist(); setShowClearConfirm(false); }} 
            onCancel={() => setShowClearConfirm(false)} 
            translationKey="confirm_clear"
            />
        )}

        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept="audio/*"
            className="hidden"
            style={{ display: 'none' }} 
        />

        {/* Global List Overlay (Only shows when hovering empty space OR if list is empty) */}
        {isListDragOver && !isLocked && !dropIndicator && tracks.length === 0 && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm m-2 rounded-lg pointer-events-none animate-pulse">
                <div className="flex flex-col items-center gap-4 text-theme-primary font-mono drop-shadow-[0_0_10px_var(--color-primary)]">
                <Upload size={48} />
                <span className="text-xl font-bold tracking-widest">DROP TO APPEND</span>
                </div>
            </div>
        )}

        {/* List Header */}
        <div className="flex items-center justify-between p-3 bg-black/20 shrink-0 relative z-20">
            <div className="flex items-center gap-2">
                <h3 className="text-theme-text font-mono opacity-50 text-xs font-bold tracking-widest mr-1">TRACKS [{tracks.length}]</h3>
                
                <Tooltip content={isLocked ? "UNLOCK PLAYLIST" : "LOCK PLAYLIST"} position="top">
                    <button 
                        onClick={() => setIsLocked(!isLocked)}
                        className={`p-1 rounded transition-colors ${isLocked ? 'text-red-500 hover:text-red-400' : 'text-theme-muted hover:text-theme-primary'}`}
                    >
                        {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                </Tooltip>

                {/* Playlist Visualizer Toggle */}
                {analyser && visualizerConfig && (
                    <Tooltip content="BG VISUALIZER" position="top">
                        <button 
                            onClick={() => setShowBgVisualizer(!showBgVisualizer)}
                            className={`p-1 rounded transition-colors ${showBgVisualizer ? 'text-theme-accent hover:text-white' : 'text-theme-muted hover:text-theme-accent'}`}
                        >
                            <Activity size={12} />
                        </button>
                    </Tooltip>
                )}
            </div>
            {/* Toolbar */}
            <div className="flex items-center gap-2">
                <Tooltip content="LOAD FILES" position="top">
                    <button
                        onClick={() => !isLocked && fileInputRef.current?.click()}
                        disabled={isLocked}
                        className={`p-1.5 rounded transition-colors ${isLocked ? 'opacity-30 cursor-not-allowed' : 'text-theme-muted hover:text-theme-accent hover:bg-white/5'}`}
                    >
                        <FolderOpen size={14} />
                    </button>
                </Tooltip>
                
                {tracks.length > 0 && !isLocked && (
                    <>
                        <div className="w-px h-3 bg-white/10 mx-1"></div>
                        <Tooltip content={t('sort_az')} position="top">
                            <button 
                                onClick={onSort} 
                                className="text-theme-muted hover:text-theme-primary transition-colors p-1.5 hover:bg-white/5 rounded"
                            >
                                <ArrowDownAZ size={14} />
                            </button>
                        </Tooltip>
                        <Tooltip content={t('shuffle')} position="top">
                            <button 
                                onClick={onShuffle} 
                                className="text-theme-muted hover:text-theme-secondary transition-colors p-1.5 hover:bg-white/5 rounded"
                            >
                                <Shuffle size={14} />
                            </button>
                        </Tooltip>
                        <Tooltip content={t('clear_playlist')} position="top">
                            <button 
                                type="button"
                                onClick={(e) => {
                                    if (e.shiftKey) {
                                        onClearPlaylist();
                                    } else {
                                        setShowClearConfirm(true);
                                    }
                                }} 
                                className="text-theme-muted hover:text-red-500 transition-colors ml-1 p-1.5 hover:bg-red-500/10 rounded"
                            >
                                <Trash2 size={14} />
                            </button>
                        </Tooltip>
                    </>
                )}
            </div>
        </div>
        
        {/* Track List Items Container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-0.5 p-1 flex flex-col min-h-0 relative z-10 transition-colors duration-300 w-full relative">
            
            {/* Background Visualizer Layer */}
            {showBgVisualizer && analyser && visualizerConfig && (
                <div className="absolute inset-0 pointer-events-none opacity-30 z-0 overflow-hidden mix-blend-screen">
                    <Visualizer 
                        analyser={analyser} 
                        isPlaying={isPlaying} 
                        config={visualizerConfig} 
                        fps={60} 
                        volume={volume} 
                    />
                </div>
            )}

            {tracks.map((track, index) => {
                const isPlayingTrack = index === currentTrackIndex && activePlaylistId === playingPlaylistId;
                const isSelected = selectedTrackIds.has(track.id);
                const isLineAbove = dropIndicator?.index === index && dropIndicator.position === 'top';
                const isLineBelow = dropIndicator?.index === index && dropIndicator.position === 'bottom';
                
                return (
                <div
                key={track.id}
                draggable={!isLocked}
                onDragStart={(e) => handleTrackDragStart(e, index, track.id)}
                onDragOver={(e) => handleTrackDragOver(e, index)}
                onDragLeave={handleTrackDragLeave}
                onDrop={(e) => handleTrackDrop(e, index)}
                onClick={(e) => handleTrackClick(e, index, track.id)}
                onDoubleClick={() => handleTrackDoubleClick(index)}
                className={`
                    group flex items-center gap-3 px-3 py-2.5 rounded transition-all cursor-pointer relative overflow-visible shrink-0 z-10
                    ${isPlayingTrack 
                    ? '' 
                    : isSelected 
                        ? 'bg-white/10 text-white' 
                        : 'text-theme-muted hover:bg-white/5 hover:text-theme-text'}
                `}
                style={isPlayingTrack ? {
                    backgroundColor: 'color-mix(in srgb, var(--color-primary), transparent 85%)',
                    color: 'var(--color-primary)'
                } : undefined}
                >
                {/* Active Indicator Bar */}
                {isPlayingTrack && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-primary shadow-[0_0_10px_var(--color-primary)]"></div>
                )}

                {/* Drop Indicator Lines */}
                {isLineAbove && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-theme-accent shadow-[0_0_10px_var(--color-accent)] z-50 pointer-events-none"></div>
                )}
                {isLineBelow && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-theme-accent shadow-[0_0_10px_var(--color-accent)] z-50 pointer-events-none"></div>
                )}

                <div className={`
                    ${isPlayingTrack ? 'animate-pulse' : 'opacity-30 group-hover:opacity-100'}
                `}>
                    <Music size={14} />
                </div>
                <div className="flex-1 min-w-0">
                    <span className={`
                        block text-xs font-mono truncate w-full select-none
                        ${isPlayingTrack ? 'font-bold' : ''}
                    `}>
                        {track.name}
                    </span>
                </div>
                
                {!isLocked && (
                    <button 
                        onClick={(e) => handleDeleteTrack(e, track.id)}
                        className="opacity-0 group-hover:opacity-100 text-theme-muted hover:text-red-500 transition-opacity p-1 cursor-pointer"
                        title="Delete Track"
                    >
                        <Trash2 size={12} />
                    </button>
                )}
                </div>
            )})}
            
            {/* Filler for empty space */}
            {tracks.length > 0 && (
                    <div className="flex-1 min-h-[20px]"></div>
            )}

            {tracks.length === 0 && !isListDragOver && (
                <div className={`flex-1 flex items-center justify-center text-center m-2 rounded-lg bg-white/5 text-theme-muted opacity-30 font-mono text-xs italic transition-all select-none z-10`}>
                {isLocked ? "List Locked" : "Drop files here..."}
                </div>
            )}
        </div>
    </div>
  );
};
