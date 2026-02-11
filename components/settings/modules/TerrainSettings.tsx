
import React from 'react';
import { TerrainConfig } from '../../../types';
import RangeControl from '../RangeControl';
import ToggleSwitch from '../ToggleSwitch';
import CustomSelect from '../CustomSelect';
import { Grid, Zap, Split, ArrowLeftRight } from 'lucide-react';

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

  return (
    <div className="pt-2">
       <div className="mb-4">
          <ToggleSwitch 
              label="WIREFRAME MODE" 
              icon={Grid} 
              value={config.wireframe} 
              onChange={(v) => update('wireframe', v)} 
              color="blue"
          />
          <ToggleSwitch 
              label="CEILING GLOW" 
              icon={Zap} 
              value={config.glow} 
              onChange={(v) => update('glow', v)} 
              color="purple"
          />
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

       <RangeControl label="GRID RESOLUTION" value={config.gridSize} min={16} max={128} step={16} onChange={v => update('gridSize', v)} />
       <RangeControl label="AMPLITUDE (SENSITIVITY)" value={config.heightMultiplier} min={0.1} max={5.0} step={0.1} onChange={v => update('heightMultiplier', v)} />
       <RangeControl label="OPACITY" value={config.opacity} min={0.1} max={1.0} step={0.1} onChange={v => update('opacity', v)} />
    </div>
  );
};

export default TerrainSettings;
