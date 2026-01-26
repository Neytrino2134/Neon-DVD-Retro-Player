import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ToggleSwitchProps {
  label: React.ReactNode;
  icon: any;
  value: boolean;
  onChange: (v: boolean) => void;
  color?: 'purple' | 'green' | 'blue'; // Kept for API compatibility, but mapped to theme
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, icon: Icon, value, onChange, color: _color = 'purple' }) => {
  const { controlStyle } = useTheme();
  
  const activeClass = 'bg-theme-primary shadow-[0_0_8px_var(--color-primary)]';

  // Determine rounding based on style
  let containerRadius = 'rounded-sm';
  let knobRadius = 'rounded-sm';

  if (controlStyle === 'round') {
      containerRadius = 'rounded-lg';
      knobRadius = 'rounded-md';
  } else if (controlStyle === 'circle') {
      containerRadius = 'rounded-full';
      knobRadius = 'rounded-full';
  }

  return (
    <div className={`flex items-center justify-between p-3 bg-black/20 border border-theme-border ${controlStyle === 'round' ? 'rounded-lg' : 'rounded'} mb-2 hover:border-theme-muted transition-colors`}>
      <div className="flex items-center gap-3">
        <div className="text-theme-accent opacity-80">
          <Icon size={16} />
        </div>
        <span className="font-mono text-[11px] tracking-widest text-theme-text uppercase">{label}</span>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 ${containerRadius} transition-all duration-300 shadow-inner border border-theme-border
          ${value ? activeClass : 'bg-gray-800'}
        `}
      >
        <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-theme-toggleKnob ${knobRadius} shadow-md transition-transform duration-300
          ${value ? 'translate-x-5' : 'translate-x-0'}
        `}></div>
      </button>
    </div>
  );
};

export default ToggleSwitch;