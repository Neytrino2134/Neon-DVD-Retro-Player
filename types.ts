
export interface AudioTrack {
  id: string;
  name: string;
  url: string;
  file: File;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTrackIndex: number;
  tracks: AudioTrack[];
}

export const NEON_COLORS = [
  '#00f3ff', // Blue
  '#ff00ff', // Pink
  '#00ff00', // Green
  '#bc13fe', // Purple
  '#f9f871', // Yellow
  '#ff3333', // Red
];

export type VisualizerStyle = 'retro' | 'blue' | 'pink' | 'matrix' | 'inferno';
export type VisualizerPosition = 'center' | 'top' | 'bottom';

export interface VisualizerConfig {
  style: VisualizerStyle;
  position: VisualizerPosition;
  barCount: number; // Maps to FFT Size (e.g., 64, 128, 256)
  sensitivity: number; // 0.5 to 3.0
  fillOpacity: number; // 0 to 1
  strokeEnabled: boolean;
  strokeOpacity: number; // 0 to 1
}
