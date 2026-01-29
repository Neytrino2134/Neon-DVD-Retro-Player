
import React from 'react';
import { EffectsConfig } from '../../types';

interface VignetteEffectProps {
  config: EffectsConfig['vignette'];
}

const VignetteEffect: React.FC<VignetteEffectProps> = ({ config }) => {
  if (!config.enabled) return null;

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-20"
      style={{
        background: `radial-gradient(circle, transparent ${100 * (1 - config.roundness)}%, rgba(0,0,0,${config.intensity}) 100%)`
      }}
    />
  );
};

export default VignetteEffect;
