
import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Cpu } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface StartupOverlayProps {
  onComplete?: () => void;
}

const StartupOverlay: React.FC<StartupOverlayProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [windowState, setWindowState] = useState<'hidden' | 'spawn' | 'expand' | 'full' | 'collapse'>('hidden');
  const [lines, setLines] = useState<string[]>([]);
  const [loginText, setLoginText] = useState('');
  const [passText, setPassText] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [containerOpacity, setContainerOpacity] = useState(1);

  const { language } = useLanguage();
  const linesEndRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<number[]>([]);
  const skippedRef = useRef(false);

  const addLine = (text: string) => {
    setLines(prev => [...prev, text]);
  };

  useEffect(() => {
    if (linesEndRef.current) {
      linesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lines, showLogin, showPass, showProgress]);

  // Skip Function
  const handleSkip = () => {
    if (skippedRef.current || !isVisible) return;
    skippedRef.current = true;

    // Clear all active animation timers immediately
    timeoutsRef.current.forEach(window.clearTimeout);
    timeoutsRef.current = [];

    // Fade out immediately
    setContainerOpacity(0);

    // Short delay to allow fade out to render, then finish
    setTimeout(() => {
        onComplete?.();
        setIsVisible(false);
    }, 500);
  };

  useEffect(() => {
    let mounted = true;
    const isRu = language === 'ru';

    const wait = (ms: number) => new Promise(resolve => {
        const id = window.setTimeout(resolve, ms);
        timeoutsRef.current.push(id);
    });

    const typeLogin = async (text: string) => {
        for (let i = 0; i < text.length; i++) {
            if (!mounted) return;
            await wait(100 + Math.random() * 100);
            setLoginText(prev => prev + text[i]);
        }
    };

    const typePass = async (text: string) => {
        for (let i = 0; i < text.length; i++) {
            if (!mounted) return;
            await wait(100 + Math.random() * 100);
            setPassText(prev => prev + text[i]);
        }
    };

    const runSequence = async () => {
      // 1. Initial Delay & Window Spawn
      await wait(500);
      setWindowState('spawn');
      await wait(600);
      setWindowState('expand');
      await wait(600);
      setWindowState('full');
      await wait(800);

      // 2. Text Sequence
      addLine("NEON BIOS v1.0.4 - INITIALIZING...");
      await wait(800);
      addLine("CHECKING MEMORY INTEGRITY... OK");
      await wait(800);
      addLine("LOADING CORE MODULES... OK");
      await wait(1200);
      
      addLine("--------------------------------");
      addLine(isRu ? "ДОБРО ПОЖАЛОВАТЬ В СИСТЕМУ" : "WELCOME TO THE SYSTEM");
      await wait(800);
      addLine("RETRO SONIC ULTRA v0.1.1");
      await wait(800);
      addLine("--------------------------------");
      await wait(1000);

      addLine(isRu ? "ТРЕБУЕТСЯ АВТОРИЗАЦИЯ." : "AUTHORIZATION REQUIRED.");
      await wait(800);
      addLine(isRu ? "ВВЕДИТЕ ЛОГИН И ПАРОЛЬ:" : "ENTER LOGIN AND PASSWORD:");
      await wait(500);

      // 3. Login
      setShowLogin(true);
      await wait(500);
      await typeLogin("MeowMaster Art");
      await wait(800);

      // 4. Password
      setShowPass(true);
      await wait(500);
      await typePass("********");
      await wait(1000);

      // 5. Authentication
      addLine(isRu ? "ПРОВЕРКА ДАННЫХ..." : "VERIFYING CREDENTIALS...");
      await wait(1500);
      addLine(isRu ? "ДОСТУП РАЗРЕШЕН." : "ACCESS GRANTED.");
      await wait(500);

      // 6. Loading
      setShowProgress(true);
      const steps = 50;
      for (let i = 0; i <= steps; i++) {
          if (!mounted) return;
          setProgress(Math.round((i / steps) * 100));
          await wait(30 + Math.random() * 50);
      }
      await wait(500);
      addLine(isRu ? "ЗАГРУЗКА ИНТЕРФЕЙСА..." : "LOADING INTERFACE...");
      await wait(1000);

      // 7. Cleanup
      setWindowState('collapse');
      await wait(800);
      
      // Fade out the entire overlay
      setContainerOpacity(0);
      await wait(1500); // Wait for fade out transition
      
      if (mounted && !skippedRef.current) {
        onComplete?.();
        setIsVisible(false);
      }
    };

    runSequence();

    return () => {
        mounted = false;
        timeoutsRef.current.forEach(window.clearTimeout);
    };
  }, []); // Empty dependency array is intentional, runs once on mount but reads current language logic inside

  if (!isVisible) return null;

  // Window Sizes based on state
  let width = '0px';
  let height = '2px';

  if (windowState === 'spawn') {
      width = '100px';
      height = '2px';
  } else if (windowState === 'expand') {
      width = '500px';
      height = '2px';
  } else if (windowState === 'full') {
      width = '500px';
      height = '350px';
  } else if (windowState === 'collapse') {
      width = '500px';
      height = '0px';
  }

  // Ensure content fades out during collapse
  const contentOpacity = windowState === 'collapse' ? 0 : 1;

  return (
    <div 
      className="fixed inset-0 z-[10000] bg-black flex items-center justify-center cursor-none transition-opacity duration-1000 ease-out select-none"
      style={{ opacity: containerOpacity }}
      onDoubleClick={handleSkip}
    >
      {/* CRT Effects */}
      <div className="absolute inset-0 bg-white/5 opacity-5 pointer-events-none scanlines"></div>
      <div className="absolute inset-0 pointer-events-none flicker bg-neon-blue/5 opacity-10"></div>

      {/* Main Window */}
      <div 
        className="relative bg-black border-2 border-neon-blue shadow-[0_0_30px_rgba(0,243,255,0.4)] overflow-hidden transition-all duration-700 ease-in-out flex flex-col"
        style={{ 
            width, 
            height,
            opacity: windowState === 'hidden' ? 0 : 1,
            transitionProperty: 'width, height, opacity' 
        }}
      >
        {/* Header */}
        <div className="bg-neon-blue/20 border-b border-neon-blue p-2 flex items-center justify-between shrink-0 h-10">
            <div className="flex items-center gap-2 text-neon-blue">
                <Terminal size={16} className="animate-pulse" />
                <span className="font-mono text-xs font-bold tracking-widest uppercase">SYSTEM BOOT</span>
            </div>
            <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-neon-blue rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-neon-blue/50 rounded-full"></div>
            </div>
        </div>

        {/* Content */}
        <div 
            className="flex-1 p-6 font-mono text-sm text-neon-blue overflow-hidden flex flex-col"
            style={{ opacity: contentOpacity, transition: 'opacity 0.3s' }}
        >
             {/* Lines */}
             <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pb-2">
                 {lines.map((line, i) => (
                     <div key={i} className="leading-tight">{line}</div>
                 ))}
                 
                 {/* Login Input Field Simulation */}
                 {showLogin && (
                     <div className="flex items-center gap-2 mt-2">
                        <span className="text-white">LOGIN{'>'}</span>
                        <span>{loginText}</span>
                        {!showPass && <span className="w-2 h-4 bg-neon-blue animate-pulse"></span>}
                     </div>
                 )}

                 {/* Password Input Field Simulation */}
                 {showPass && (
                     <div className="flex items-center gap-2">
                        <span className="text-white">PASSWORD{'>'}</span>
                        <span>{passText}</span>
                        {!showProgress && <span className="w-2 h-4 bg-neon-blue animate-pulse"></span>}
                     </div>
                 )}
                 <div ref={linesEndRef}></div>
             </div>

             {/* Footer / Progress */}
             {showProgress && (
                 <div className="mt-4 pt-4 border-t border-neon-blue/30 space-y-2">
                     <div className="flex justify-between text-xs uppercase tracking-wider text-neon-blue/70">
                        <span className="flex items-center gap-2"><Cpu size={12}/> PROCESSING MODULES</span>
                        <span>{progress}%</span>
                     </div>
                     <div className="h-2 w-full bg-gray-900 border border-neon-blue/50 p-0.5">
                         <div 
                            className="h-full bg-neon-blue shadow-[0_0_10px_#00f3ff] transition-all duration-100 ease-linear"
                            style={{ width: `${progress}%` }}
                         ></div>
                     </div>
                 </div>
             )}
        </div>

        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.05)_1px,transparent_1px)] bg-[length:20px_20px] pointer-events-none"></div>
      </div>
    </div>
  );
};

export default StartupOverlay;
