
import React, { useEffect, useState, useRef } from 'react';
import { HelpCircle, X, Keyboard, User, Mail, Github, Terminal } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface HelpModalProps {
  onClose: () => void;
  onRestartTutorial: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose, onRestartTutorial }) => {
  const { t, language } = useLanguage();
  
  const isRu = language === 'ru';

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
    height: animPhase >= 3 ? '640px' : '2px', // Adjusted height slightly for extra rows
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
            
            {/* Main Content */}
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-theme-bg/50">
                {/* Hotkeys */}
                <div>
                    <h4 className="text-theme-text font-mono text-xs uppercase opacity-70 mb-3 flex items-center gap-2">
                        <Keyboard size={14} /> {t('hotkeys')}
                    </h4>
                    <div className="grid grid-cols-[1fr_1.5fr] gap-y-2 gap-x-4 text-xs font-mono">
                        <div className="text-theme-muted font-bold text-right">Space</div><div className="text-theme-text">{isRu ? "Старт / Пауза" : "Play / Pause"}</div>
                        <div className="text-theme-muted font-bold text-right">A / S / D</div><div className="text-theme-text">{isRu ? "Пред / Стоп / След" : "Prev / Stop / Next"}</div>
                        <div className="text-theme-muted font-bold text-right">F</div><div className="text-theme-text">{isRu ? "Кино-режим" : "Cinema Mode"}</div>
                        <div className="text-theme-muted font-bold text-right">Shift + F</div><div className="text-theme-text">{isRu ? "Полный экран" : "Fullscreen"}</div>
                        <div className="text-theme-muted font-bold text-right">[</div><div className="text-theme-text">{isRu ? "Пред. пресет" : "Prev Preset"}</div>
                        <div className="text-theme-muted font-bold text-right">]</div><div className="text-theme-text">{isRu ? "След. пресет" : "Next Preset"}</div>
                        <div className="text-theme-muted font-bold text-right">Arrows ↕</div><div className="text-theme-text">{isRu ? "Громкость" : "Volume"}</div>
                        <div className="text-theme-muted font-bold text-right">Arrows ↔</div><div className="text-theme-text">{isRu ? "Смена фона" : "Change Background"}</div>
                        <div className="text-theme-muted font-bold text-right">Pause/Break</div><div className="text-theme-text">{isRu ? "Перезагрузка" : "Reboot"}</div>
                    </div>
                </div>

                <div className="h-px bg-theme-border"></div>

                {/* Tutorial Restart */}
                <div>
                   <button 
                     onClick={handleRestart}
                     className="w-full py-3 bg-theme-primary/10 border border-theme-primary text-theme-primary font-mono font-bold rounded hover:bg-theme-primary hover:text-black transition-all flex items-center justify-center gap-2"
                   >
                      <Terminal size={16} /> {isRu ? "ЗАПУСТИТЬ ОБУЧЕНИЕ" : "START TUTORIAL"}
                   </button>
                </div>
            </div>

            {/* Footer: Info */}
            <div className="bg-theme-panel border-t border-theme-border p-4 text-xs font-mono">
                <div className="grid grid-cols-1 gap-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-theme-muted">
                            <User size={14} /> <span className="uppercase">{t('author')}</span>
                        </div>
                        <span className="text-theme-text font-bold">MeowMasterArt</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-theme-muted">
                            <Mail size={14} /> <span className="uppercase">{t('contact')}</span>
                        </div>
                        <a href="mailto:Meowmasterart@gmail.com" className="text-theme-primary hover:underline hover:text-theme-accent transition-colors">
                            Meowmasterart@gmail.com
                        </a>
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-theme-muted">
                            <Github size={14} /> <span className="uppercase">{t('repo')}</span>
                        </div>
                        <a href="https://github.com/Neytrino2134/Neon-DVD-Retro-Player" target="_blank" rel="noopener noreferrer" className="text-theme-primary hover:underline hover:text-theme-accent transition-colors truncate max-w-[180px]">
                            github.com/Neytrino2134
                        </a>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
