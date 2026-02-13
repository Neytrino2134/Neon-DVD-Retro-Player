
import { VisualizerConfig, TerrainConfig, RoadConfig, MarqueeConfig, DvdConfig, EffectsConfig } from '../types';

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
  roadConfig?: RoadConfig;
  setRoadConfig?: (c: RoadConfig) => void;
  marqueeConfig?: MarqueeConfig;
  setMarqueeConfig?: (c: MarqueeConfig) => void;
  dvdConfig?: DvdConfig;
  setDvdConfig?: (c: DvdConfig) => void;
  effectsConfig?: EffectsConfig;
  setEffectsConfig?: (c: EffectsConfig) => void;
}

export const useConfigUpdaters = (props: UseConfigUpdatersProps) => {
  const {
    globalWaveformConfig, setGlobalWaveformConfig,
    visualizerConfig, setVisualizerConfig,
    reactorConfig, setReactorConfig,
    sineWaveConfig, setSineWaveConfig,
    terrainConfig, setTerrainConfig,
    roadConfig, setRoadConfig,
    marqueeConfig, setMarqueeConfig,
    dvdConfig, setDvdConfig,
    effectsConfig, setEffectsConfig
  } = props;

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
              preventVolumeScaling: globalWaveformConfig.preventVolumeScaling,
              minFrequency: globalWaveformConfig.minFrequency,
              maxFrequency: globalWaveformConfig.maxFrequency,
              barGravity: globalWaveformConfig.barGravity
          });
      }
      if (roadConfig && setRoadConfig) {
          // No direct map for road currently as it has different params
      }
  };

  const updateGlobalAndApply = (key: keyof VisualizerConfig, value: any) => {
    if (!globalWaveformConfig || !setGlobalWaveformConfig) return;
    
    // 1. Update Global State
    const newGlobal = { ...globalWaveformConfig, [key]: value };
    setGlobalWaveformConfig(newGlobal);

    // 2. Propagate to children immediately
    setVisualizerConfig({ ...visualizerConfig, [key]: value });

    if (reactorConfig && setReactorConfig) {
        setReactorConfig({ ...reactorConfig, [key]: value });
    }

    if (sineWaveConfig && setSineWaveConfig) {
        setSineWaveConfig({ ...sineWaveConfig, [key]: value });
    }

    if (terrainConfig && setTerrainConfig) {
        if (key === 'fillOpacity') setTerrainConfig({ ...terrainConfig, opacity: value });
        if (key === 'sensitivity') setTerrainConfig({ ...terrainConfig, heightMultiplier: value });
        if (key === 'mirror') setTerrainConfig({ ...terrainConfig, mirror: value });
        if (key === 'preventVolumeScaling') setTerrainConfig({ ...terrainConfig, preventVolumeScaling: value });
        if (key === 'minFrequency') setTerrainConfig({ ...terrainConfig, minFrequency: value });
        if (key === 'maxFrequency') setTerrainConfig({ ...terrainConfig, maxFrequency: value });
        if (key === 'barGravity') setTerrainConfig({ ...terrainConfig, barGravity: value });
    }
  };

  const updateVisualizer = (key: keyof VisualizerConfig, value: any) => {
      setVisualizerConfig({ ...visualizerConfig, [key]: value });
  };

  const updateReactor = (key: keyof VisualizerConfig, value: any) => {
      if (reactorConfig && setReactorConfig) setReactorConfig({ ...reactorConfig, [key]: value });
  };

  const updateSineWave = (key: keyof VisualizerConfig, value: any) => {
      if (sineWaveConfig && setSineWaveConfig) setSineWaveConfig({ ...sineWaveConfig, [key]: value });
  };

  const updateTerrain = (key: keyof TerrainConfig, value: any) => {
      if (terrainConfig && setTerrainConfig) setTerrainConfig({ ...terrainConfig, [key]: value });
  };

  const updateRoad = (key: keyof RoadConfig, value: any) => {
      if (roadConfig && setRoadConfig) setRoadConfig({ ...roadConfig, [key]: value });
  };

  const updateMarquee = (key: keyof MarqueeConfig, value: any) => {
      if (marqueeConfig && setMarqueeConfig) setMarqueeConfig({ ...marqueeConfig, [key]: value });
  };

  const updateDvd = (key: keyof DvdConfig | Partial<DvdConfig>, value?: any) => {
      if (dvdConfig && setDvdConfig) {
          if (typeof key === 'object') {
              setDvdConfig({ ...dvdConfig, ...key });
          } else {
              setDvdConfig({ ...dvdConfig, [key]: value });
          }
      }
  };

  const updateEffect = (key: keyof EffectsConfig, value: any) => {
      if (effectsConfig && setEffectsConfig) setEffectsConfig({ ...effectsConfig, [key]: value });
  };

  const updateDebugConfig = (value: EffectsConfig['debugConsole']) => {
      if (effectsConfig && setEffectsConfig) setEffectsConfig({ ...effectsConfig, debugConsole: value });
  };

  return {
      applyGlobalToAll,
      updateGlobalAndApply,
      updateVisualizer,
      updateReactor,
      updateSineWave,
      updateTerrain,
      updateRoad,
      updateMarquee,
      updateDvd,
      updateEffect,
      updateDebugConfig
  };
};
