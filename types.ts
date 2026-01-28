
export interface AudioTrack {
  id: string;
  playlistId: string; // New field to link track to a playlist
  name: string;
  url: string;
  file: File;
  artworkUrl?: string; // NEW: Album art blob URL
}

export interface Playlist {
  id: string;
  name: string;
  order: number;
  tracks: AudioTrack[];
}

export interface BackgroundMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  file: File;
}

// NEW: Ambience File Type
export interface AmbienceFile {
  id: string;
  name: string;
  url: string;
  file: File;
}

// NEW: Ambience Configuration
export interface AmbienceConfig {
  activeId: string | null;
  isPlaying: boolean;
  volume: number;
}

// NEW: System Audio Configuration
export interface SystemAudioConfig {
  enabled: boolean;
  volume: number;
  monitor: boolean; // Playback to speakers? (Avoid feedback loop)
}

export interface PlayerState {
  isPlaying: boolean;
  currentTrackIndex: number;
  playlists: Playlist[];
  activePlaylistId: string;
}

// --- MUSIC EDITOR TYPES ---
export type InstrumentType = 'kick' | 'snare' | 'hihat' | 'clap' | 'bass' | 'lead';

export interface EditorInstrument {
  id: string;
  name: string;
  type: InstrumentType;
  color: string;
  volume: number; // 0 to 1
  steps: boolean[]; // Array of 16 steps
  pitch?: number; // Optional pitch tweak
}

export interface EditorState {
  bpm: number;
  isPlaying: boolean;
  currentStep: number;
  instruments: EditorInstrument[];
}
// --------------------------

export const NEON_COLORS = [
  '#00f3ff', // Blue
  '#ff00ff', // Pink
  '#00ff00', // Green
  '#bc13fe', // Purple
  '#f9f871', // Yellow
  '#ff3333', // Red
];

export type VisualizerStyle = 'retro' | 'blue' | 'pink' | 'matrix' | 'inferno' | 'warm' | 'gray' | 'ocean' | 'theme-blue' | 'theme-sync';
export type VisualizerPosition = 'center' | 'top' | 'bottom';
export type TipColor = 'white' | 'blue' | 'pink' | 'green' | 'purple' | 'yellow' | 'red';
export type CursorStyle = 'default' | 'classic-blue' | 'classic-warm' | 'classic-white' | 'classic-ocean' | 'theme-sync' | 'dos-terminal' | 'system' | 'crosshair' | 'rounded';

export type ThemeType = 'neon-retro' | 'neon-blue' | 'warm-cozy' | 'neutral-gray' | 'neutral-ocean';
export type ControlStyle = 'default' | 'round' | 'circle';
export type BgTransitionType = 'glitch' | 'leaks' | 'none'; // NEW

// NEW: View Mode for Application Layout
export type ViewMode = 'default' | 'cinema' | 'mini';

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
  tipColor: TipColor; // NEW: Color of the tip
  tipGlow: boolean; // NEW: Enable glow for tip
  normalize: boolean;
  preventVolumeScaling: boolean; // NEW: Ignore volume level for visuals
  minFrequency: number;
  maxFrequency: number;
  barGap: number;
  mirror: boolean;
  segmented: boolean;
  segmentHeight: number; 
  segmentGap: number; 
  highlightLastBrick: boolean; // NEW: Highlight the top-most brick
  barGravity: number; // NEW: Gravity/Decay for the bars themselves
}

export interface DvdConfig {
  size: number;
  speed: number;
  opacity: number;
  enableSfx: boolean;
  logoType: 'dvd' | 'neon_waves';
}

export interface MarqueeConfig {
  enabled: boolean;
  style: VisualizerStyle; // New: Visual style for text color
  showProgress: boolean; 
  progressMode: 'continuous' | 'blocks'; // New
  progressHeight: number; // New
  progressOpacity: number; // New
  speed: number;
  opacity: number;
  fontSize: number;
}

export interface WatermarkConfig {
  scale: number;
  opacity: number;
  flashIntensity: number; // 0 to 1
}

export type HologramCategory = 'system' | 'interactive' | 'music' | 'motivational' | 'philosophy' | 'space';

export interface GeminiChatConfig {
  enabled: boolean;
  opacity: number;
  scale: number; // Deprecated in UI but kept for type safety
  width?: number; // New: Width in pixels
  typingSpeed: number; // 1 = Normal
  color?: string;
  categories: Record<HologramCategory, boolean>;
}

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
    color?: string; // NEW: Specific color for hologram
    enableIcons: boolean; // NEW: Enable graphical icons
    categories: Record<HologramCategory, boolean>;
  };
  geminiChat: GeminiChatConfig; // NEW
  lightLeaks: {
    enabled: boolean;
    intensity: number; // Opacity
    speed: number; // Movement speed
    number: number; // Amount of blobs
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
    reactorConfig?: VisualizerConfig; // NEW: Independent 3D Reactor config
    dvdConfig: DvdConfig;
    effectsConfig: EffectsConfig;
    marqueeConfig: MarqueeConfig;
    watermarkConfig?: WatermarkConfig; // Optional for backward compatibility
    bgColor: string;
    bgPattern: string;
    bgPatternConfig: PatternConfig;
    showVisualizer: boolean;
    showVisualizer3D?: boolean; // NEW: Independent toggle
    showDvd: boolean;
    bgAutoplayInterval: number;
    cursorStyle?: CursorStyle;
    retroScreenCursorStyle?: CursorStyle; // NEW
    theme?: ThemeType;
    controlStyle?: ControlStyle;
    bgTransition?: BgTransitionType; // New
    ambienceConfig?: AmbienceConfig; // NEW
  }
}