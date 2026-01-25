
import React from 'react';

interface ToggleSwitchProps {
  label: string;
  icon: any;
  value: boolean;
  onChange: (v: boolean) => void;
  color?: 'purple' | 'green' | 'blue';
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, icon: Icon, value, onChange, color = 'purple' }) => {
  const colorClasses = {
    purple: 'bg-neon-purple shadow-[0_0_8px_rgba(188,19,254,0.5)]',
    green: 'bg-neon-green shadow-[0_0_8px_rgba(0,255,0,0.5)]',
    blue: 'bg-neon-blue shadow-[0_0_8px_rgba(0,243,255,0.5)]',
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/40 border border-gray-700/50 rounded mb-2 hover:border-gray-600 transition-colors">
      <div className="flex items-center gap-3">
        <div className="text-neon-yellow opacity-80">
          <Icon size={16} />
        </div>
        <span className="font-mono text-[11px] tracking-widest text-white uppercase">{label}</span>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-all duration-300 shadow-inner
          ${value ? colorClasses[color] : 'bg-gray-700'}
        `}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300
          ${value ? 'translate-x-5' : 'translate-x-0'}
        `}></div>
      </button>
    </div>
  );
};

export default ToggleSwitch;
