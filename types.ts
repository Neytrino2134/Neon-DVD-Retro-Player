

export interface AudioTrack {
  id: string;
  name: string;
  url: string;
  file: File;
}

export interface BackgroundMedia {
  id: string;
  type: 'image' | 'video';
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
  showTips: boolean; 
  tipHeight: number; // New: Thickness of the tip
  tipSpeed: number; // New: Falling speed (gravity)
  normalize: boolean;
  minFrequency: number;
  maxFrequency: number;
  barGap: number;
  mirror: boolean;
  segmented: boolean;
  segmentHeight: number; 
  segmentGap: number; 
}

export interface DvdConfig {
  size: number;
  speed: number;
  opacity: number;
}

export interface MarqueeConfig {
  enabled: boolean;
  showProgress: boolean; 
  progressMode: 'continuous' | 'blocks'; // New
  progressHeight: number; // New
  progressOpacity: number; // New
  speed: number;
  opacity: number;
  fontSize: number;
}

export type HologramCategory = 'system' | 'interactive' | 'music' | 'motivational' | 'philosophy' | 'space';

export interface EffectsConfig {
  fps: number;
  pixelation: number;
  noise: number;
  chromaticAberration: number;
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
  debugConsole: {
    enabled: boolean;
    opacity: number;
    scale: number;
  };
  holograms: {
    enabled: boolean;
    opacity: number;
    speed: number; // Typing speed
    interval: number; // Seconds between messages
    scale: number;
    categories: Record<HologramCategory, boolean>;
  };
}

export interface CrossfadeConfig {
  enabled: boolean;
  duration: number; // Seconds
}

export interface PatternConfig {
  intensity: number;
  scale: number;
}

export interface AppPreset {
  id: string;
  name: string;
  createdAt: number;
  config: {
    visualizerConfig: VisualizerConfig;
    dvdConfig: DvdConfig;
    effectsConfig: EffectsConfig;
    marqueeConfig: MarqueeConfig;
    bgColor: string;
    bgPattern: string;
    bgPatternConfig: PatternConfig;
    showVisualizer: boolean;
    showDvd: boolean;
    bgAutoplayInterval: number;
  }
}