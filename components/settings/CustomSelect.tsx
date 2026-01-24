
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: number | string;
  label: string;
}

interface CustomSelectProps {
  label: string;
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
        <span className="text-white uppercase opacity-70">{label}</span>
      </div>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between bg-black border font-mono text-xs px-3 py-2 transition-all duration-200
            ${isOpen 
              ? 'border-neon-purple shadow-[0_0_10px_#bc13fe] text-neon-purple rounded-t' 
              : 'border-gray-700 text-white hover:border-neon-blue rounded'
            }
          `}
        >
          <span className="truncate">{selectedOption?.label}</span>
          <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-neon-purple' : 'text-gray-500'}`}>
             <ChevronDown size={14} />
          </div>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 w-full bg-black border-x border-b border-neon-purple shadow-[0_0_15px_rgba(188,19,254,0.3)] z-50 max-h-48 overflow-y-auto rounded-b custom-scrollbar">
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`
                  px-3 py-2 text-xs font-mono cursor-pointer transition-colors border-b border-gray-900 last:border-0
                  ${option.value === value 
                    ? 'bg-neon-blue text-black font-bold' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-neon-blue'}
                `}
              >
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
