
import React from 'react';
import { TerrainConfig } from '../../../types';
import RangeControl from '../RangeControl';
import ToggleSwitch from '../ToggleSwitch';
import CustomSelect from '../CustomSelect';
import { Split, ArrowLeftRight, Activity, Rocket, Sun, Lock } from 'lucide-react';

interface TerrainSettingsProps {
  config: TerrainConfig;
  update: (key: keyof TerrainConfig, val: any) => void;
}

const TerrainSettings: React.FC<TerrainSettingsProps> = ({ config, update }) => {
  const colorOptions = [
      { value: 'theme', label: 'THEME SYNC' },
      { value: 'matrix', label: 'MATRIX' },
      { value: 'rainbow', label: 'RAINBOW (WHITE)' },
  ];

  const renderOptions = [
      { value: 'wireframe', label: 'WIREFRAME' },
      { value: 'solid', label: 'SOLID' },
      { value: 'dots', label: 'DOTS (POINTS)' },
  ];

  return (
    <div className="pt-2">
       <div className="mb-4">
          <CustomSelect 
              label="RENDER MODE"
              value={config.renderMode || 'wireframe'}
              options={renderOptions}
              onChange={(v) => update('renderMode', v)}
          />
          
          <div className="mt-4 space-y-2">
            <ToggleSwitch 
                label="GENERATOR WAVE" 
                icon={Activity} 
                value={config.showWaveform !== false} 
                onChange={(v) => update('showWaveform', v)} 
                color="purple"
            />
            <ToggleSwitch 
                label="NEON SPACESHIP" 
                icon={Rocket} 
                value={config.showSpaceship || false} 
                onChange={(v) => update('showSpaceship', v)} 
                color="green"
            />
            <ToggleSwitch 
                label="LOCK VIEW" 
                icon={Lock} 
                value={config.lockView || false} 
                onChange={(v) => update('lockView', v)} 
                color="red"
            />
          </div>
       </div>

       {/* GLOW SETTINGS */}
       <div className="mb-4 pt-2 border-t border-theme-border">
          <ToggleSwitch 
              label="GLOW EFFECT" 
              icon={Sun} 
              value={config.glow !== false} 
              onChange={(v) => update('glow', v)} 
              color="blue"
          />
          {config.glow && (
              <RangeControl 
                  label="BRIGHTNESS" 
                  value={config.brightness || 1.5} 
                  min={1.0} 
                  max={5.0} 
                  step={0.1} 
                  onChange={v => update('brightness', v)} 
                  className="mb-0"
              />
          )}
       </div>

       <div className="mb-4 pt-2 border-t border-theme-border">
          <ToggleSwitch 
              label="MIRROR MODE" 
              icon={Split} 
              value={config.mirror || false} 
              onChange={(v) => update('mirror', v)} 
              color="green"
          />
          {config.mirror && (
              <div className="pl-4 border-l-2 border-green-500/30">
                  <ToggleSwitch 
                      label="INVERT MIRROR" 
                      icon={ArrowLeftRight} 
                      value={config.invertMirror || false} 
                      onChange={(v) => update('invertMirror', v)} 
                      color="green"
                  />
                  <p className="text-[9px] text-theme-muted mb-2 font-mono">
                      {config.invertMirror ? "HIGHS IN CENTER, BASS ON EDGES" : "BASS IN CENTER, HIGHS ON EDGES"}
                  </p>
              </div>
          )}
       </div>

       <div className="mb-4">
           <CustomSelect 
              label="COLOR MODE"
              value={config.colorMode}
              options={colorOptions}
              onChange={(v) => update('colorMode', v)}
           />
       </div>

       <RangeControl label="SCROLL SPEED" value={config.scrollSpeed || 1.0} min={0.1} max={5.0} step={0.1} onChange={v => update('scrollSpeed', v)} />
       <RangeControl label="VIEW DISTANCE (FOG)" value={config.viewDistance || 60} min={20} max={200} step={10} onChange={v => update('viewDistance', v)} />
       <RangeControl label="TERRAIN LENGTH" value={config.terrainLength || 80} min={40} max={200} step={10} onChange={v => update('terrainLength', v)} />
       
       <RangeControl label="GRID RESOLUTION" value={config.gridSize} min={16} max={512} step={16} onChange={v => update('gridSize', v)} />
       <RangeControl label="AMPLITUDE (SENSITIVITY)" value={config.heightMultiplier} min={0.1} max={5.0} step={0.1} onChange={v => update('heightMultiplier', v)} />
       <RangeControl label="CAMERA FOV (ZOOM)" value={config.cameraFov || 75} min={10} max={150} step={1} onChange={v => update('cameraFov', v)} />
       
       <RangeControl label={config.renderMode === 'dots' ? "DOT SIZE" : "LINE THICKNESS"} value={config.lineThickness || 1.0} min={0.1} max={10.0} step={0.1} onChange={v => update('lineThickness', v)} />
       
       <RangeControl label="OPACITY" value={config.opacity} min={0.1} max={1.0} step={0.1} onChange={v => update('opacity', v)} />
    </div>
  );
};

export default TerrainSettings;
