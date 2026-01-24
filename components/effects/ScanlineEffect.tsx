
import React from 'react';
import { EffectsConfig } from '../../types';

interface ScanlineEffectProps {
  config: EffectsConfig;
}

const ScanlineEffect: React.FC<ScanlineEffectProps> = ({ config }) => {
  if (!config.scanlineEnabled) return null;

  return (
    <div 
      className="absolute inset-0 z-30 pointer-events-none" 
      style={{ 
        background: `linear-gradient(to bottom, transparent, transparent 50%, rgba(0,0,0,${config.scanlineIntensity}) 50%, rgba(0,0,0,${config.scanlineIntensity}))`, 
        backgroundSize: `100% ${config.scanlineThickness}px` 
      }}
    ></div>
  );
};

export default ScanlineEffect;
