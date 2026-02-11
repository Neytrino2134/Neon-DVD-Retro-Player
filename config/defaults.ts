
import { VisualizerConfig, DvdConfig, EffectsConfig, MarqueeConfig, WatermarkConfig, EqualizerConfig, YouTubeAuthConfig, YouTubeChatConfig, TerrainConfig } from '../types';

// NEW: Global Master Configuration for all Waveforms
export const DEFAULT_GLOBAL_WAVEFORM_CONFIG: VisualizerConfig = {
  // Positioning
  position: 'bottom',
  // Quantity & Space
  barCount: 128,
  barGap: 2,
  // Power & Gravity
  sensitivity: 1.5,
  barGravity: 5,
  // Cutoff
  minFrequency: 0,
  maxFrequency: 100,
  // Opacity
  fillOpacity: 0.3,
  strokeOpacity: 0.8,
  // Toggles
  normalize: false,
  preventVolumeScaling: false,
  mirror: false,
  
  // Placeholders (Not used globally but required by type)
  style: 'blue', strokeEnabled: true, showTips: true, segmented: false, segmentHeight: 4, segmentGap: 2,
  tipHeight: 2, tipSpeed: 15, highlightLastBrick: false, tipColor: 'white', tipGlow: false
};

export const DEFAULT_VISUALIZER_CONFIG: VisualizerConfig = {
  style: 'blue', 
  strokeEnabled: true, 
  showTips: true, 
  segmented: false, 
  segmentHeight: 4, 
  segmentGap: 2,
  tipHeight: 2, 
  tipSpeed: 15, 
  highlightLastBrick: false, 
  tipColor: 'white', 
  tipGlow: false,
  // Inherited from Global (Defaults here for safety/fallback)
  position: 'bottom', barCount: 128, sensitivity: 1.5, fillOpacity: 0.3, strokeOpacity: 0.8,
  normalize: false, preventVolumeScaling: false, minFrequency: 0, maxFrequency: 100, barGap: 2, mirror: false, barGravity: 5
};

export const DEFAULT_REACTOR_CONFIG: VisualizerConfig = {
  style: 'theme-sync', 
  strokeEnabled: true, 
  showTips: false, 
  segmented: false, 
  segmentHeight: 0, 
  segmentGap: 0,
  tipHeight: 0, 
  tipSpeed: 0, 
  highlightLastBrick: false, 
  tipColor: 'white', 
  tipGlow: false, 
  threeDMode: 'reactor',
  // Inherited/Overridden defaults
  position: 'center', barCount: 64, sensitivity: 1.2, fillOpacity: 0.8, strokeOpacity: 0.5,
  normalize: false, preventVolumeScaling: false, minFrequency: 0, maxFrequency: 80, barGap: 0, mirror: false, barGravity: 5
};

export const DEFAULT_SINE_WAVE_CONFIG: VisualizerConfig = {
  style: 'theme-sync', 
  strokeEnabled: true, 
  showTips: false, 
  segmented: false, 
  segmentHeight: 0, 
  segmentGap: 0,
  tipHeight: 0, 
  tipSpeed: 10, 
  highlightLastBrick: false, 
  tipColor: 'white', 
  tipGlow: false,
  // Inherited/Overridden defaults
  position: 'center', barCount: 128, sensitivity: 2.0, fillOpacity: 0.2, strokeOpacity: 0.8,
  normalize: false, preventVolumeScaling: false, minFrequency: 0, maxFrequency: 100, barGap: 0, mirror: false, barGravity: 5
};

export const DEFAULT_TERRAIN_CONFIG: TerrainConfig = {
  gridSize: 64,
  speed: 1.0,
  heightMultiplier: 1.5,
  wireframe: true,
  colorMode: 'theme',
  opacity: 0.8,
  lineThickness: 1.0,
  glow: true,
  mirror: false,
  invertMirror: false,
  preventVolumeScaling: false
};

export const DEFAULT_DVD_CONFIG: DvdConfig = { 
  size: 150, speed: 2, opacity: 0.7, enableSfx: false, logoType: 'neon_waves' 
};

export const DEFAULT_YOUTUBE_AUTH_CONFIG: YouTubeAuthConfig = {
  clientId: '',
  isConnected: false
};

export const DEFAULT_YOUTUBE_CHAT_CONFIG: YouTubeChatConfig = {
  enabled: false,
  opacity: 0.9,
  scale: 1.0,
  width: 350,
  speed: 1.0,
  color: 'theme',
  showAvatars: true,
  maxMessages: 20
};

export const DEFAULT_EFFECTS_CONFIG: EffectsConfig = {
  fps: 60, 
  showFps: false,
  signalEnabled: true,
  pixelation: 1, 
  noise: 0, 
  chromaticEnabled: true,
  chromaticAberration: 0, 
  vhsJitter: 0, 
  scanlineEnabled: true, scanlineIntensity: 0.2, scanlineThickness: 4,
  glitch: { enabled: false, intensity: 0.5, speed: 0.2, opacity: 1.0, variant: 'v1' },
  cyberHack: { enabled: false, speed: 5, opacity: 0.7, density: 0.5, scale: 1.0, backgroundOpacity: 0.4 },
  debugConsole: { enabled: false, opacity: 0.9, scale: 1.0 },
  holograms: { 
    enabled: false, opacity: 0.8, speed: 1.0, interval: 15, scale: 1.0, enableIcons: false, showHotspots: true,
    categories: { system: true, interactive: true, music: true, motivational: true, philosophy: false, space: false }
  },
  geminiChat: {
    enabled: false, opacity: 0.9, scale: 1.0, width: 350, typingSpeed: 1.0,
    categories: { system: false, interactive: true, music: true, motivational: true, philosophy: true, space: true }
  },
  youtubeChat: DEFAULT_YOUTUBE_CHAT_CONFIG,
  lightLeaks: { enabled: false, intensity: 0.5, speed: 0.5, number: 6 },
  lightFlicker: { enabled: false, intensity: 0.3, speed: 0.5 }, 
  videoSettings: {
    enabled: false,
    brightness: 1.0,
    contrast: 1.0,
    saturation: 1.0,
    grayscale: 0,
    sepia: 0,
    hueRotate: 0,
    warmth: 0,
    preset: 'none'
  },
  rain: { enabled: false, intensity: 0.5, speed: 1.0, size: 1.0, direction: 0, wind: 0, gustiness: 0.5, opacity: 0.5, wander: 0.1 },
  tron: { 
    enabled: false, 
    opacity: 0.8, 
    speed: 0.311, 
    spawnRate: 5, 
    trailLength: 0.1, 
    size: 3, 
    maxAgents: 6, 
    showNames: true, 
    showLeaderboard: true, 
    enableUser: false, 
    enableDummies: true, 
    glowEnabled: false, 
    glowIntensity: 0.5, 
    bgEnabled: false, 
    bgPattern: 'grid', 
    erasureSpeed: 2, 
    speedVariance: 0.5,
    roundMode: false 
  },
  vignette: { enabled: false, intensity: 0.5, roundness: 0.7 }
};

export const DEFAULT_MARQUEE_CONFIG: MarqueeConfig = {
  enabled: true, style: 'matrix', showProgress: true, progressMode: 'blocks', progressHeight: 20, progressOpacity: 0.6,
  speed: 1, opacity: 0.9, fontSize: 40, channelName: 'Neon Waves', borderEnabled: false
};

export const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = { 
  scale: 1.0, opacity: 1.0, flashIntensity: 0.5 
};

export const DEFAULT_EQUALIZER_CONFIG: EqualizerConfig = {
  enabled: false,
  bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 
  preset: 'flat'
};
