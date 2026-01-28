
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

// SVG PATHS DEFINITIONS
// New Hand Cursor Path (Finger)
const HAND_PATH_D = "M10 11V8.99c0-.88.59-1.64 1.44-1.86h.05A1.99 1.99 0 0 1 14 9.05V12v-2c0-.88.6-1.65 1.46-1.87h.05A1.98 1.98 0 0 1 18 10.06V13v-1.94a2 2 0 0 1 1.51-1.94h0A2 2 0 0 1 22 11.06V14c0 .6-.08 1.27-.21 1.97a7.96 7.96 0 0 1-7.55 6.48 54.98 54.98 0 0 1-4.48 0 7.96 7.96 0 0 1-7.55-6.48C2.08 15.27 2 14.59 2 14v-1.49c0-1.11.9-2.01 2.01-2.01h0a2 2 0 0 1 2.01 2.03l-.01.97v-10c0-1.1.9-2 2-2h0a2 2 0 0 1 2 2V11Z";

// New Grab Cursor Path (Move/Arrows)
const GRAB_PATH_D = "m2 12 3.5-3.5v7L2 12Zm20 0-3.5 3.5v-7L22 12Zm-3.5 0h-13M12 2l3.5 3.5h-7L12 2Zm0 20-3.5-3.5h7L12 22Zm0-3.5v-13";

// New Rounded Cursor Path
const ROUNDED_PATH_D = "M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z";

// --- GLOBAL MOUSE TRACKING STATE ---
const mouseState = {
    x: -100,
    y: -100,
    isClicked: false,
    forceSystemCursor: false,
    isHovering: false,
    isScreenHover: false,
    hideCrosshair: false,
    isOut: false 
};

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
  updateTimer: number; 
}

interface CustomCursorProps {
  style?: CursorStyle;
  retroScreenStyle?: CursorStyle; // New Prop
}

const CustomCursor: React.FC<CustomCursorProps> = ({ style = 'default', retroScreenStyle = 'crosshair' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const dosCursorRef = useRef<HTMLDivElement>(null);
  
  // Refs for SVG Cursors
  const arrowRef = useRef<SVGSVGElement>(null);
  const handRef = useRef<SVGSVGElement>(null);
  const grabRef = useRef<SVGSVGElement>(null); 
  const crosshairRef = useRef<SVGSVGElement>(null);
  const roundedRef = useRef<SVGSVGElement>(null);
  
  const { colors } = useTheme();
  
  // Refs for Canvas particle state
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef(0);

  // --- 1. GLOBAL INPUT TRACKER ---
  useEffect(() => {
      if (listenersAttached) return;
      listenersAttached = true;

      const handleMove = (e: PointerEvent) => {
          mouseState.x = e.clientX;
          mouseState.y = e.clientY;
          mouseState.isOut = false; 

          const target = e.target as HTMLElement;
          let forceSystem = false;

          // Only force system cursor if explicit class is present.
          // Removed automatic scrollbar detection logic.
          if (target.closest && target.closest('.system-cursor')) {
              forceSystem = true;
          } 

          mouseState.forceSystemCursor = forceSystem;

          if (forceSystem) {
              document.body.classList.add('show-system-cursor');
          } else {
              document.body.classList.remove('show-system-cursor');
          }
      };

      const handleDown = () => { mouseState.isClicked = true; };
      const handleUp = () => { mouseState.isClicked = false; };
      const handleOut = () => { mouseState.isOut = true; };
      const handleIn = () => { mouseState.isOut = false; };

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
            target.closest('.cursor-pointer'); 
          
          mouseState.isHovering = !!isInteractive;
          
          const hideZone = target.closest('.cursor-hide-center');
          mouseState.hideCrosshair = !!hideZone;
          
          const isScreen = target.closest('.cursor-target-screen');
          mouseState.isScreenHover = !!isScreen;
      };

      window.addEventListener('pointermove', handleMove, { passive: true });
      window.addEventListener('pointerdown', handleDown);
      window.addEventListener('pointerup', handleUp);
      document.addEventListener('mouseover', handleMouseOver);
      document.addEventListener('mouseleave', handleOut); 
      document.addEventListener('mouseenter', handleIn);

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
    if (style === 'system') {
      document.body.classList.add('force-system-cursor');
    } else {
      document.body.classList.remove('force-system-cursor');
    }
    return () => document.body.classList.remove('force-system-cursor');
  }, [style]);

  // --- 3. CANVAS RESIZE (For Default Style) ---
  useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const resize = () => {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
      };
      window.addEventListener('resize', resize);
      resize();
      return () => window.removeEventListener('resize', resize);
  }, []);

  // --- 4. RENDER LOOP ---
  useEffect(() => {
      let rAF = 0;
      const canvas = canvasRef.current;
      const ctx = canvas ? canvas.getContext('2d') : null;

      const loop = () => {
          const { x, y, forceSystemCursor, isOut, isHovering, isClicked, isScreenHover } = mouseState;
          const isAppDragging = document.body.classList.contains('app-dragging');
          const shouldHide = forceSystemCursor || isOut;

          // DETERMINE ACTIVE STYLE
          const activeStyle = (isScreenHover) ? retroScreenStyle : style;

          if (activeStyle === 'system') {
              // Hide everything if active style is system
              if (canvas) ctx?.clearRect(0, 0, canvas.width, canvas.height);
              if (cursorRef.current) cursorRef.current.style.opacity = '0';
              if (dosCursorRef.current) dosCursorRef.current.style.opacity = '0';
              rAF = requestAnimationFrame(loop);
              return;
          }

          // --- CANVAS (DEFAULT) MODE ---
          if (activeStyle === 'default' && ctx && canvas) {
              // Ensure other cursors hidden
              if (cursorRef.current) cursorRef.current.style.opacity = '0';
              if (dosCursorRef.current) dosCursorRef.current.style.opacity = '0';

              const { hideCrosshair } = mouseState;
              const particles = particlesRef.current;
              frameRef.current++;

              ctx.clearRect(0, 0, canvas.width, canvas.height);

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

              for (let i = particles.length - 1; i >= 0; i--) {
                  const p = particles[i];
                  p.updateTimer--;
                  if (p.updateTimer <= 0) {
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
                          p.vx = 0; p.vy = 0;
                      }
                      p.updateTimer = Math.floor(Math.random() * 10) + 2;
                  }
                  p.x += p.vx; p.y += p.vy;
                  p.life -= p.decay;
                  if (p.life <= 0) { particles.splice(i, 1); continue; }
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

              if (!shouldHide && x > 0 && !hideCrosshair) {
                  ctx.globalAlpha = 0.8;
                  ctx.strokeStyle = isClicked ? '#bc13fe' : '#00f3ff'; 
                  ctx.lineWidth = 2;
                  const gap = isHovering ? 15 : 5;
                  const len = isHovering ? 15 : 10;
                  // Crosshair logic
                  ctx.beginPath(); ctx.moveTo(x - gap - len, y); ctx.lineTo(x - gap, y); ctx.stroke();
                  ctx.beginPath(); ctx.moveTo(x + gap, y); ctx.lineTo(x + gap + len, y); ctx.stroke();
                  ctx.beginPath(); ctx.moveTo(x, y - gap - len); ctx.lineTo(x, y - gap); ctx.stroke();
                  ctx.beginPath(); ctx.moveTo(x, y + gap); ctx.lineTo(x, y + gap + len); ctx.stroke();
                  if (!isHovering && !isClicked) {
                      ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 1, 2, 2);
                  }
                  if (isHovering) {
                      ctx.save(); ctx.translate(x, y); ctx.rotate(frameRef.current * 0.05);
                      ctx.strokeStyle = '#bc13fe'; ctx.strokeRect(-8, -8, 16, 16); ctx.restore();
                  }
              }
          }
          
          // --- DOS TERMINAL MODE ---
          else if (activeStyle === 'dos-terminal' && dosCursorRef.current) {
              if (canvas) ctx?.clearRect(0, 0, canvas.width, canvas.height);
              if (cursorRef.current) cursorRef.current.style.opacity = '0';
              
              dosCursorRef.current.style.transform = `translate(${x}px, ${y}px)`;
              dosCursorRef.current.style.opacity = shouldHide ? '0' : '1';
          }

          // --- DOM / SVG MODE ---
          else if (cursorRef.current) {
              if (canvas) ctx?.clearRect(0, 0, canvas.width, canvas.height);
              if (dosCursorRef.current) dosCursorRef.current.style.opacity = '0';

              const scale = isClicked ? 0.9 : 1;
              cursorRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
              cursorRef.current.style.opacity = shouldHide ? '0' : '1';
              
              if (x > 0 && cursorRef.current.style.display === 'none') {
                  cursorRef.current.style.display = 'block';
              }

              // Determine Visibility of internal SVGs
              let showArrow = false;
              let showHand = false;
              let showGrab = false;
              let showCrosshair = false;
              let showRounded = false;

              if (isAppDragging) {
                  showGrab = true;
              } else if (isHovering) {
                  showHand = true;
              } else if (activeStyle === 'crosshair') {
                  showCrosshair = true;
              } else if (activeStyle === 'rounded') {
                  showRounded = true;
              } else {
                  showArrow = true;
              }

              if (arrowRef.current) arrowRef.current.style.opacity = showArrow ? '1' : '0';
              if (handRef.current) handRef.current.style.opacity = showHand ? '1' : '0';
              if (grabRef.current) grabRef.current.style.opacity = showGrab ? '1' : '0';
              if (crosshairRef.current) crosshairRef.current.style.opacity = showCrosshair ? '1' : '0';
              if (roundedRef.current) roundedRef.current.style.opacity = showRounded ? '1' : '0';
          }

          rAF = requestAnimationFrame(loop);
      };
      
      loop();
      return () => { cancelAnimationFrame(rAF); };
  }, [style, retroScreenStyle]); 

  // --- Determine Colors for SVG Mode ---
  
  const getColorsForStyle = (s: string) => {
      if (s === 'theme-sync') return { primary: colors.primary, secondary: colors.secondary };
      if (s === 'classic-blue') return { primary: '#00f3ff', secondary: '#4d79ff' };
      if (s === 'classic-warm') return { primary: '#ffd700', secondary: '#ff8c00' };
      if (s === 'classic-ocean') return { primary: '#70C6D6', secondary: '#4B8CA8' };
      if (s === 'crosshair') return { primary: colors.primary, secondary: colors.secondary }; // ADAPTIVE CROSSHAIR
      if (s === 'rounded') return { primary: colors.primary, secondary: colors.secondary }; // ADAPTIVE ROUNDED
      return { primary: '#ffffff', secondary: '#808080' }; // Default/White
  };

  const globalColors = getColorsForStyle(style);
  const retroColors = getColorsForStyle(retroScreenStyle);

  const colorMapRef = useRef({ global: globalColors, retro: retroColors });
  useEffect(() => {
      colorMapRef.current = { global: getColorsForStyle(style), retro: getColorsForStyle(retroScreenStyle) };
  }, [style, retroScreenStyle, colors]);

  // Update loop to apply colors
  useEffect(() => {
      const loop = () => {
          const { isScreenHover } = mouseState;
          const activeStyle = isScreenHover ? retroScreenStyle : style;
          
          if (activeStyle !== 'default' && activeStyle !== 'dos-terminal' && activeStyle !== 'system' && cursorRef.current) {
              const pal = isScreenHover ? colorMapRef.current.retro : colorMapRef.current.global;
              
              // Apply colors to SVGs directly
              const targets = [arrowRef.current, handRef.current, grabRef.current, crosshairRef.current, roundedRef.current];
              targets.forEach(svg => {
                  if (svg) {
                      svg.style.color = pal.primary;
                  }
              });
          }
          requestAnimationFrame(loop);
      };
      const id = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(id);
  }, [style, retroScreenStyle]); 

  return (
    <>
        {/* CANVAS */}
        <canvas 
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[999999] mix-blend-screen"
        />

        {/* DOS */}
        <div 
            ref={dosCursorRef}
            className="fixed top-0 left-0 pointer-events-none z-[999999] will-change-transform mix-blend-difference"
            style={{ marginTop: '-10px', marginLeft: '-6px', opacity: 0 }} 
        >
            <div className="w-3 h-5 bg-white animate-[pulse_1s_steps(2)_infinite]"></div>
        </div>

        {/* SVG CONTAINER */}
        <div 
            ref={cursorRef}
            className="fixed top-0 left-0 pointer-events-none z-[999999] will-change-transform"
            style={{ marginTop: '-2px', marginLeft: '-2px', opacity: 0 }}
        >
            {/* 1. ARROW (Standard) */}
            <svg ref={arrowRef} width="24" height="24" viewBox="0 0 24 24" className="absolute top-0 left-0 transition-opacity duration-200" style={{ overflow: 'visible' }}>
                <path d="M2 2 L14 14 L9 14 L12 20 L9 21 L6 15 L2 19 Z" fill="black" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>

            {/* 2. HAND (Link/Hover) */}
            <svg ref={handRef} width="24" height="24" viewBox="0 0 24 24" className="absolute top-0 left-0 transition-opacity duration-200 opacity-0" style={{ transform: 'translate(-2px, -1px)', overflow: 'visible' }}>
                {/* Changed fill to dark theme background (#030712) instead of white */}
                <path d={HAND_PATH_D} fill="#030712" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>

            {/* 3. GRAB (App Dragging) */}
            {/* Updated ViewBox and Path for new Grab Icon */}
            <svg ref={grabRef} width="32" height="32" viewBox="0 0 24 24" className="absolute top-0 left-0 transition-opacity duration-200 opacity-0" style={{ transform: 'translate(-12px, -12px)', overflow: 'visible' }}>
                <path d={GRAB_PATH_D} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="#030712" />
            </svg>

            {/* 4. CROSSHAIR (Retro Screen Alt) */}
            <svg ref={crosshairRef} width="24" height="24" viewBox="0 0 24 24" className="absolute top-0 left-0 transition-opacity duration-200 opacity-0" style={{ transform: 'translate(-12px, -12px)', overflow: 'visible' }}>
                <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
                <line x1="12" y1="2" x2="12" y2="8" stroke="currentColor" strokeWidth="2" />
                <line x1="12" y1="16" x2="12" y2="22" stroke="currentColor" strokeWidth="2" />
                <line x1="2" y1="12" x2="8" y2="12" stroke="currentColor" strokeWidth="2" />
                <line x1="16" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>

            {/* 5. ROUNDED (New Style) */}
            <svg ref={roundedRef} width="24" height="24" viewBox="0 0 24 24" className="absolute top-0 left-0 transition-opacity duration-200 opacity-0" style={{ overflow: 'visible' }}>
                <path d={ROUNDED_PATH_D} fill="#030712" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
        </div>
    </>
  );
};

export default CustomCursor;
