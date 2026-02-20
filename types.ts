
export const NEON_COLORS = ['#00f3ff', '#ff00ff', '#00ff00', '#bc13fe', '#f9f871'];

export interface TagMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  trackNumber?: string;
}

export interface AudioTrack {
  id: string;
  playlistId: string;
  name: string;
  url: string;
  file: File;
  order?: number;
  tags?: TagMetadata;
  artworkUrl?: string;
  rating?: number;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: AudioTrack[];
  order: number;
}

export type ViewMode = 'default' | 'mini' | 'cinema' | 'player-focus';

export interface VisualizerConfig {
  style: string;
  strokeEnabled: boolean;
  showTips: boolean;
  segmented: boolean;
  segmentHeight: number;
  segmentGap: number;
  tipHeight: number;
  tipSpeed: number;
  highlightLastBrick: boolean;
  tipColor: string;
  tipGlow: boolean;
  position: 'top' | 'bottom' | 'center' | 'circle';
  barCount: number;
  sensitivity: number;
  fillOpacity: number;
  strokeOpacity: number;
  normalize: boolean;
  preventVolumeScaling: boolean;
  minFrequency: number;
  maxFrequency: number;
  barGap: number;
  mirror: boolean;
  barGravity?: number;
  invertMirror?: boolean;
  threeDMode?: 'reactor' | 'spectrum';
  lockView?: boolean; // NEW: Lock Camera Interaction
}

export interface TerrainConfig {
  gridSize: number; 
  speed: number; 
  heightMultiplier: number; 
  renderMode: 'solid' | 'wireframe' | 'dots'; 
  colorMode: 'theme' | 'rainbow' | 'matrix';
  opacity: number;
  lineThickness: number; 
  glow: boolean;
  brightness?: number; 
  mirror?: boolean;
  invertMirror?: boolean;
  preventVolumeScaling?: boolean;
  normalize?: boolean; // NEW: Add normalize support
  viewDistance?: number; 
  terrainLength?: number; 
  scrollSpeed?: number; 
  showWaveform?: boolean; 
  minFrequency?: number; 
  maxFrequency?: number;
  barGravity?: number;
  cameraFov?: number; 
  showSpaceship?: boolean; 
  lockView?: boolean; // NEW: Lock Camera Interaction
}

export interface RoadConfig {
  enabled: boolean;
  speed: number;
  roadWidth: number;
  buildingHeightScale: number;
  buildingBrightness: number;
  showWireframe: boolean;
  colorMode: 'theme' | 'cyan' | 'magenta' | 'orange';
  lockView?: boolean; // NEW: Lock Camera Interaction
}

export interface DvdConfig {
  size: number;
  speed: number;
  opacity: number;
  enableSfx: boolean;
  logoType: 'dvd' | 'neon_waves' | 'custom';
  customLogoUrl?: string;
  activeDvdLogoId?: string;
}

export interface MarqueeConfig {
  enabled: boolean;
  style: string;
  showProgress: boolean;
  progressMode: 'continuous' | 'blocks';
  progressHeight: number;
  progressOpacity: number;
  speed: number;
  opacity: number;
  fontSize: number;
  channelName: string;
  borderEnabled: boolean;
}

export type HologramCategory = 'system' | 'interactive' | 'music' | 'motivational' | 'philosophy' | 'space';

export interface HologramConfig {
  enabled: boolean;
  opacity: number;
  speed: number;
  interval: number;
  scale: number;
  enableIcons: boolean;
  showHotspots: boolean;
  categories: Record<HologramCategory, boolean>;
  color?: string;
  width?: number;
  typingSpeed?: number;
}

export interface GeminiChatConfig {
  enabled: boolean;
  opacity: number;
  scale: number;
  width: number;
  typingSpeed: number;
  categories: Record<HologramCategory, boolean>;
  color?: string;
}

export interface YouTubeChatConfig {
  enabled: boolean;
  opacity: number;
  scale: number;
  width: number;
  speed: number;
  color: string;
  showAvatars: boolean;
  maxMessages: number;
}

export interface VideoColorConfig {
  enabled: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  grayscale: number;
  sepia: number;
  hueRotate: number;
  warmth: number;
  preset: string;
}

export interface EffectsConfig {
  fps: number;
  showFps: boolean;
  signalEnabled: boolean;
  pixelation: number;
  noise: number;
  chromaticEnabled: boolean;
  chromaticAberration: number;
  vhsJitter: number;
  scanlineEnabled: boolean;
  scanlineIntensity: number;
  scanlineThickness: number;
  bloom: {
    enabled: boolean;
    strength: number;
    radius: number;
    threshold: number;
  };
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
  holograms: HologramConfig;
  geminiChat: GeminiChatConfig;
  youtubeChat: YouTubeChatConfig;
  lightLeaks: {
    enabled: boolean;
    intensity: number;
    speed: number;
    number: number;
  };
  lightFlicker: {
    enabled: boolean;
    intensity: number;
    speed: number;
  };
  videoSettings: VideoColorConfig;
  rain: {
    enabled: boolean;
    intensity: number;
    speed: number;
    size: number;
    direction: number;
    wind: number;
    gustiness: number;
    opacity: number;
    wander: number;
  };
  tron: {
    enabled: boolean;
    opacity: number;
    speed: number;
    spawnRate: number;
    trailLength: number;
    size: number;
    maxAgents: number;
    showNames: boolean;
    showLeaderboard: boolean;
    enableUser: boolean;
    enableDummies: boolean;
    glowEnabled: boolean;
    glowIntensity: number;
    bgEnabled: boolean;
    bgPattern: 'grid' | 'iso' | 'hex' | 'dots';
    erasureSpeed: number;
    speedVariance: number;
    roundMode: boolean;
  };
  life: {
    enabled: boolean;
    speed: number;
    cellSize: number;
    fadeSpeed: number;
    color: string;
    gridColor: string;
    triggerToken: number;
    audioReactive: boolean;
    audioInjectionMode: 'solid' | 'tip';
    audioPosition: 'top' | 'bottom' | 'center';
    triggerAction?: 'random' | 'clear' | 'glider_gun' | 'pulsar';
  };
  vignette: {
    enabled: boolean;
    intensity: number;
    roundness: number;
  };
}

export interface PatternConfig {
  intensity: number;
  scale: number;
}

export type HotspotType = 'error' | 'decrypt' | 'target' | 'scan' | 'secure' | 'link';

export interface BgHotspot {
  id: string;
  x: number;
  y: number;
  type: HotspotType;
}

export interface BackgroundMedia {
  id: string;
  playlistId: string;
  type: 'image' | 'video';
  url: string;
  file: File;
  hotspots?: BgHotspot[];
}

export interface BackgroundPlaylist {
  id: string;
  name: string;
  items: BackgroundMedia[];
  order: number;
}

export interface WatermarkConfig {
  scale: number;
  opacity: number;
  flashIntensity: number;
}

export type ThemeType = 'neon-retro' | 'neon-blue' | 'neon-pink' | 'warm-cozy' | 'neutral-gray' | 'neutral-ocean';
export type ControlStyle = 'default' | 'round' | 'circle';
export type CursorStyle = 'theme-sync' | 'default' | 'music-flow' | 'dos-terminal' | 'sound-wave' | 'sound-wave-trail' | 'classic-blue' | 'classic-warm' | 'classic-white' | 'classic-ocean' | 'crosshair' | 'rounded' | 'system';

export type BgTransitionType = 'glitch' | 'leaks' | 'crossfade' | 'black' | 'blur' | 'none';
export type BgAnimationType = 'none' | 'zoom' | 'sway' | 'handheld' | 'cinematic' | 'chaos';

export interface AmbienceFile {
  id: string;
  name: string;
  file: File;
  url: string;
}

export interface AmbienceConfig {
  activeId: string | null;
  isPlaying: boolean;
  volume: number;
}

export interface EqualizerConfig {
  enabled: boolean;
  bands: number[];
  preset: string;
}

export interface YouTubeAuthConfig {
  clientId: string;
  isConnected: boolean;
  channelName?: string;
}

export interface AppPreset {
  id: string;
  name: string;
  createdAt: number;
  config: {
    globalWaveformConfig?: VisualizerConfig;
    visualizerConfig: VisualizerConfig;
    reactorConfig?: VisualizerConfig;
    sineWaveConfig?: VisualizerConfig;
    terrainConfig?: TerrainConfig;
    roadConfig?: RoadConfig;
    dvdConfig: DvdConfig;
    effectsConfig: EffectsConfig;
    marqueeConfig: MarqueeConfig;
    watermarkConfig?: WatermarkConfig;
    equalizerConfig?: EqualizerConfig;
    youtubeAuth?: YouTubeAuthConfig;
    bgColor: string;
    bgPattern: string;
    bgPatternConfig: PatternConfig;
    showVisualizer: boolean;
    showVisualizer3D?: boolean;
    showSineWave?: boolean;
    showVisualizerTerrain?: boolean;
    showRoad?: boolean;
    showDvd: boolean;
    bgAutoplayInterval: number;
    syncBgWithTrack?: boolean;
    cursorStyle: CursorStyle;
    retroScreenCursorStyle?: CursorStyle;
    theme?: ThemeType;
    controlStyle?: ControlStyle;
    bgTransition?: BgTransitionType;
    bgAnimation?: BgAnimationType;
    ambienceConfig?: AmbienceConfig;
  };
}

export type FitMode = 'cover' | 'contain' | 'stretch' | 'contain-blur';
export type ScreenAlignment = 'center' | 'left' | 'right';

export interface RecorderConfig {
  resolution: '720p' | '1080p' | '4k';
  fps: 30 | 60;
  videoBitrate: number;
  audioBitrate: number;
}

export type InstrumentType = 'kick' | 'snare' | 'hihat' | 'bass';

export interface EditorInstrument {
  id: string;
  name: string;
  type: InstrumentType;
  color: string;
  volume: number;
  steps: boolean[];
}