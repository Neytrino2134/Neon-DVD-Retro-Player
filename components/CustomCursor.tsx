
import React, { useEffect, useRef } from 'react';
import { CursorStyle } from '../types';
import { useTheme } from '../contexts/ThemeContext';

// Restricted palette: Blue, Purple, White
const GLITCH_COLORS = [
  '#00f3ff', // Neon Blue
  '#bc13fe', // Neon Purple
  '#ffffff', // White
];

// Tech/Glitch symbols
const SYMBOLS = ['0', '1', 'X', '+', '<', '>', '_', '█', '▓', '▒', 'ERR', 'NaN', '0x'];

// --- GLOBAL MOUSE TRACKING STATE ---
// This exists outside React lifecycle to persist across re-renders/unmounts
const mouseState = {
    x: -100,
    y: -100,
    isClicked: false,
    forceSystemCursor: false,
    isHovering: false,
    hideCrosshair: false,
    isOut: false // New: Track if mouse is outside window
};

// Global listener setup flag to ensure we only attach once per app lifecycle
let listenersAttached = false;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;      
  decay: number;     
  color: string;
  char: string;
  size: number;
  isBlock: boolean;
  updateTimer: number; // Time until next random behavior change
}

interface CustomCursorProps {
  style?: CursorStyle;
}

const CustomCursor: React.FC<CustomCursorProps> = ({ style = 'default' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<SVGSVGElement>(null);
  const handRef = useRef<SVGSVGElement>(null);
  const grabRef = useRef<SVGSVGElement>(null); // New Hand Ref
  
  const { colors } = useTheme();
  
  // Refs for Canvas particle state
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef(0);

  // --- 1. GLOBAL INPUT TRACKER (Runs Once) ---
  useEffect(() => {
      if (listenersAttached) return;
      listenersAttached = true;

      const handleMove = (e: PointerEvent) => {
          mouseState.x = e.clientX;
          mouseState.y = e.clientY;
          mouseState.isOut = false; 

          // --- SCROLLBAR & SYSTEM CURSOR DETECTION ---
          const target = e.target as HTMLElement;
          let forceSystem = false;

          // 1. Check Explicit Class
          if (target.closest && target.closest('.system-cursor')) {
              forceSystem = true;
          } 
          // 2. Check Scrollbar Hover
          // Optimization: Check simple properties first to avoid heavy calcs
          else if (target.scrollHeight > target.clientHeight) {
              try {
                  const rect = target.getBoundingClientRect();
                  // Check vertical scrollbar zone (Right side, approx 16px buffer for 8px scrollbar)
                  if (e.clientX >= rect.right - 16 && e.clientX <= rect.right && 
                      e.clientY >= rect.top && e.clientY <= rect.bottom) {
                      
                      // Verify overflow style only if in zone to save perf
                      const style = window.getComputedStyle(target);
                      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                          forceSystem = true;
                      }
                  }
              } catch (err) { /* ignore non-element targets */ }
          }

          mouseState.forceSystemCursor = forceSystem;

          if (forceSystem) {
              document.body.classList.add('show-system-cursor');
          } else {
              document.body.classList.remove('show-system-cursor');
          }
      };

      const handleDown = () => {
          mouseState.isClicked = true;
      };

      const handleUp = () => {
          mouseState.isClicked = false;
      };

      const handleOut = () => {
          mouseState.isOut = true;
      };

      const handleIn = () => {
          mouseState.isOut = false;
      };

      const handleMouseOver = (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          const isInteractive = 
            target.tagName === 'BUTTON' || 
            target.tagName === 'A' || 
            target.tagName === 'INPUT' || 
            target.tagName === 'SELECT' || 
            target.classList.contains('cursor-pointer') ||
            target.closest('button') || 
            target.closest('a') ||
            target.closest('.cursor-pointer'); // Explicitly check for parent with cursor-pointer
          
          mouseState.isHovering = !!isInteractive;
          
          const hideZone = target.closest('.cursor-hide-center');
          mouseState.hideCrosshair = !!hideZone;
          
          // NOTE: forceSystemCursor logic is now handled in handleMove for continuous accuracy
      };

      // Attach global listeners
      window.addEventListener('pointermove', handleMove, { passive: true });
      window.addEventListener('pointerdown', handleDown);
      window.addEventListener('pointerup', handleUp);
      document.addEventListener('mouseover', handleMouseOver);
      document.addEventListener('mouseleave', handleOut); // Track exit
      document.addEventListener('mouseenter', handleIn);  // Track enter

      // Cleanup not strictly necessary for global singleton, but good practice if app unmounts completely
      return () => {
          window.removeEventListener('pointermove', handleMove);
          window.removeEventListener('pointerdown', handleDown);
          window.removeEventListener('pointerup', handleUp);
          document.removeEventListener('mouseover', handleMouseOver);
          document.removeEventListener('mouseleave', handleOut);
          document.removeEventListener('mouseenter', handleIn);
          listenersAttached = false;
      };
  }, []);

  // --- 2. SYSTEM CURSOR CLASS SYNC ---
  useEffect(() => {
    // This effect ensures the body class matches the style prop
    if (style === 'system') {
      document.body.classList.add('force-system-cursor');
    } else {
      document.body.classList.remove('force-system-cursor');
    }
    return () => document.body.classList.remove('force-system-cursor');
  }, [style]);

  // --- 3. DEV HOTKEYS (Ctrl+R) ---
  useEffect(() => {
      const handleDevKeys = (e: KeyboardEvent) => {
          if (e.ctrlKey && !e.shiftKey && (e.key === 'r' || e.code === 'KeyR')) {
              e.preventDefault();
              e.stopPropagation();
              console.log('[DEV] Cursor Reset. Coords:', mouseState.x, mouseState.y);
              // Force DOM update manually just in case loop stopped
              if (cursorRef.current) {
                  cursorRef.current.style.transform = `translate(${mouseState.x}px, ${mouseState.y}px)`;
                  cursorRef.current.style.opacity = '1';
              }
          }
      };
      window.addEventListener('keydown', handleDevKeys, { capture: true });
      return () => window.removeEventListener('keydown', handleDevKeys, { capture: true });
  }, []);

  // --- 4. RENDER LOOP (The "Game Loop") ---
  useEffect(() => {
      if (style === 'system') return;

      let rAF = 0;
      const canvas = canvasRef.current;
      const ctx = canvas ? canvas.getContext('2d') : null;

      // Init Canvas Size if needed
      if (style === 'default' && canvas) {
          const resize = () => {
              canvas.width = window.innerWidth;
              canvas.height = window.innerHeight;
          };
          window.addEventListener('resize', resize);
          resize();
      }

      const loop = () => {
          // Common Visibility Logic
          const { x, y, forceSystemCursor, isOut, isHovering, isClicked } = mouseState;
          
          // Check for App Dragging state (Set by SettingsPanel)
          const isAppDragging = document.body.classList.contains('app-dragging');

          // Hide if system cursor is forced (by hover class) OR if mouse is outside window
          const shouldHide = forceSystemCursor || isOut;

          // --- LOGIC FOR DOM CURSOR (CLASSIC / THEME / DOS) ---
          if (style !== 'default' && cursorRef.current) {
              const scale = isClicked ? 0.9 : 1;
              cursorRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
              cursorRef.current.style.opacity = shouldHide ? '0' : '1';
              
              if (x > 0 && cursorRef.current.style.display === 'none') {
                  cursorRef.current.style.display = 'block';
              }

              // Handle Arrow vs Hand vs Grab toggle for classic/theme styles
              if (arrowRef.current && handRef.current && grabRef.current) {
                  if (isAppDragging) {
                      arrowRef.current.style.opacity = '0';
                      handRef.current.style.opacity = '0';
                      grabRef.current.style.opacity = '1';
                  } else if (isHovering) {
                      arrowRef.current.style.opacity = '0';
                      handRef.current.style.opacity = '1';
                      grabRef.current.style.opacity = '0';
                  } else {
                      arrowRef.current.style.opacity = '1';
                      handRef.current.style.opacity = '0';
                      grabRef.current.style.opacity = '0';
                  }
              }
          }

          // --- LOGIC FOR CANVAS CURSOR (Default) ---
          if (style === 'default' && ctx && canvas) {
              const { hideCrosshair } = mouseState;
              const particles = particlesRef.current;
              frameRef.current++;

              ctx.clearRect(0, 0, canvas.width, canvas.height);

              // 1. Spawn Particles (Only if visible)
              if (!shouldHide && x > 0) {
                  const chance = isClicked ? 1.0 : 0.4;
                  const count = isClicked ? 5 : 1;
                  if (Math.random() < chance) {
                      for(let i = 0; i < count; i++) {
                          const angle = Math.floor(Math.random() * 4) * (Math.PI / 2); 
                          const speed = isClicked ? Math.random() * 8 + 2 : Math.random() * 4; 
                          const isBlock = Math.random() > 0.7;
                          const char = isBlock ? '' : SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
                          const offsetX = (Math.random() - 0.5) * (isClicked ? 10 : 30);
                          const offsetY = (Math.random() - 0.5) * (isClicked ? 10 : 30);

                          particles.push({
                              x: x + offsetX,
                              y: y + offsetY,
                              vx: Math.cos(angle) * speed,
                              vy: Math.sin(angle) * speed,
                              life: 1.0,
                              decay: Math.random() * 0.05 + 0.02, 
                              color: GLITCH_COLORS[Math.floor(Math.random() * GLITCH_COLORS.length)],
                              char: char,
                              size: Math.floor(Math.random() * 10) + 8,
                              isBlock: isBlock,
                              updateTimer: Math.floor(Math.random() * 10)
                          });
                      }
                  }
              }

              // 2. Update & Draw Particles
              for (let i = particles.length - 1; i >= 0; i--) {
                  const p = particles[i];
                  p.updateTimer--;
                  
                  if (p.updateTimer <= 0) {
                      // Glitch movement
                      const glitchType = Math.random();
                      if (glitchType < 0.3) {
                          p.x += (Math.random() - 0.5) * 20;
                          p.y += (Math.random() - 0.5) * 20;
                      } else if (glitchType < 0.6) {
                          const angle = Math.floor(Math.random() * 4) * (Math.PI / 2);
                          const speed = Math.random() * 5 + 1;
                          p.vx = Math.cos(angle) * speed;
                          p.vy = Math.sin(angle) * speed;
                      } else {
                          p.vx = 0;
                          p.vy = 0;
                      }
                      p.updateTimer = Math.floor(Math.random() * 10) + 2;
                  }

                  p.x += p.vx;
                  p.y += p.vy;
                  p.life -= p.decay;

                  if (p.life <= 0) {
                      particles.splice(i, 1);
                      continue;
                  }

                  ctx.globalAlpha = p.life;
                  ctx.fillStyle = p.color;
                  
                  if (p.isBlock) {
                      const w = p.size;
                      const h = Math.random() > 0.5 ? p.size : p.size / 4; 
                      ctx.fillRect(p.x, p.y, w, h);
                  } else {
                      ctx.font = `bold ${p.size}px "Courier New", monospace`;
                      ctx.fillText(p.char, p.x, p.y);
                  }
              }

              // 3. Draw Crosshair (Only if visible)
              if (!shouldHide && x > 0 && !hideCrosshair) {
                  ctx.globalAlpha = 0.8;
                  ctx.strokeStyle = isClicked ? '#bc13fe' : '#00f3ff'; 
                  ctx.lineWidth = 2;
                  
                  const gap = isHovering ? 15 : 5;
                  const len = isHovering ? 15 : 10;

                  ctx.beginPath();
                  ctx.moveTo(x - gap - len, y);
                  ctx.lineTo(x - gap, y);
                  ctx.stroke();

                  ctx.beginPath();
                  ctx.moveTo(x + gap, y);
                  ctx.lineTo(x + gap + len, y);
                  ctx.stroke();

                  ctx.beginPath();
                  ctx.moveTo(x, y - gap - len);
                  ctx.lineTo(x, y - gap);
                  ctx.stroke();

                  ctx.beginPath();
                  ctx.moveTo(x, y + gap);
                  ctx.lineTo(x, y + gap + len);
                  ctx.stroke();
                  
                  if (!isHovering && !isClicked) {
                      ctx.fillStyle = '#fff';
                      ctx.fillRect(x - 1, y - 1, 2, 2);
                  }

                  if (isHovering) {
                      ctx.save();
                      ctx.translate(x, y);
                      ctx.rotate(frameRef.current * 0.05);
                      ctx.strokeStyle = '#bc13fe';
                      ctx.strokeRect(-8, -8, 16, 16);
                      ctx.restore();
                  }
              }
          }

          rAF = requestAnimationFrame(loop);
      };

      loop();

      return () => {
          cancelAnimationFrame(rAF);
      };
  }, [style]); // Only restart loop if style changes

  if (style === 'system') return null;

  // --- CLASSIC / THEME CURSOR LOGIC ---
  const isThemeSync = style === 'theme-sync';
  const isClassic = style.startsWith('classic');
  
  let primaryColor = '#ffffff';
  let secondaryColor = '#808080';

  if (isThemeSync) {
      primaryColor = colors.primary;
      secondaryColor = colors.secondary;
  } else if (isClassic) {
      if (style === 'classic-blue') { primaryColor = '#00f3ff'; secondaryColor = '#4d79ff'; }
      else if (style === 'classic-warm') { primaryColor = '#ffd700'; secondaryColor = '#ff8c00'; }
      else if (style === 'classic-ocean') { primaryColor = '#70C6D6'; secondaryColor = '#4B8CA8'; }
      // classic-white defaults
  }

  // UPDATED Z-INDEX: 999999 (Highest Layer)
  return (
    <>
        {/* DEFAULT CANVAS CURSOR */}
        {style === 'default' && (
            <canvas 
                ref={canvasRef}
                className="fixed inset-0 pointer-events-none z-[999999] mix-blend-screen"
            />
        )}

        {/* DOS TERMINAL CURSOR */}
        {style === 'dos-terminal' && (
            <div 
                ref={cursorRef}
                className="fixed top-0 left-0 pointer-events-none z-[999999] will-change-transform mix-blend-difference"
                style={{ marginTop: '0px', marginLeft: '0px', opacity: 0 }} // Init hidden
            >
                <div className="w-3 h-5 bg-white animate-[pulse_1s_steps(2)_infinite]"></div>
            </div>
        )}

        {/* UNIFIED CLASSIC & THEME CURSORS (Arrow + Hand + Grab) */}
        {(isClassic || isThemeSync) && (
            <div 
                ref={cursorRef}
                className="fixed top-0 left-0 pointer-events-none z-[999999] will-change-transform"
                style={{ marginTop: '-2px', marginLeft: '-2px', opacity: 0 }}
            >
                <style>{`
                    @keyframes pulse-stroke-${style} {
                        0% { stroke: ${secondaryColor}; filter: drop-shadow(0 0 2px ${secondaryColor}); }
                        50% { stroke: ${primaryColor}; filter: drop-shadow(0 0 8px ${primaryColor}); }
                        100% { stroke: ${secondaryColor}; filter: drop-shadow(0 0 2px ${secondaryColor}); }
                    }
                    .classic-cursor-path {
                        animation: pulse-stroke-${style} 2s infinite ease-in-out;
                    }
                `}</style>
                
                {/* STANDARD ARROW */}
                <svg 
                    ref={arrowRef} 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    className="absolute top-0 left-0 transition-opacity duration-200"
                    style={{ overflow: 'visible' }} // Added to prevent clipping of thick strokes
                >
                    <path 
                        d="M2 2 L14 14 L9 14 L12 20 L9 21 L6 15 L2 19 Z" 
                        fill="black" 
                        strokeWidth="3" // Increased width for better visibility
                        strokeLinejoin="round"
                        className="classic-cursor-path"
                        style={{ paintOrder: 'stroke' }} // Ensure fill stays clean on top
                    />
                </svg>

                {/* HAND (LINK) POINTER */}
                {/* Scaled down to 17x22, increased path stroke width significantly for visibility */}
                <svg 
                    ref={handRef} 
                    width="17" 
                    height="22" 
                    viewBox="0 0 988 1280" 
                    className="absolute top-0 left-0 transition-opacity duration-200 opacity-0" 
                    style={{ transform: 'translate(-7px, -1px)', overflow: 'visible' }} // Shifted left to align index finger tip with hotspot
                >
                    <g transform="translate(0,1280) scale(0.1,-0.1)" fill="black" stroke="none">
                       <path 
                         className="classic-cursor-path" 
                         strokeWidth="2200" // Massive value due to scaling (effectively ~2px on screen)
                         style={{ paintOrder: 'stroke' }}
                         d="M2920 12520 l0 -280 -275 0 -275 0 0 -2640 0 -2640 -280 0 -280 0 0
                            275 0 275 -905 0 -905 0 0 -835 0 -835 280 0 280 0 0 -275 0 -275 275 0 275 0
                            2 -628 3 -627 348 -3 347 -2 0 -555 0 -555 280 0 280 0 0 -555 0 -555 275 0
                            275 0 0 -905 0 -905 2925 0 2925 0 0 905 0 905 275 0 275 0 0 835 0 835 280 0
                            280 0 0 2015 0 2015 -280 0 -280 0 0 350 0 350 -275 0 -275 0 -2 278 -3 277
                            -627 3 -628 2 0 275 0 275 -835 0 -836 0 1 278 1 277 -625 3 -626 2 0 1180 0
                            1180 -276 2 -275 3 1 278 1 277 -561 0 -560 0 0 -280z"
                       />
                    </g>
                </svg>

                {/* GRAB HAND (DRAGGING) */}
                <svg
                    ref={grabRef}
                    width="24"
                    height="24"
                    viewBox="100 55 65 65" // Adjusted Box for the user's path coordinates
                    className="absolute top-0 left-0 transition-opacity duration-200 opacity-0"
                    style={{ transform: 'translate(-12px, -12px)', overflow: 'visible' }} // Center origin
                >
                    <path 
                        className="classic-cursor-path"
                        strokeWidth="10" // Increased stroke width significantly
                        strokeLinejoin="round" 
                        strokeLinecap="round" // Smooth edges
                        fill="black" // Solid Fill
                        style={{ paintOrder: 'stroke' }} // Paint stroke first, so fill covers the inner half, effectively making stroke "outside"
                        // Updated path from user
                        d="m157.78 103.596-.353 1.862-.416 1.807-.464 1.736-.493 1.647-.505 1.536-.502 1.413-.481 1.265-.445 1.103-.392.923h-50.117l-.39-.921-.445-1.102-.482-1.264-.502-1.409-.505-1.535-.493-1.645-.464-1.734-.416-1.81-.352-1.861-.272-1.9-.176-1.92-.062-1.918V80.196l.033-.5.1-.482.157-.457.215-.428.266-.393.315-.356.355-.314.394-.266.427-.214.457-.159.482-.099.5-.033.502.033.482.099.457.16.427.213.394.266.356.314.312.356.268.393.213.428.16.457.099.481.033.501v16.528h5.554V66.762l.033-.5.099-.482.16-.458.215-.427.266-.394.312-.355.356-.314.393-.266.43-.215.455-.158.481-.1.502-.033.503.034.481.099.456.158.427.215.394.266.355.314.314.355.266.394.216.427.157.458.1.481.034.5v6.718h5.554V60.626l.033-.5.1-.481.157-.458.215-.427.266-.394.314-.355.356-.314.394-.267.427-.215.457-.158.482-.098.5-.034.502.034.482.098.457.158.427.215.394.267.355.314.313.355.266.394.215.427.16.458.099.48.033.501V73.48h5.553v-6.717l.034-.5.099-.482.16-.458.214-.427.267-.394.312-.355.355-.314.394-.266.429-.215.456-.158.481-.1.502-.033.502.034.482.099.456.158.427.215.394.266.355.314.314.355.266.394.215.427.158.458.1.481.034.5v6.718h5.554l.033-.5.099-.482.158-.458.215-.427.266-.393.314-.356.356-.314.393-.266.428-.214.457-.16.481-.098.501-.033.502.033.481.099.458.16.427.213.394.266.355.314.313.356.266.393.215.427.16.458.098.481.034.5V97.87l-.062 1.914-.177 1.914z"
                        transform="translate(2, 2) scale(0.9)" // Slight adjustment to center visually
                    />
                </svg>
            </div>
        )}
    </>
  );
};

export default CustomCursor;
