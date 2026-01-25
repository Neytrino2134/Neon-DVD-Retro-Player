
import React, { useEffect, useState, useRef } from 'react';
import { HelpCircle, X, Keyboard, User, Mail, Github } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface HelpModalProps {
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const { t } = useLanguage();
  
  // Animation Phases:
  // 0: Init (Invisible)
  // 1: Overlay Fade In
  // 2: Window Width Expand (Line)
  // 3: Window Height Expand (Box)
  // 4: Content Fade In
  const [animPhase, setAnimPhase] = useState(0);
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    const schedule = (fn: () => void, ms: number) => {
        const id = window.setTimeout(fn, ms);
        timeoutsRef.current.push(id);
    };

    schedule(() => setAnimPhase(1), 50);
    schedule(() => setAnimPhase(2), 300);
    schedule(() => setAnimPhase(3), 800);
    schedule(() => setAnimPhase(4), 1300);

    return () => {
      timeoutsRef.current.forEach(window.clearTimeout);
    };
  }, []);

  const handleClose = () => {
    // Clear any pending opening animations
    timeoutsRef.current.forEach(window.clearTimeout);
    timeoutsRef.current = [];

    // Start Closing Sequence (Reverse of opening)
    setAnimPhase(3); // Fade content out
    
    const t1 = window.setTimeout(() => setAnimPhase(2), 300); // Collapse height
    const t2 = window.setTimeout(() => setAnimPhase(1), 800); // Collapse width
    const t3 = window.setTimeout(() => setAnimPhase(0), 1300); // Fade overlay
    const t4 = window.setTimeout(() => onClose(), 1600); // Unmount parent
    
    timeoutsRef.current.push(t1, t2, t3, t4);
  };

  // Styles calculation based on phase
  const overlayClass = `fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-opacity duration-500 ${animPhase >= 1 ? 'opacity-100' : 'opacity-0'}`;
  
  const windowStyle: React.CSSProperties = {
    width: animPhase >= 2 ? '100%' : '0px',
    height: animPhase >= 3 ? '550px' : '2px', // Approximate max height or sufficient fixed height
    opacity: animPhase >= 2 ? 1 : 0,
    transition: 'width 0.5s cubic-bezier(0.23, 1, 0.32, 1), height 0.5s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.2s',
  };

  const contentClass = `flex flex-col h-full overflow-hidden transition-opacity duration-500 ${animPhase >= 4 ? 'opacity-100' : 'opacity-0'}`;

  return (
    <div className={overlayClass} onClick={handleClose}>
      <div 
        className="bg-gray-900 border border-neon-blue shadow-[0_0_30px_rgba(0,243,255,0.2)] rounded-lg w-full max-w-md overflow-hidden relative flex flex-col"
        style={windowStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={contentClass}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-950 shrink-0">
            <h3 className="text-neon-blue font-mono text-lg font-bold flex items-center gap-2">
                <HelpCircle size={20} /> {t('help')}
            </h3>
            <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
            </button>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh] custom-scrollbar flex-1">
            {/* Hotkeys */}
            <div>
                <h4 className="text-white font-mono text-xs uppercase opacity-70 mb-3 flex items-center gap-2">
                    <Keyboard size={14} /> {t('hotkeys')}
                </h4>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-mono">
                    <div className="text-gray-400">Space</div><div className="text-white">Play / Pause</div>
                    <div className="text-gray-400">F</div><div className="text-white">Cinema Mode</div>
                    <div className="text-gray-400">Shift + F</div><div className="text-white">Fullscreen</div>
                    <div className="text-gray-400">Arrows ◄ ►</div><div className="text-white">Change BG</div>
                    <div className="text-gray-400">Pause/Break</div><div className="text-white">Reboot</div>
                </div>
            </div>

            <div className="h-px bg-gray-800"></div>

            {/* Author Info */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-800 rounded-full text-neon-purple border border-gray-700"><User size={16}/></div>
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase">{t('author')}</div>
                        <div className="text-white font-mono font-bold">MeowMasterArt</div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-800 rounded-full text-neon-green border border-gray-700"><Mail size={16}/></div>
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase">{t('contact')}</div>
                        <a href="mailto:Meowmasterart@gmail.com" className="text-white font-mono hover:text-neon-green transition-colors">Meowmasterart@gmal.com</a>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-800 rounded-full text-white border border-gray-700"><Github size={16}/></div>
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase">{t('repo')}</div>
                        <a href="https://github.com/Neytrino2134/Neon-DVD-Retro-Player" target="_blank" rel="noopener noreferrer" className="text-neon-blue font-mono hover:underline break-all text-xs">
                            github.com/Neytrino2134/Neon-DVD-Retro-Player
                        </a>
                    </div>
                </div>
            </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
