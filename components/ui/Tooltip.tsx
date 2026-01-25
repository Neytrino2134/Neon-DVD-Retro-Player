
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top', delay = 200 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number>(0);

  const handleMouseEnter = () => {
    timerRef.current = window.setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        let top = 0;
        let left = 0;
        const gap = 10; // distance from element

        // Simple positioning logic
        switch (position) {
          case 'top':
            top = rect.top - gap;
            left = rect.left + rect.width / 2;
            break;
          case 'bottom':
            top = rect.bottom + gap;
            left = rect.left + rect.width / 2;
            break;
          case 'left':
            top = rect.top + rect.height / 2;
            left = rect.left - gap;
            break;
          case 'right':
            top = rect.top + rect.height / 2;
            left = rect.right + gap;
            break;
        }

        setCoords({ top, left });
        setIsVisible(true);
      }
    }, delay);
  };

  const handleMouseLeave = () => {
    clearTimeout(timerRef.current);
    setIsVisible(false);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <>
      <div 
        ref={triggerRef} 
        onMouseEnter={handleMouseEnter} 
        onMouseLeave={handleMouseLeave}
        className="inline-flex" // Ensure it doesn't break layout
      >
        {children}
      </div>
      {isVisible && createPortal(
        <div 
          className="fixed z-[99999] pointer-events-none flex flex-col items-center"
          style={{ 
             top: coords.top, 
             left: coords.left,
             transform: position === 'top' ? 'translate(-50%, -100%)' : 
                        position === 'bottom' ? 'translate(-50%, 0)' :
                        position === 'left' ? 'translate(-100%, -50%)' :
                        'translate(0, -50%)' 
          }}
        >
          <div className="bg-black/90 backdrop-blur-sm border border-neon-blue shadow-[0_0_15px_rgba(0,243,255,0.4)] px-3 py-1.5 rounded text-[10px] font-mono font-bold text-neon-blue tracking-wider uppercase animate-in fade-in zoom-in-95 duration-150 relative">
             {content}
             {/* Tiny decorative arrow depending on position could go here, but minimal looks cleaner for neon */}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
