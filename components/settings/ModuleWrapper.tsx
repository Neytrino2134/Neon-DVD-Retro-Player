
import React, { useEffect, useState } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ModuleWrapperProps {
  id: string;
  label: React.ReactNode;
  icon: LucideIcon;
  isEnabled: boolean;
  isExpanded: boolean;
  isAlwaysOn?: boolean;
  onToggleExpand: () => void;
  onToggleEnable: () => void;
  children: React.ReactNode;
}

const ModuleWrapper: React.FC<ModuleWrapperProps> = ({
  label,
  icon: Icon,
  isEnabled,
  isExpanded,
  isAlwaysOn,
  onToggleExpand,
  onToggleEnable,
  children
}) => {
  const [allowOverflow, setAllowOverflow] = useState(false);
  const { controlStyle } = useTheme();

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isExpanded && isEnabled) {
      // Delay setting overflow to visible until animation likely finishes
      timeout = setTimeout(() => setAllowOverflow(true), 350); 
    } else {
      setAllowOverflow(false);
    }
    return () => clearTimeout(timeout);
  }, [isExpanded, isEnabled]);

  const activeStyle = isEnabled 
     ? "border-theme-primary bg-theme-panel shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" 
     : "border-theme-border bg-gray-900/50 opacity-80";

  // Dynamic Radius for Toggle Switch
  let containerRadius = 'rounded-sm';
  let knobRadius = 'rounded-sm';

  if (controlStyle === 'round') {
      containerRadius = 'rounded-lg';
      knobRadius = 'rounded-md';
  } else if (controlStyle === 'circle') {
      containerRadius = 'rounded-full';
      knobRadius = 'rounded-full';
  }

  // Dynamic Radius for Wrapper
  const wrapperRadius = controlStyle === 'round' ? 'rounded-lg' : 'rounded';

  return (
    <div className={`relative ${wrapperRadius} border transition-all duration-300 flex flex-col ${activeStyle} ${isExpanded ? 'z-[50]' : 'z-0'}`}>
      <div className="flex items-center justify-between p-3 min-h-[50px]">
        <div 
          className="flex items-center gap-3 cursor-pointer select-none flex-1"
          onClick={() => {
             if (isEnabled) onToggleExpand();
             else if (!isAlwaysOn) onToggleEnable(); 
          }}
        >
          <Icon size={18} className={`transition-colors ${isEnabled ? "text-theme-accent" : "text-theme-muted"}`} />
          <span className={`font-mono text-xs font-bold tracking-widest uppercase transition-colors ${isEnabled ? "text-theme-text" : "text-theme-muted"}`}>
            {label}
          </span>
          
          {isEnabled && (
             <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
                <ChevronDown size={14} className="text-theme-primary opacity-70" />
             </div>
          )}
        </div>

        {!isAlwaysOn && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleEnable();
            }}
            className={`relative w-10 h-5 ${containerRadius} transition-all duration-300 shadow-inner ml-3 shrink-0 border border-theme-border
              ${isEnabled ? 'bg-theme-secondary shadow-[0_0_8px_var(--color-secondary)]' : 'bg-gray-800'}
            `}
          >
            <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-theme-toggleKnob ${knobRadius} shadow-md transition-transform duration-300
              ${isEnabled ? 'translate-x-5' : 'translate-x-0'}
            `}></div>
          </button>
        )}
      </div>

      <div 
        className={`transition-[max-height,opacity] duration-300 ease-in-out
          ${isExpanded && isEnabled ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}
          ${allowOverflow && isExpanded && isEnabled ? 'overflow-visible' : 'overflow-hidden'}
        `}
      >
        <div className="p-3 pt-0 border-t border-theme-border">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ModuleWrapper;
