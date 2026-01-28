
import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, Radio } from 'lucide-react';
import { AudioTrack, Playlist, ViewMode, VisualizerConfig } from '../types';
import { Tooltip } from './ui/Tooltip';
import ConfirmModal from './ConfirmModal';

// Sub-Components
import { TrackInfo } from './controls/TrackInfo';
import { VolumeControl } from './controls/VolumeControl';
import { TransportControls } from './controls/TransportControls';
import { PlaylistTabs } from './controls/PlaylistTabs';
import { TrackList } from './controls/TrackList';

interface ControlsProps {
  viewMode?: ViewMode;
  onToggleMiniMode?: () => void;
  tracks: AudioTrack[];
  playlists: Playlist[];
  activePlaylistId: string;
  playingPlaylistId: string;
  currentTrackIndex: number;
  currentTrack: AudioTrack | undefined;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  
  // Visualizer Props for Playlist Background
  analyser?: AnalyserNode | null;
  visualizerConfig?: VisualizerConfig;

  onVolumeChange: (vol: number) => void;
  onSeek: (time: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrev: () => void;
  onTrackSelect: (index: number) => void;
  onFilesSelected: (files: FileList) => void;
  // New prop for precise insertion
  onFilesInserted: (files: File[], index: number) => void;
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

const Controls: React.FC<ControlsProps> = ({
  viewMode = 'default',
  onToggleMiniMode,
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
  analyser,
  visualizerConfig,
  onVolumeChange,
  onSeek,
  onPlay,
  onPause,
  onStop,
  onNext,
  onPrev,
  onTrackSelect,
  onFilesSelected,
  onFilesInserted,
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
  // Drag State shared between TrackList and PlaylistTabs
  const [draggedTrackIds, setDraggedTrackIds] = useState<string[]>([]);
  const [dragSourcePlaylistId, setDragSourcePlaylistId] = useState<string | null>(null);
  
  // Playlist Deletion Confirmation State
  const [playlistToDelete, setPlaylistToDelete] = useState<string | null>(null);

  // Refs for mathematical wave animation
  const wavePath1Ref = useRef<SVGPathElement>(null);
  const wavePath2Ref = useRef<SVGPathElement>(null);
  const wavePath3Ref = useRef<SVGPathElement>(null);
  const animationRef = useRef<number>(0);

  // Hover state for Header/Info area to trigger wave acceleration and glow
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const isHeaderHoveredRef = useRef(false); // Ref for animation loop to avoid dependency staleness

  // Check if running in Electron.
  const isElectron = typeof navigator !== 'undefined' && /Electron/.test(navigator.userAgent);
  const isMini = viewMode === 'mini';

  // --- MATHEMATICAL WAVE GENERATOR ---
  useEffect(() => {
    let time = 0;
    
    // Base speed reduced further (Original was 0.00125)
    const BASE_SPEED = 0.000625; 
    const HOVER_SPEED = BASE_SPEED * 2.5; // Faster on hover relative to base
    let currentSpeed = BASE_SPEED;

    const animate = () => {
      // Smooth Acceleration Logic
      const targetSpeed = isHeaderHoveredRef.current ? HOVER_SPEED : BASE_SPEED;
      // Lerp current speed to target (0.05 smoothing factor)
      currentSpeed += (targetSpeed - currentSpeed) * 0.05;
      
      // Global time ticker
      time += currentSpeed;

      const width = 300; // SVG ViewBox Width
      const step = 5;
      
      // WAVE 1 (Front - Blue): Fast Speed, High Frequency
      const amp1 = 15 + 5 * Math.sin(time * 0.8); 
      // Calculate start point explicitly to avoid vertical line artifact
      const startY1 = 40 + amp1 * Math.sin(0 * 0.05 - time * 9);
      let points1 = `M0,${startY1}`;
      for (let x = step; x <= width; x += step) {
        const y = 40 + amp1 * Math.sin(x * 0.05 - time * 9);
        points1 += ` L${x},${y}`;
      }

      // WAVE 2 (Middle - Purple): Medium Speed
      const amp2 = 12 + 4 * Math.sin(time * 0.5 + 2);
      const startY2 = 50 + amp2 * Math.sin(0 * 0.03 - time * 4 + 1);
      let points2 = `M0,${startY2}`;
      for (let x = step; x <= width; x += step) {
        const y = 50 + amp2 * Math.sin(x * 0.03 - time * 4 + 1);
        points2 += ` L${x},${y}`;
      }

      // WAVE 3 (Back - Pink): Slow Speed, Low Frequency (Deep Breathing)
      const amp3 = 15 + 10 * Math.sin(time * 0.2 + 4);
      const startY3 = 45 + amp3 * Math.sin(0 * 0.015 - time * 1.5 + 3);
      let points3 = `M0,${startY3}`;
      for (let x = step; x <= width; x += step) {
        const y = 45 + amp3 * Math.sin(x * 0.015 - time * 1.5 + 3);
        points3 += ` L${x},${y}`;
      }

      if (wavePath1Ref.current) wavePath1Ref.current.setAttribute('d', points1);
      if (wavePath2Ref.current) wavePath2Ref.current.setAttribute('d', points2);
      if (wavePath3Ref.current) wavePath3Ref.current.setAttribute('d', points3);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handleHeaderMouseEnter = () => {
      setIsHeaderHovered(true);
      isHeaderHoveredRef.current = true;
  };

  const handleHeaderMouseLeave = () => {
      setIsHeaderHovered(false);
      isHeaderHoveredRef.current = false;
  };

  const clearDragState = () => {
      setDraggedTrackIds([]);
      setDragSourcePlaylistId(null);
  };

  const handleRequestRemovePlaylist = (id: string, force: boolean = false) => {
      if (force) {
          onRemovePlaylist(id);
          return;
      }
      
      const playlist = playlists.find(p => p.id === id);
      if (playlist && playlist.tracks.length === 0) {
          onRemovePlaylist(id);
          return;
      }

      setPlaylistToDelete(id);
  };

  const confirmRemovePlaylist = () => {
      if (playlistToDelete) {
          onRemovePlaylist(playlistToDelete);
          setPlaylistToDelete(null);
      }
  };

  // UPDATED STYLES FOR VISUAL HIERARCHY:
  const outerContainerClass = isMini 
    ? "relative w-full h-full flex flex-col bg-theme-bg overflow-hidden" 
    : "relative w-full h-full flex flex-col bg-theme-bg border-l-4 border-theme-panel shadow-inner p-4"; 

  const innerContainerClass = isMini
    ? "relative w-full h-full flex flex-col bg-theme-panel overflow-hidden" 
    : "relative w-full h-full flex flex-col bg-theme-panel rounded-xl overflow-hidden shadow-2xl border border-theme-border"; 

  return (
    // OUTER PANEL CONTAINER
    <div 
        id="tutorial-player" 
        className={outerContainerClass}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} 
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }} 
    >
      
      {/* INNER PLAYER DEVICE CONTAINER */}
      <div className={innerContainerClass}>

        {/* 
            INTERACTIVE ZONE: Header + Waves + TrackInfo
            Hovering this container triggers the wave effects
        */}
        <div 
            className="relative z-10"
            onMouseEnter={handleHeaderMouseEnter}
            onMouseLeave={handleHeaderMouseLeave}
        >
            {/* Background Graphic for Header - MATHEMATICAL WAVES */}
            <div className="absolute top-0 left-0 w-full h-48 overflow-hidden z-0 pointer-events-none">
                <svg viewBox="0 0 300 80" preserveAspectRatio="none" className="w-full h-full">
                    {/* Background Wave - Pink */}
                    <path 
                        ref={wavePath3Ref}
                        className="transition-all duration-500 ease-out"
                        style={{
                            stroke: '#ff00ff', // Pink
                            opacity: isHeaderHovered ? 1 : 0.1,
                            strokeWidth: isHeaderHovered ? 2.5 : 1.5,
                            filter: isHeaderHovered ? 'drop-shadow(0 0 8px #ff00ff)' : 'none'
                        }}
                        fill="none" 
                        vectorEffect="non-scaling-stroke"
                    />
                    {/* Mid Wave - Purple */}
                    <path 
                        ref={wavePath2Ref}
                        className="transition-all duration-500 ease-out"
                        style={{
                            stroke: '#bc13fe', // Purple
                            opacity: isHeaderHovered ? 1 : 0.15,
                            strokeWidth: isHeaderHovered ? 2 : 1.2,
                            filter: isHeaderHovered ? 'drop-shadow(0 0 8px #bc13fe)' : 'none'
                        }}
                        fill="none" 
                        vectorEffect="non-scaling-stroke"
                    />
                    {/* Front Wave - Blue */}
                    <path 
                        ref={wavePath1Ref}
                        className="transition-all duration-500 ease-out"
                        style={{
                            stroke: '#00f3ff', // Blue
                            opacity: isHeaderHovered ? 1 : 0.2,
                            strokeWidth: isHeaderHovered ? 1.5 : 1,
                            filter: isHeaderHovered ? 'drop-shadow(0 0 5px #00f3ff)' : 'none'
                        }}
                        fill="none" 
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
            </div>

            {/* Header - HIDDEN IN MINI MODE */}
            {!isMini && (
                <div className="flex items-center justify-between p-4 pb-2 shrink-0 relative z-10">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-full transition-all duration-500 ${isHeaderHovered ? 'bg-theme-primary/20 shadow-[0_0_10px_var(--color-primary)]' : 'bg-theme-primary/10'}`}>
                            <Radio className={`text-theme-primary transition-opacity ${isHeaderHovered ? 'opacity-100' : 'opacity-90'}`} size={16} />
                        </div>
                        <h2 className={`text-lg font-mono tracking-[0.2em] font-bold transition-all duration-500 ${isHeaderHovered ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : 'text-theme-text opacity-80'}`}>
                        NEON PLAYER
                        </h2>
                    </div>
                    {/* Mini Mode Toggle */}
                    {isElectron && onToggleMiniMode && (
                        <Tooltip content="FOCUS PLAYER" position="bottom">
                            <button 
                                onClick={onToggleMiniMode}
                                className="text-theme-muted hover:text-theme-accent transition-colors p-2 hover:bg-white/5 rounded-full"
                            >
                                <Smartphone size={18} />
                            </button>
                        </Tooltip>
                    )}
                </div>
            )}
            
            {isMini && <div className="h-4"></div>}

            {/* Info & Art */}
            <div className="px-4 relative z-10">
                <TrackInfo currentTrack={currentTrack} />
            </div>
        </div>

        {/* Control Grid - Height increased to h-44 */}
        <div className="flex gap-4 mb-4 h-44 shrink-0 relative z-10 px-4">
            <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
            
            <TransportControls 
                isPlaying={isPlaying} 
                onPlay={onPlay} 
                onPause={onPause} 
                onStop={onStop} 
                onNext={onNext} 
                onPrev={onPrev}
                currentTime={currentTime}
                duration={duration}
                onSeek={onSeek}
                trackId={currentTrack?.id}
            />
        </div>

        {/* Playlist Tabs - Added shrink-0 to prevent compression */}
        <div className="px-4 shrink-0">
            <PlaylistTabs 
                playlists={playlists}
                activePlaylistId={activePlaylistId}
                playingPlaylistId={playingPlaylistId}
                isPlaying={isPlaying}
                isLocked={false} 
                onSwitchPlaylist={onSwitchPlaylist}
                onAddPlaylist={onAddPlaylist}
                onRequestRemovePlaylist={handleRequestRemovePlaylist}
                onRenamePlaylist={onRenamePlaylist}
                onReorderPlaylists={onReorderPlaylists}
                draggedTrackIds={draggedTrackIds}
                dragSourcePlaylistId={dragSourcePlaylistId}
                moveTracksToPlaylist={moveTracksToPlaylist}
                onNewPlaylistWithTracks={onNewPlaylistWithTracks}
                onNewPlaylistWithFiles={onNewPlaylistWithFiles}
                clearDragState={clearDragState}
                onFilesSelected={onFilesSelected}
            />
        </div>

        {/* Track List - Fills remaining space */}
        <div className={`flex-1 min-h-0 overflow-hidden bg-theme-bg/40 shadow-inner border-t border-white/5
            ${isMini ? 'mx-0 mb-0 rounded-none border-x-0 border-b-0' : 'mx-4 mb-4 rounded-b-lg rounded-tr-lg'}
        `}>
            <TrackList 
                tracks={tracks}
                activePlaylistId={activePlaylistId}
                playingPlaylistId={playingPlaylistId}
                currentTrackIndex={currentTrackIndex}
                
                // Pass visualizer props
                analyser={analyser}
                visualizerConfig={visualizerConfig}
                isPlaying={isPlaying}
                volume={volume}

                onTrackSelect={onTrackSelect}
                onFilesSelected={onFilesSelected}
                onFilesInserted={onFilesInserted}
                onClearPlaylist={onClearPlaylist}
                onSort={onSort}
                onShuffle={onShuffle}
                removeTracks={removeTracks}
                reorderTracks={reorderTracks}
                moveTracksToPlaylist={moveTracksToPlaylist}
                setDraggedTrackIds={setDraggedTrackIds}
                setDragSourcePlaylistId={setDragSourcePlaylistId}
                draggedTrackIds={draggedTrackIds}
                dragSourcePlaylistId={dragSourcePlaylistId}
            />
        </div>

        {/* CONFIRMATION MODAL OVERLAY (Absolute over the player controls) */}
        {playlistToDelete && (
            <ConfirmModal 
                onConfirm={confirmRemovePlaylist}
                onCancel={() => setPlaylistToDelete(null)}
                translationKey="confirm_delete_tab"
            />
        )}
      </div>
    </div>
  );
};

export default Controls;
