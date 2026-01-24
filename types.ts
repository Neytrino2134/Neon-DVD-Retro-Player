
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
  barCount: number;
  sensitivity: number;
  fillOpacity: number;
  strokeEnabled: boolean;
  strokeOpacity: number;
  normalize: boolean;
  minFrequency: number;
  maxFrequency: number;
  barGap: number;
  mirror: boolean;
}

export interface DvdConfig {
  size: number;
  speed: number;
  opacity: number;
}

export interface MarqueeConfig {
  enabled: boolean;
  speed: number;
  opacity: number;
}

export interface EffectsConfig {
  fps: number;
  pixelation: number;
  noise: number;
  vhsJitter: number;
  scanlineEnabled: boolean;
  scanlineIntensity: number;
  scanlineThickness: number;
  glitch: {
    enabled: boolean;
    intensity: number;
    speed: number;
    opacity: number;
    variant: 'v1' | 'v2';
  };
  cyberHack: {
    enabled: boolean;
    speed: number;
    opacity: number;
    density: number;
    scale: number;
    backgroundOpacity: number;
  };
}
