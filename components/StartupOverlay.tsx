
import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Cpu, Power, Key, ShieldCheck, Globe, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

// Characters used for the glitch effect
const GLITCH_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*!??█▓▒░<>/[]{}-=_+";

const MatrixText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const [displayText, setDisplayText] = useState(text);
  const intervalRef = useRef<number>(0);

  useEffect(() => {
    const oldText = displayText;
    const newText = text;
    if (oldText === newText) return;

    const duration = 600;
    const fps = 30;
    const stepTime = 1000 / fps;
    const totalSteps = duration / stepTime;
    let currentStep = 0;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = window.setInterval(() => {
      currentStep++;
      const progress = currentStep / totalSteps;

      if (progress >= 1) {
        setDisplayText(newText);
        clearInterval(intervalRef.current);
        return;
      }

      const chaos = 1 - Math.abs((progress - 0.5) * 2);
      const currentLength = Math.round(oldText.length + (newText.length - oldText.length) * progress);
      
      let result = "";
      for (let i = 0; i < currentLength; i++) {
          if (Math.random() < chaos * 0.8) {
              result += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
          } else {
              if (progress > 0.5) {
                  result += newText[i] || "";
              } else {
                  result += oldText[i] || "";
              }
          }
      }
      setDisplayText(result);
    }, stepTime);

    return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text]);

  return <span className={className}>{displayText}</span>;
};

interface StartupOverlayProps {
  onComplete?: () => void;
  onFadeOut?: () => void;
  onPlaySfx?: (filename: string) => void;
  onStopSfx?: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}

// Updated phases to include split_appear and split_expand
type IntroPhase = 'black' | 'dot' | 'line' | 'split_appear' | 'split_expand' | 'text' | 'window_line' | 'window_expand' | 'content';
type CollapsePhase = 'idle' | 'content_out' | 'line_merge' | 'height_collapse' | 'width_collapse' | 'done';

const StartupOverlay: React.FC<StartupOverlayProps> = ({ onComplete, onFadeOut, onPlaySfx, onStopSfx, apiKey, setApiKey }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [hasStarted, setHasStarted] = useState(false); 
  const [windowState, setWindowState] = useState<'hidden' | 'spawn' | 'expand' | 'full' | 'collapse'>('hidden');
  const [lines, setLines] = useState<string[]>([]);
  const [loginText, setLoginText] = useState('');
  const [passText, setPassText] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [containerOpacity, setContainerOpacity] = useState(1);
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  
  // Standby Screen Animation State
  const [standbyOpacity, setStandbyOpacity] = useState(1);
  const [introPhase, setIntroPhase] = useState<IntroPhase>('black');
  const [collapsePhase, setCollapsePhase] = useState<CollapsePhase>('idle');
  const [headerTyped, setHeaderTyped] = useState("");

  const { language, setLanguage, t } = useLanguage();
  const linesEndRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<number[]>([]);
  const skippedRef = useRef(false);
  
  // Guard to ensure sequence only runs once even if dependencies change
  const sequenceRunningRef = useRef(false);

  const addLine = (text: string) => {
    setLines(prev => [...prev, text]);
  };

  useEffect(() => {
    if (linesEndRef.current) {
      linesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lines, showLogin, showPass, showProgress]);

  // --- INTRO CINEMATIC SEQUENCE ---
  useEffect(() => {
    if (hasStarted) return;

    const sequence = async () => {
        const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

        // 1. Black Screen -> Dot
        await wait(500);
        setIntroPhase('dot');
        
        // 2. Dot -> Line (Vertical Stretch)
        await wait(800);
        setIntroPhase('line');

        // 3. Line -> Split Appear (INSTANT CUT: Center line vanishes, side lines appear at center)
        await wait(800);
        setIntroPhase('split_appear');

        // 4. Split Expand (Side lines move out smoothly)
        await wait(150); // Short pause to register the cut
        setIntroPhase('split_expand');

        // 5. Type Header "SYSTEM STANDBY"
        await wait(1000);
        setIntroPhase('text');
        const text = "NEON BIOS // SECURITY GATE";
        for (let i = 0; i <= text.length; i++) {
            setHeaderTyped(text.slice(0, i));
            await wait(30);
        }

        // 6. Window Line (Horizontal expansion)
        await wait(600);
        setIntroPhase('window_line');

        // 7. Window Expand (Vertical expansion)
        await wait(800);
        setIntroPhase('window_expand');

        // 8. Show Elements
        await wait(800);
        setIntroPhase('content');
    };

    sequence();
  }, [hasStarted]);


  // Skip Function (For Boot Sequence)
  const handleSkip = () => {
    if (skippedRef.current || !isVisible || !hasStarted) return;
    skippedRef.current = true;

    // Call stop SFX from parent
    if (onStopSfx) onStopSfx();

    // Clear all active animation timers immediately
    timeoutsRef.current.forEach(window.clearTimeout);
    timeoutsRef.current = [];

    // Notify App to turn on main screen
    if (onFadeOut) onFadeOut();

    // Fade out immediately
    setContainerOpacity(0);

    // Short delay to allow fade out to render, then finish
    setTimeout(() => {
        onComplete?.();
        setIsVisible(false);
    }, 500);
  };

  // Close Function (For Start Screen)
  const handleClose = async (e?: React.MouseEvent) => {
      e?.stopPropagation();
      
      if (collapsePhase !== 'idle' || introPhase !== 'content') return;
      
      skippedRef.current = true;

      if (tempApiKey !== apiKey) {
          setApiKey(tempApiKey);
      }

      // --- COLLAPSE ANIMATION SEQUENCE ---
      // 1. Fade out content, Collapse Width, Move Side Lines to Center
      setCollapsePhase('content_out');
      await new Promise(r => setTimeout(r, 1050)); // Wait for move to complete (1000ms CSS duration + buffer)

      // 2. Switch to Center Line (Tall)
      setCollapsePhase('line_merge');
      await new Promise(r => setTimeout(r, 50)); // Short frame for switch

      // 3. Collapse Height (Line -> Dot)
      setCollapsePhase('height_collapse');
      await new Promise(r => setTimeout(r, 600));

      // 4. Collapse Width (Dot -> Gone)
      setCollapsePhase('width_collapse');
      await new Promise(r => setTimeout(r, 500));
      
      setCollapsePhase('done');
      
      if (onStopSfx) onStopSfx();
      if (onFadeOut) onFadeOut();
      setStandbyOpacity(0);

      setTimeout(() => {
          onComplete?.();
          setIsVisible(false);
      }, 1000);
  };

  const handleStart = async () => {
      if (collapsePhase !== 'idle' || introPhase !== 'content') return;
      
      if (tempApiKey !== apiKey) {
          setApiKey(tempApiKey);
      }
      
      // Removed onPlaySfx from here to sync with window appearance later

      // --- COLLAPSE ANIMATION SEQUENCE ---
      // 1. Fade out content, Collapse Width, Move Side Lines to Center
      setCollapsePhase('content_out');
      await new Promise(r => setTimeout(r, 1050)); // Wait for move to complete (1000ms CSS duration + buffer)

      // 2. Switch to Center Line (Tall)
      setCollapsePhase('line_merge');
      await new Promise(r => setTimeout(r, 50));

      // 3. Collapse Height (Line -> Dot)
      setCollapsePhase('height_collapse');
      await new Promise(r => setTimeout(r, 600));

      // 4. Collapse Width (Dot -> Gone)
      setCollapsePhase('width_collapse');
      await new Promise(r => setTimeout(r, 500));
      
      setCollapsePhase('done');
      
      // 5. Fade out entire overlay background
      setStandbyOpacity(0);

      setTimeout(() => {
          setHasStarted(true);
      }, 1000);
  };

  // Keyboard listener for Enter
  useEffect(() => {
    if (hasStarted || collapsePhase !== 'idle') return;
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') handleStart();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, collapsePhase, tempApiKey, introPhase]); 

  useEffect(() => {
    // Only run if active and not already running
    if (!hasStarted || sequenceRunningRef.current) return;
    sequenceRunningRef.current = true;

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
      await wait(500);
      // Play SFX exactly when the first beginnings of the window appear
      onPlaySfx?.('Binary_Code_Sound_Effects_Start.mp3');
      setWindowState('spawn');
      await wait(600);
      setWindowState('expand');
      await wait(600);
      setWindowState('full');
      await wait(800);

      addLine("NEON BIOS v1.0.4 - INITIALIZING...");
      await wait(800);
      addLine("CHECKING MEMORY INTEGRITY... OK");
      await wait(800);
      addLine("LOADING CORE MODULES... OK");
      await wait(1200);
      
      addLine("--------------------------------");
      addLine(isRu ? "ДОБРО ПОЖАЛОВАТЬ В СИСТЕМУ" : "WELCOME TO THE SYSTEM");
      await wait(800);
      addLine("RETRO SONIC ULTRA v0.1.2");
      await wait(800);
      addLine("--------------------------------");
      await wait(1000);

      addLine(isRu ? "ТРЕБУЕТСЯ АВТОРИЗАЦИЯ." : "AUTHORIZATION REQUIRED.");
      await wait(800);
      addLine(isRu ? "ВВЕДИТЕ ЛОГИН И ПАРОЛЬ:" : "ENTER LOGIN AND PASSWORD:");
      await wait(500);

      setShowLogin(true);
      await wait(500);
      await typeLogin("MeowMaster Art");
      await wait(800);

      setShowPass(true);
      await wait(500);
      await typePass("********");
      await wait(1000);

      addLine(isRu ? "ПРОВЕРКА ДАННЫХ..." : "VERIFYING CREDENTIALS...");
      await wait(1500);
      addLine(isRu ? "ДОСТУП РАЗРЕШЕН." : "ACCESS GRANTED.");
      await wait(500);

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

      setWindowState('collapse');
      await wait(800);
      
      if (onFadeOut && mounted) onFadeOut();

      setContainerOpacity(0);
      await wait(1500); 
      
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
  }, [hasStarted, language, onComplete, onFadeOut, onPlaySfx]);

  if (!isVisible) return null;

  // INITIAL INTERACTION SCREEN (CINEMATIC)
  if (!hasStarted) {
    
    // Side Lines Logic
    // Show during 'split_appear' through to 'content_out' (merge)
    const showSideLines = ['split_appear', 'split_expand', 'text', 'window_line', 'window_expand', 'content'].includes(introPhase) && (collapsePhase === 'idle' || collapsePhase === 'content_out');
    
    // Expanded only during specific phases (Move Out)
    const sideLinesExpanded = ['split_expand', 'text', 'window_line', 'window_expand', 'content'].includes(introPhase) && collapsePhase === 'idle';

    // Center Line Logic
    // Show initially ('line'), then HIDE INSTANTLY during split, then show again for height collapse (after merge)
    // Using simple boolean here for Conditional Rendering
    const showCenterLine = (introPhase === 'line' || introPhase === 'dot') || (collapsePhase === 'line_merge') || (collapsePhase === 'height_collapse');
    
    // Center Line Height: Tall during intro 'line' and merge 'line_merge'. Shrinks during 'height_collapse' or 'dot'.
    const centerLineHeight = (introPhase === 'line' || collapsePhase === 'line_merge') ? '60vh' : '4px';

    // Window Logic
    const isWindowVisible = ['window_line', 'window_expand', 'content'].includes(introPhase) && collapsePhase !== 'done' && collapsePhase !== 'width_collapse' && collapsePhase !== 'height_collapse' && collapsePhase !== 'line_merge';
    const isWindowExpanded = ['window_expand', 'content'].includes(introPhase);
    
    let windowWidth = '0px';
    if (isWindowVisible) {
        if (collapsePhase === 'content_out') {
            // Snap horizontal: Shrink to center line width to simulate horizontal collapse
            windowWidth = '8px'; 
        } else {
            windowWidth = '660px';
        }
    }

    let windowMaxHeight = '2px'; 
    if (isWindowExpanded && (collapsePhase === 'idle' || collapsePhase === 'content_out')) {
        windowMaxHeight = '800px';
    }

    return (
        <div 
            className="fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-center cursor-none select-none overflow-hidden"
            style={{ 
                opacity: standbyOpacity, 
                transition: 'opacity 1s ease-in-out' 
            }}
        >
            <div className="absolute inset-0 bg-white/5 opacity-5 pointer-events-none scanlines z-20"></div>
            <div className="absolute inset-0 pointer-events-none flicker bg-neon-blue/5 opacity-10 z-20"></div>
            
            {/* --- CINEMATIC LAYER (Lines) --- */}
            {/* Z-Index raised to 30 to appear ABOVE the window (z-10) */}
            <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
                 {/* Center Line (Morphs from Dot -> Tall -> DISAPPEARS -> Tall -> Dot) */}
                 {/* We use Conditional Rendering for the Exit to ensure NO FADE OUT animation (Instant Cut) */}
                 {showCenterLine && (
                     <div 
                        className={`bg-neon-green shadow-[0_0_15px_#00ff00] transition-all duration-700 ease-in-out absolute`}
                        style={{
                            width: '8px', // Increased thickness to prevent visual "jump" from side lines
                            height: centerLineHeight,
                            borderRadius: '0px',
                            opacity: 1 // Always 1 when mounted
                        }}
                    ></div>
                 )}

                {/* Side Lines (Instant Appear, Then Move) */}
                <div 
                    className={`hidden md:block absolute bg-neon-green/80 shadow-[0_0_15px_#00ff00] transition-transform duration-1000 ease-in-out w-1.5`}
                    style={{
                        height: '60vh',
                        left: '50%',
                        // Opacity is handled instantly (no transition on opacity property)
                        opacity: showSideLines ? 1 : 0,
                        transform: sideLinesExpanded ? 'translateX(-45vw)' : 'translateX(-50%)'
                    }}
                ></div>
                <div 
                    className={`hidden md:block absolute bg-neon-green/80 shadow-[0_0_15px_#00ff00] transition-transform duration-1000 ease-in-out w-1.5`}
                    style={{
                        height: '60vh',
                        right: '50%',
                        opacity: showSideLines ? 1 : 0,
                        transform: sideLinesExpanded ? 'translateX(45vw)' : 'translateX(50%)'
                    }}
                ></div>
            </div>

            {/* --- UI LAYER --- */}
            <div className="relative z-10 w-full max-w-4xl flex flex-col items-center justify-center p-4">
                
                <h1 
                    className="text-xl md:text-3xl font-mono font-bold text-white tracking-[0.2em] drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] whitespace-nowrap text-center mb-8 h-10 transition-opacity duration-500"
                    style={{ opacity: collapsePhase === 'idle' ? 1 : 0 }}
                >
                    {headerTyped}
                    {(introPhase === 'text' || introPhase === 'window_line' || introPhase === 'window_expand' || introPhase === 'content') && (
                        <span className="animate-pulse inline-block w-3 h-6 bg-neon-green ml-2 align-middle"></span>
                    )}
                </h1>

                {/* --- MAIN WINDOW CONTAINER --- */}
                <div 
                    className="relative bg-black/90 border-2 border-neon-blue shadow-[0_0_40px_rgba(0,243,255,0.2)] flex flex-col items-center overflow-hidden transition-all duration-700 ease-in-out"
                    style={{
                        width: windowWidth,
                        maxWidth: '100%',
                        maxHeight: windowMaxHeight,
                        height: 'auto', 
                        opacity: (isWindowVisible) ? 1 : 0
                    }}
                >
                     {/* Window Header Strip */}
                     <div className="w-full bg-neon-blue/20 border-b border-neon-blue h-8 flex items-center justify-between px-3 shrink-0">
                        <div className="flex items-center gap-2 text-neon-blue">
                            <ShieldCheck size={14} className="animate-pulse" />
                            <span className="text-[10px] font-mono font-bold tracking-widest uppercase">ACCESS CONTROL</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 bg-neon-blue rounded-full"></div>
                                <div className="w-1.5 h-1.5 bg-neon-blue/50 rounded-full"></div>
                            </div>
                            <button 
                                onClick={handleClose}
                                className="text-neon-blue/50 hover:text-white transition-colors p-0.5 hover:bg-neon-blue/20 rounded"
                                title="SKIP LOGIN"
                            >
                                <X size={14} />
                            </button>
                        </div>
                     </div>

                     {/* Inner Content - Fades out instantly on start */}
                     <div 
                        className="flex flex-col items-center gap-6 w-full p-8 transition-opacity duration-300"
                        style={{ opacity: collapsePhase === 'idle' ? 1 : 0 }}
                     >
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.03)_1px,transparent_1px)] bg-[length:20px_20px] pointer-events-none z-0"></div>

                        <div className="relative z-10">
                            <div 
                                onClick={handleStart}
                                className="w-24 h-24 rounded-full border-2 border-neon-blue flex items-center justify-center bg-neon-blue/5 shadow-[0_0_20px_rgba(0,243,255,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_50px_#00f3ff] hover:bg-neon-blue/20 cursor-pointer group"
                            >
                                <Power size={40} className="text-neon-blue group-hover:animate-pulse" />
                                <div className="absolute inset-0 rounded-full border border-dashed border-neon-blue/30 animate-spin-slow pointer-events-none"></div>
                            </div>
                        </div>

                        <div className="w-full space-y-4 z-10 relative">
                            <div className="flex justify-center gap-4 text-xs font-mono">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setLanguage('en'); }}
                                    className={`flex items-center gap-2 transition-colors ${language === 'en' ? 'text-neon-blue font-bold drop-shadow-[0_0_5px_#00f3ff]' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    <Globe size={12} /> ENG
                                </button>
                                <div className="w-px bg-gray-700"></div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setLanguage('ru'); }}
                                    className={`flex items-center gap-2 transition-colors ${language === 'ru' ? 'text-neon-blue font-bold drop-shadow-[0_0_5px_#00f3ff]' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    <Globe size={12} /> RUS
                                </button>
                            </div>

                            <div className="h-px w-full bg-gradient-to-r from-transparent via-neon-blue/30 to-transparent"></div>
                            
                            <div className="relative w-full">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neon-blue/50">
                                    <Key size={14} />
                                </div>
                                <input 
                                    type="password" 
                                    value={tempApiKey}
                                    onChange={(e) => setTempApiKey(e.target.value)}
                                    placeholder={t('api_key_placeholder')}
                                    className="w-full bg-black/40 border border-neon-blue/30 rounded py-2 pl-9 pr-3 text-xs font-mono text-white caret-white focus:outline-none focus:border-neon-blue focus:shadow-[0_0_15px_rgba(0,243,255,0.2)] transition-all placeholder-neon-blue/20 text-center"
                                />
                            </div>
                        </div>

                        <div 
                            onClick={handleStart}
                            className="text-center cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
                        >
                            <p className="text-neon-blue font-mono text-xs tracking-[0.2em] font-bold animate-pulse">
                                <MatrixText text={language === 'ru' ? 'НАЖМИТЕ ENTER ДЛЯ СТАРТА' : 'PRESS ENTER TO INITIALIZE'} />
                            </p>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
  }

  // Window Sizes based on state (Boot Sequence)
  let width = '0px';
  let height = '2px';

  if (windowState === 'spawn') {
      width = '100px';
      height = '2px';
  } else if (windowState === 'expand') {
      width = '800px'; 
      height = '2px';
  } else if (windowState === 'full') {
      width = '800px'; 
      height = '500px'; 
  } else if (windowState === 'collapse') {
      width = '800px';
      height = '0px';
  }

  const contentOpacity = windowState === 'collapse' ? 0 : 1;

  return (
    <div 
      className={`fixed inset-0 z-[10000] bg-black flex items-center justify-center cursor-none transition-opacity duration-1000 ease-out select-none ${containerOpacity < 1 ? 'pointer-events-none' : ''}`}
      style={{ opacity: containerOpacity }}
      onDoubleClick={handleSkip}
    >
      <div className="absolute inset-0 bg-white/5 opacity-5 pointer-events-none scanlines"></div>
      <div className="absolute inset-0 pointer-events-none flicker bg-neon-blue/5 opacity-10"></div>

      <div 
        className="relative bg-black border-2 border-neon-blue shadow-[0_0_30px_rgba(0,243,255,0.4)] overflow-hidden transition-all duration-700 ease-in-out flex flex-col"
        style={{ 
            width, 
            height,
            opacity: windowState === 'hidden' ? 0 : 1,
            transitionProperty: 'width, height, opacity' 
        }}
      >
        <div className="bg-neon-blue/20 border-b-2 border-neon-blue p-2 flex items-center justify-between shrink-0 h-10">
            <div className="flex items-center gap-2 text-neon-blue">
                <Terminal size={16} className="animate-pulse" />
                <span className="font-mono text-xs font-bold tracking-widest uppercase">SYSTEM BOOT</span>
            </div>
            <div className="flex gap-1">
                <div className="w-2 h-2 bg-neon-blue"></div>
                <div className="w-2 h-2 bg-neon-blue/50"></div>
            </div>
        </div>

        <div 
            className="flex-1 p-8 font-mono text-sm text-neon-blue overflow-hidden flex flex-col"
            style={{ opacity: contentOpacity, transition: 'opacity 0.3s' }}
        >
             <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pb-2">
                 {lines.map((line, i) => (
                     <div key={i} className="leading-tight">{line}</div>
                 ))}
                 
                 {showLogin && (
                     <div className="flex items-center gap-2 mt-4">
                        <span className="text-white">LOGIN{'>'}</span>
                        <span>{loginText}</span>
                        {!showPass && <span className="w-2 h-4 bg-neon-blue animate-pulse"></span>}
                     </div>
                 )}

                 {showPass && (
                     <div className="flex items-center gap-2">
                        <span className="text-white">PASSWORD{'>'}</span>
                        <span>{passText}</span>
                        {!showProgress && <span className="w-2 h-4 bg-neon-blue animate-pulse"></span>}
                     </div>
                 )}
                 <div ref={linesEndRef}></div>
             </div>

             {showProgress && (
                 <div className="mt-4 pt-4 border-t-2 border-neon-blue/30 space-y-2">
                     <div className="flex justify-between text-xs uppercase tracking-wider text-neon-blue/70">
                        <span className="flex items-center gap-2"><Cpu size={12}/> PROCESSING MODULES</span>
                        <span>{progress}%</span>
                     </div>
                     <div className="h-4 w-full bg-gray-900 border border-neon-blue/50 p-1">
                         <div 
                            className="h-full bg-neon-blue shadow-[0_0_10px_#00f3ff] transition-all duration-100 ease-linear"
                            style={{ width: `${progress}%` }}
                         ></div>
                     </div>
                 </div>
             )}
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.05)_1px,transparent_1px)] bg-[length:20px_20px] pointer-events-none"></div>
      </div>
    </div>
  );
};

export default StartupOverlay;
