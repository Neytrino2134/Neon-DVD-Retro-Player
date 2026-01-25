
import React from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';

interface ModuleWrapperProps {
  id: string;
  label: string;
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
  const activeStyle = isEnabled 
     ? "border-neon-blue/50 bg-gray-800/80 shadow-[inset_0_0_10px_rgba(0,243,255,0.05)]" 
     : "border-gray-700 bg-gray-900/50 opacity-80";

  return (
    <div className={`rounded border transition-all duration-300 overflow-hidden flex flex-col ${activeStyle}`}>
      <div className="flex items-center justify-between p-3 min-h-[50px]">
        <div 
          className="flex items-center gap-3 cursor-pointer select-none flex-1"
          onClick={() => {
             if (isEnabled) onToggleExpand();
             else if (!isAlwaysOn) onToggleEnable(); 
          }}
        >
          <Icon size={18} className={`transition-colors ${isEnabled ? "text-neon-yellow" : "text-gray-500"}`} />
          <span className={`font-mono text-xs font-bold tracking-widest uppercase transition-colors ${isEnabled ? "text-white" : "text-gray-400"}`}>
            {label}
          </span>
          
          {isEnabled && (
             <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
                <ChevronDown size={14} className="text-neon-blue opacity-70" />
             </div>
          )}
        </div>

        {!isAlwaysOn && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleEnable();
            }}
            className={`relative w-10 h-5 rounded-sm transition-all duration-300 shadow-inner ml-3 shrink-0 border border-gray-600/50
              ${isEnabled ? 'bg-neon-purple shadow-[0_0_8px_rgba(188,19,254,0.5)]' : 'bg-gray-800'}
            `}
          >
            <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-sm shadow-md transition-transform duration-300
              ${isEnabled ? 'translate-x-5' : 'translate-x-0'}
            `}></div>
          </button>
        )}
      </div>

      <div 
        className={`transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden
          ${isExpanded && isEnabled ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="p-3 pt-0 border-t border-gray-700/50">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ModuleWrapper;
