
import React, { useEffect, useState, useRef } from 'react';
import { HelpCircle, X, Keyboard, User, Mail, Github, Terminal } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface HelpModalProps {
  onClose: () => void;
  onRestartTutorial: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose, onRestartTutorial }) => {
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

  const handleRestart = () => {
      onRestartTutorial();
      handleClose();
  };

  // Styles calculation based on phase
  const overlayClass = `fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-opacity duration-500 ${animPhase >= 1 ? 'opacity-100' : 'opacity-0'}`;
  
  const windowStyle: React.CSSProperties = {
    width: animPhase >= 2 ? '100%' : '0px',
    height: animPhase >= 3 ? '700px' : '2px', // Approximate max height or sufficient fixed height
    opacity: animPhase >= 2 ? 1 : 0,
    transition: 'width 0.5s cubic-bezier(0.23, 1, 0.32, 1), height 0.5s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.2s',
  };

  const contentClass = `flex flex-col h-full overflow-hidden transition-opacity duration-500 ${animPhase >= 4 ? 'opacity-100' : 'opacity-0'}`;

  return (
    <div className={overlayClass} onClick={handleClose}>
      <div 
        className="bg-theme-panel border border-theme-primary shadow-theme-glow rounded-lg w-full max-w-md overflow-hidden relative flex flex-col"
        style={windowStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={contentClass}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-theme-border bg-theme-bg shrink-0">
            <h3 className="text-theme-primary font-mono text-lg font-bold flex items-center gap-2">
                <HelpCircle size={20} /> {t('help')}
            </h3>
            <button onClick={handleClose} className="text-theme-muted hover:text-theme-text transition-colors">
                <X size={20} />
            </button>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh] custom-scrollbar flex-1">
            {/* Hotkeys */}
            <div>
                <h4 className="text-theme-text font-mono text-xs uppercase opacity-70 mb-3 flex items-center gap-2">
                    <Keyboard size={14} /> {t('hotkeys')}
                </h4>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-mono">
                    <div className="text-theme-muted">Space</div><div className="text-theme-text">Play / Pause</div>
                    <div className="text-theme-muted">F</div><div className="text-theme-text">Cinema Mode</div>
                    <div className="text-theme-muted">Shift + F</div><div className="text-theme-text">Fullscreen</div>
                    <div className="text-theme-muted">Arrows ◄ ►</div><div className="text-theme-text">Change BG</div>
                    <div className="text-theme-muted">Pause/Break</div><div className="text-theme-text">Reboot</div>
                </div>
            </div>

            <div className="h-px bg-theme-border"></div>

            {/* Author Info */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-theme-bg rounded-full text-theme-secondary border border-theme-border"><User size={16}/></div>
                    <div>
                        <div className="text-[10px] text-theme-muted uppercase">{t('author')}</div>
                        <div className="text-theme-text font-mono font-bold">MeowMasterArt</div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-theme-bg rounded-full text-theme-accent border border-theme-border"><Mail size={16}/></div>
                    <div>
                        <div className="text-[10px] text-theme-muted uppercase">{t('contact')}</div>
                        <a href="mailto:Meowmasterart@gmail.com" className="text-theme-text font-mono hover:text-theme-accent transition-colors">Meowmasterart@gmal.com</a>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="p-2 bg-theme-bg rounded-full text-theme-text border border-theme-border"><Github size={16}/></div>
                    <div>
                        <div className="text-[10px] text-theme-muted uppercase">{t('repo')}</div>
                        <a href="https://github.com/Neytrino2134/Neon-DVD-Retro-Player" target="_blank" rel="noopener noreferrer" className="text-theme-primary font-mono hover:underline break-all text-xs">
                            github.com/Neytrino2134/Neon-DVD-Retro-Player
                        </a>
                    </div>
                </div>
            </div>

            <div className="h-px bg-theme-border"></div>

            {/* Tutorial Restart */}
            <div className="pt-2">
               <button 
                 onClick={handleRestart}
                 className="w-full py-3 bg-theme-primary/10 border border-theme-primary text-theme-primary font-mono font-bold rounded hover:bg-theme-primary hover:text-black transition-all flex items-center justify-center gap-2"
               >
                  <Terminal size={16} /> START TUTORIAL
               </button>
            </div>

            </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
