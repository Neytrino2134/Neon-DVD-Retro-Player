
import { VisualizerConfig, MarqueeConfig, DvdConfig, EffectsConfig, TerrainConfig } from '../types';

interface UseConfigUpdatersProps {
  globalWaveformConfig?: VisualizerConfig;
  setGlobalWaveformConfig?: (c: VisualizerConfig) => void;
  visualizerConfig: VisualizerConfig;
  setVisualizerConfig: (c: VisualizerConfig) => void;
  reactorConfig?: VisualizerConfig;
  setReactorConfig?: (c: VisualizerConfig) => void;
  sineWaveConfig?: VisualizerConfig;
  setSineWaveConfig?: (c: VisualizerConfig) => void;
  terrainConfig?: TerrainConfig; 
  setTerrainConfig?: (c: TerrainConfig) => void; 
  marqueeConfig: MarqueeConfig;
  setMarqueeConfig: (c: MarqueeConfig) => void;
  dvdConfig: DvdConfig;
  setDvdConfig: (c: DvdConfig) => void;
  effectsConfig: EffectsConfig;
  setEffectsConfig: (c: EffectsConfig) => void;
}

export const useConfigUpdaters = ({
  globalWaveformConfig, setGlobalWaveformConfig,
  visualizerConfig, setVisualizerConfig,
  reactorConfig, setReactorConfig,
  sineWaveConfig, setSineWaveConfig,
  terrainConfig, setTerrainConfig,
  marqueeConfig, setMarqueeConfig,
  dvdConfig, setDvdConfig,
  effectsConfig, setEffectsConfig
}: UseConfigUpdatersProps) => {

  const updateGlobalWaveform = (key: keyof VisualizerConfig, value: any) => {
    if (setGlobalWaveformConfig && globalWaveformConfig) {
        setGlobalWaveformConfig({ ...globalWaveformConfig, [key]: value });
    }
  };

  const applyGlobalToAll = () => {
      if (!globalWaveformConfig) return;
      const common = {
          position: globalWaveformConfig.position,
          barCount: globalWaveformConfig.barCount,
          barGap: globalWaveformConfig.barGap,
          sensitivity: globalWaveformConfig.sensitivity,
          barGravity: globalWaveformConfig.barGravity,
          minFrequency: globalWaveformConfig.minFrequency,
          maxFrequency: globalWaveformConfig.maxFrequency,
          fillOpacity: globalWaveformConfig.fillOpacity,
          strokeOpacity: globalWaveformConfig.strokeOpacity,
          normalize: globalWaveformConfig.normalize,
          preventVolumeScaling: globalWaveformConfig.preventVolumeScaling,
          mirror: globalWaveformConfig.mirror,
      };
      
      setVisualizerConfig({ ...visualizerConfig, ...common });
      if (reactorConfig && setReactorConfig) setReactorConfig({ ...reactorConfig, ...common });
      if (sineWaveConfig && setSineWaveConfig) setSineWaveConfig({ ...sineWaveConfig, ...common });
      if (terrainConfig && setTerrainConfig) {
          setTerrainConfig({
              ...terrainConfig,
              opacity: globalWaveformConfig.fillOpacity,
              heightMultiplier: globalWaveformConfig.sensitivity,
              mirror: globalWaveformConfig.mirror,
              preventVolumeScaling: globalWaveformConfig.preventVolumeScaling
          });
      }
  };

  // NEW: Updates Global AND Propagates immediately (For Online HUD)
  const updateGlobalAndApply = (key: keyof VisualizerConfig, value: any) => {
    if (!globalWaveformConfig || !setGlobalWaveformConfig) return;
    
    // 1. Update Global State
    const newGlobal = { ...globalWaveformConfig, [key]: value };
    setGlobalWaveformConfig(newGlobal);

    // 2. Propagate to children immediately
    // We construct the update object based on the single key changing to be efficient, 
    // or just broadcast the value to the specific keys on children.
    
    // 2D Waveform
    setVisualizerConfig({ ...visualizerConfig, [key]: value });

    // Reactor
    if (reactorConfig && setReactorConfig) {
        setReactorConfig({ ...reactorConfig, [key]: value });
    }

    // Sine
    if (sineWaveConfig && setSineWaveConfig) {
        setSineWaveConfig({ ...sineWaveConfig, [key]: value });
    }

    // Terrain (Mapping required)
    if (terrainConfig && setTerrainConfig) {
        if (key === 'fillOpacity') setTerrainConfig({ ...terrainConfig, opacity: value });
        if (key === 'sensitivity') setTerrainConfig({ ...terrainConfig, heightMultiplier: value });
        if (key === 'mirror') setTerrainConfig({ ...terrainConfig, mirror: value });
        if (key === 'preventVolumeScaling') setTerrainConfig({ ...terrainConfig, preventVolumeScaling: value });
    }
  };

  const updateVisualizer = (key: keyof VisualizerConfig, value: any) => {
    setVisualizerConfig({ ...visualizerConfig, [key]: value });
  };

  const updateReactor = (key: keyof VisualizerConfig, value: any) => {
    if (setReactorConfig && reactorConfig) {
      setReactorConfig({ ...reactorConfig, [key]: value });
    }
  };

  const updateSineWave = (key: keyof VisualizerConfig, value: any) => {
    if (setSineWaveConfig && sineWaveConfig) {
      setSineWaveConfig({ ...sineWaveConfig, [key]: value });
    }
  };

  const updateTerrain = (key: keyof TerrainConfig, value: any) => {
    if (setTerrainConfig && terrainConfig) {
        setTerrainConfig({ ...terrainConfig, [key]: value });
    }
  };

  const updateMarquee = (key: keyof MarqueeConfig, value: any) => {
    setMarqueeConfig({ ...marqueeConfig, [key]: value });
  };

  const updateDvd = (key: keyof DvdConfig | Partial<DvdConfig>, value?: any) => {
    if (typeof key === 'object' && key !== null) {
        setDvdConfig({ ...dvdConfig, ...key });
    } else {
        setDvdConfig({ ...dvdConfig, [key as keyof DvdConfig]: value });
    }
  };

  const updateEffect = (key: keyof EffectsConfig, value: any) => {
    setEffectsConfig({ ...effectsConfig, [key]: value });
  };

  const updateDebugConfig = (value: EffectsConfig['debugConsole']) => {
    setEffectsConfig({ ...effectsConfig, debugConsole: value });
  };

  return {
      updateGlobalWaveform,
      applyGlobalToAll,
      updateGlobalAndApply, // EXPORTED
      updateVisualizer,
      updateReactor,
      updateSineWave,
      updateTerrain,
      updateMarquee,
      updateDvd,
      updateEffect,
      updateDebugConfig
  };
};
