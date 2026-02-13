
import React from 'react';
import { RoadConfig } from '../../../types';
import RangeControl from '../RangeControl';
import ToggleSwitch from '../ToggleSwitch';
import CustomSelect from '../CustomSelect';
import { Box, Lock } from 'lucide-react';

interface RoadSettingsProps {
  config: RoadConfig;
  update: (key: keyof RoadConfig, val: any) => void;
}

const RoadSettings: React.FC<RoadSettingsProps> = ({ config, update }) => {
  
  const colorOptions = [
      { value: 'theme', label: 'THEME SYNC' },
      { value: 'cyan', label: 'CYAN' },
      { value: 'magenta', label: 'MAGENTA' },
      { value: 'orange', label: 'ORANGE' },
  ];

  return (
    <div className="pt-2">
       <div className="mb-4 space-y-2">
          <ToggleSwitch 
              label="WIREFRAME BUILDINGS" 
              icon={Box} 
              value={config.showWireframe} 
              onChange={(v) => update('showWireframe', v)} 
              color="blue"
          />
          <ToggleSwitch 
              label="LOCK VIEW" 
              icon={Lock} 
              value={config.lockView || false} 
              onChange={(v) => update('lockView', v)} 
              color="red"
          />
       </div>

       <div className="mb-4">
           <CustomSelect 
              label="COLOR THEME"
              value={config.colorMode}
              options={colorOptions}
              onChange={(v) => update('colorMode', v)}
           />
       </div>

       <RangeControl label="SPEED" value={config.speed} min={0.1} max={3.0} step={0.1} onChange={v => update('speed', v)} />
       <RangeControl label="ROAD WIDTH" value={config.roadWidth} min={10} max={60} step={5} onChange={v => update('roadWidth', v)} />
       <RangeControl label="BUILDING HEIGHT" value={config.buildingHeightScale} min={0.5} max={3.0} step={0.1} onChange={v => update('buildingHeightScale', v)} />
       <RangeControl label="BRIGHTNESS" value={config.buildingBrightness} min={0.5} max={3.0} step={0.1} onChange={v => update('buildingBrightness', v)} />
    </div>
  );
};

export default RoadSettings;