
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: number | string;
  label: string; 
  color?: string; // Optional color for the icon
}

interface CustomSelectProps {
  label: React.ReactNode;
  value: number | string;
  options: Option[];
  onChange: (value: any) => void;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ label, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="mb-6 last:mb-2" ref={containerRef}>
      <div className="flex justify-between font-mono text-[10px] mb-2 px-0.5 tracking-tighter">
        <span className="text-theme-text uppercase opacity-70">{label}</span>
      </div>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between bg-black border font-mono text-xs px-3 py-2 transition-all duration-200
            ${isOpen 
              ? 'border-theme-secondary shadow-[0_0_10px_var(--color-secondary)] text-theme-secondary rounded-t' 
              : 'border-theme-border text-theme-text hover:border-theme-primary rounded'
            }
          `}
        >
          <div className="flex items-center gap-2 truncate">
            {selectedOption?.color && (
              <div 
                className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_5px_currentColor]" 
                style={{ backgroundColor: selectedOption.color, color: selectedOption.color }}
              ></div>
            )}
            <span className="truncate">{selectedOption?.label}</span>
          </div>
          <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-theme-secondary' : 'text-gray-500'}`}>
             <ChevronDown size={14} />
          </div>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 w-full bg-black border-x border-b border-theme-secondary shadow-[0_0_15px_var(--color-secondary)] z-50 max-h-48 overflow-y-auto rounded-b custom-scrollbar">
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`
                  px-3 py-2 text-xs font-mono cursor-pointer transition-colors border-b border-gray-900 last:border-0 flex items-center gap-2
                  ${option.value === value 
                    ? 'bg-theme-primary text-black font-bold' 
                    : 'text-theme-muted hover:bg-gray-900 hover:text-theme-primary'}
                `}
              >
                {option.color && (
                  <div 
                    className={`w-2 h-2 rounded-full shrink-0 ${option.value === value ? 'shadow-none ring-1 ring-black' : 'shadow-[0_0_5px_currentColor]'}`} 
                    style={{ backgroundColor: option.color, color: option.color }}
                  ></div>
                )}
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomSelect;
