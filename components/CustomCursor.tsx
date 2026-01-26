
import React, { useEffect, useRef } from 'react';
import { CursorStyle } from '../types';

// Restricted palette: Blue, Purple, White
const GLITCH_COLORS = [
  '#00f3ff', // Neon Blue
  '#bc13fe', // Neon Purple
  '#ffffff', // White
];

// Tech/Glitch symbols
const SYMBOLS = ['0', '1', 'X', '+', '<', '>', '_', '█', '▓', '▒', 'ERR', 'NaN', '0x'];

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
  
  // Shared state for mouse tracking
  const mouseRef = useRef({ 
      x: -100, 
      y: -100, 
      isClicked: false, 
      isHovering: false, 
      hideCrosshair: false,
      forceSystemCursor: false // New flag to detect system cursor override
  });
  
  // Refs for store mutable state for Canvas cursor
  const stateRef = useRef({
    particles: [] as Particle[],
    frame: 0
  });

  useEffect(() => {
    // --- POINTER EVENT LISTENERS (Replaces Mouse Events for better drag support) ---
    // Using pointermove ensures tracking continues even if an element captures the pointer (like a slider)
    const onPointerMove = (e: PointerEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      
      // Update DOM cursor immediately for responsiveness
      if (cursorRef.current) {
          cursorRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
          // Hide custom cursor if system cursor is forced
          if (mouseRef.current.forceSystemCursor) {
              cursorRef.current.style.opacity = '0';
          } else {
              cursorRef.current.style.opacity = '1';
          }
      }
    };

    const onPointerDown = () => { mouseRef.current.isClicked = true; };
    const onPointerUp = () => { mouseRef.current.isClicked = false; };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive = 
        target.tagName === 'BUTTON' || 
        target.tagName === 'A' || 
        target.tagName === 'INPUT' || 
        target.tagName === 'SELECT' || 
        target.classList.contains('cursor-pointer') ||
        target.closest('button') || 
        target.closest('a');
      
      mouseRef.current.isHovering = !!isInteractive;
      
      const hideZone = target.closest('.cursor-hide-center');
      mouseRef.current.hideCrosshair = !!hideZone;

      // Check if we are hovering an element that demands the system cursor
      const isSystemCursor = target.closest('.system-cursor');
      mouseRef.current.forceSystemCursor = !!isSystemCursor;
      
      // Immediate update for DOM cursors
      if (cursorRef.current) {
          cursorRef.current.style.opacity = isSystemCursor ? '0' : '1';
      }
    };

    const onMouseLeave = () => {
      mouseRef.current.x = -100;
      mouseRef.current.y = -100;
      if (cursorRef.current) {
          cursorRef.current.style.display = 'none';
      }
    };
    
    const onMouseEnter = () => {
        if (cursorRef.current) {
            cursorRef.current.style.display = 'block';
        }
    }

    // Attach to window to catch moves outside elements/during capture
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    
    // Hover logic still relies on mouseover bubbling
    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
    };
  }, []);

  // --- CANVAS LOOP (ONLY FOR DEFAULT STYLE) ---
  useEffect(() => {
    if (style !== 'default') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', resize);
    resize();

    const spawnParticle = (x: number, y: number, burst: boolean) => {
      const angle = Math.floor(Math.random() * 4) * (Math.PI / 2); 
      const speed = burst ? Math.random() * 8 + 2 : Math.random() * 4; 
      
      const isBlock = Math.random() > 0.7;
      const char = isBlock ? '' : SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      
      const offsetX = (Math.random() - 0.5) * (burst ? 10 : 30);
      const offsetY = (Math.random() - 0.5) * (burst ? 10 : 30);

      const p: Particle = {
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
      };
      stateRef.current.particles.push(p);
    };

    const render = () => {
      const { x: mouseX, y: mouseY, isClicked, isHovering, hideCrosshair, forceSystemCursor } = mouseRef.current;
      const { particles } = stateRef.current;
      stateRef.current.frame++;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (mouseX > 0) {
        const chance = isClicked ? 1.0 : 0.4;
        const count = isClicked ? 5 : 1;
        if (Math.random() < chance) {
          for(let i = 0; i < count; i++) {
             spawnParticle(mouseX, mouseY, isClicked);
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

      // Draw Cursor ONLY if system cursor is not forced
      if (mouseX > 0 && !hideCrosshair && !forceSystemCursor) {
          ctx.globalAlpha = 0.8;
          ctx.strokeStyle = isClicked ? '#bc13fe' : '#00f3ff'; 
          ctx.lineWidth = 2;
          
          const gap = isHovering ? 15 : 5;
          const len = isHovering ? 15 : 10;

          ctx.beginPath();
          ctx.moveTo(mouseX - gap - len, mouseY);
          ctx.lineTo(mouseX - gap, mouseY);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(mouseX + gap, mouseY);
          ctx.lineTo(mouseX + gap + len, mouseY);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(mouseX, mouseY - gap - len);
          ctx.lineTo(mouseX, mouseY - gap);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(mouseX, mouseY + gap);
          ctx.lineTo(mouseX, mouseY + gap + len);
          ctx.stroke();
          
          if (!isHovering && !isClicked) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(mouseX - 1, mouseY - 1, 2, 2);
          }

          if (isHovering) {
              ctx.save();
              ctx.translate(mouseX, mouseY);
              ctx.rotate(stateRef.current.frame * 0.05);
              ctx.strokeStyle = '#bc13fe';
              ctx.strokeRect(-8, -8, 16, 16);
              ctx.restore();
          }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [style]);

  return (
    <>
        {/* DEFAULT CANVAS CURSOR */}
        {style === 'default' && (
            <canvas 
                ref={canvasRef}
                className="fixed inset-0 pointer-events-none z-[10001] mix-blend-screen"
            />
        )}

        {/* CLASSIC BLUE CURSOR - Brightened */}
        {style === 'classic-blue' && (
            <div 
                ref={cursorRef}
                className="fixed top-0 left-0 pointer-events-none z-[10001] will-change-transform"
                style={{ marginTop: '-2px', marginLeft: '-2px' }} // Slight offset for tip accuracy
            >
                <style>{`
                    @keyframes pulse-stroke-blue {
                        0% { stroke: #4d79ff; filter: drop-shadow(0 0 2px #4d79ff); }
                        50% { stroke: #00f3ff; filter: drop-shadow(0 0 8px #00f3ff); }
                        100% { stroke: #4d79ff; filter: drop-shadow(0 0 2px #4d79ff); }
                    }
                    .classic-blue-arrow path {
                        animation: pulse-stroke-blue 2s infinite ease-in-out;
                    }
                `}</style>
                <svg width="24" height="24" viewBox="0 0 24 24" className="classic-blue-arrow">
                    <path 
                        d="M2 2 L14 14 L9 14 L12 20 L9 21 L6 15 L2 19 Z" 
                        fill="black" 
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
        )}

        {/* CLASSIC WARM CURSOR */}
        {style === 'classic-warm' && (
            <div 
                ref={cursorRef}
                className="fixed top-0 left-0 pointer-events-none z-[10001] will-change-transform"
                style={{ marginTop: '-2px', marginLeft: '-2px' }}
            >
                <style>{`
                    @keyframes pulse-stroke-warm {
                        0% { stroke: #ff8c00; filter: drop-shadow(0 0 2px #ff8c00); }
                        50% { stroke: #ffd700; filter: drop-shadow(0 0 8px #ffd700); }
                        100% { stroke: #ff8c00; filter: drop-shadow(0 0 2px #ff8c00); }
                    }
                    .classic-warm-arrow path {
                        animation: pulse-stroke-warm 2s infinite ease-in-out;
                    }
                `}</style>
                <svg width="24" height="24" viewBox="0 0 24 24" className="classic-warm-arrow">
                    <path 
                        d="M2 2 L14 14 L9 14 L12 20 L9 21 L6 15 L2 19 Z" 
                        fill="black" 
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
        )}

        {/* CLASSIC WHITE CURSOR */}
        {style === 'classic-white' && (
            <div 
                ref={cursorRef}
                className="fixed top-0 left-0 pointer-events-none z-[10001] will-change-transform"
                style={{ marginTop: '-2px', marginLeft: '-2px' }}
            >
                <style>{`
                    @keyframes pulse-stroke-white {
                        0% { stroke: #808080; filter: drop-shadow(0 0 2px #808080); }
                        50% { stroke: #ffffff; filter: drop-shadow(0 0 8px #ffffff); }
                        100% { stroke: #808080; filter: drop-shadow(0 0 2px #808080); }
                    }
                    .classic-white-arrow path {
                        animation: pulse-stroke-white 2s infinite ease-in-out;
                    }
                `}</style>
                <svg width="24" height="24" viewBox="0 0 24 24" className="classic-white-arrow">
                    <path 
                        d="M2 2 L14 14 L9 14 L12 20 L9 21 L6 15 L2 19 Z" 
                        fill="black" 
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
        )}

        {/* CLASSIC OCEAN CURSOR */}
        {style === 'classic-ocean' && (
            <div 
                ref={cursorRef}
                className="fixed top-0 left-0 pointer-events-none z-[10001] will-change-transform"
                style={{ marginTop: '-2px', marginLeft: '-2px' }}
            >
                <style>{`
                    @keyframes pulse-stroke-ocean {
                        0% { stroke: #4B8CA8; filter: drop-shadow(0 0 2px #4B8CA8); }
                        50% { stroke: #70C6D6; filter: drop-shadow(0 0 8px #70C6D6); }
                        100% { stroke: #4B8CA8; filter: drop-shadow(0 0 2px #4B8CA8); }
                    }
                    .classic-ocean-arrow path {
                        animation: pulse-stroke-ocean 2s infinite ease-in-out;
                    }
                `}</style>
                <svg width="24" height="24" viewBox="0 0 24 24" className="classic-ocean-arrow">
                    <path 
                        d="M2 2 L14 14 L9 14 L12 20 L9 21 L6 15 L2 19 Z" 
                        fill="black" 
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
        )}
    </>
  );
};

export default CustomCursor;
