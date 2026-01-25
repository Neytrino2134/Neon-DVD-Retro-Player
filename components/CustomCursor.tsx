

import React, { useEffect, useRef } from 'react';

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

const CustomCursor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Refs to store mutable state without re-renders
  const stateRef = useRef({
    mouseX: -100,
    mouseY: -100,
    isClicked: false,
    isHovering: false,
    hideCrosshair: false, // New state to toggle crosshair visibility
    particles: [] as Particle[],
    frame: 0
  });

  useEffect(() => {
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

    // Input Listeners
    const onMouseMove = (e: MouseEvent) => {
      stateRef.current.mouseX = e.clientX;
      stateRef.current.mouseY = e.clientY;
    };

    const onMouseDown = () => { stateRef.current.isClicked = true; };
    const onMouseUp = () => { stateRef.current.isClicked = false; };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Determine if clicking something interactive
      const isInteractive = 
        target.tagName === 'BUTTON' || 
        target.tagName === 'A' || 
        target.tagName === 'INPUT' || 
        target.tagName === 'SELECT' || 
        target.classList.contains('cursor-pointer') ||
        target.closest('button') || 
        target.closest('a');
      
      stateRef.current.isHovering = !!isInteractive;

      // Determine if we should hide the center crosshair (e.g., inside the TV screen)
      // We look for a parent with class 'cursor-hide-center'
      const hideZone = target.closest('.cursor-hide-center');
      stateRef.current.hideCrosshair = !!hideZone;
    };

    // Hide cursor when leaving window
    const onMouseLeave = () => {
      stateRef.current.mouseX = -100;
      stateRef.current.mouseY = -100;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('mouseleave', onMouseLeave);

    // --- PARTICLE SYSTEM ---

    const spawnParticle = (x: number, y: number, burst: boolean) => {
      // Glitch movement: snap to 90 degrees (rectilinear) usually
      const angle = Math.floor(Math.random() * 4) * (Math.PI / 2); 
      // Burst is fast, normal is sporadic
      const speed = burst ? Math.random() * 8 + 2 : Math.random() * 4; 
      
      // 30% chance to be a solid block instead of text
      const isBlock = Math.random() > 0.7;
      const char = isBlock ? '' : SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      
      // Random offset from center to simulate "noise" area
      const offsetX = (Math.random() - 0.5) * (burst ? 10 : 30);
      const offsetY = (Math.random() - 0.5) * (burst ? 10 : 30);

      const p: Particle = {
        x: x + offsetX,
        y: y + offsetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: Math.random() * 0.05 + 0.02, // Fast decay
        color: GLITCH_COLORS[Math.floor(Math.random() * GLITCH_COLORS.length)],
        char: char,
        size: Math.floor(Math.random() * 10) + 8,
        isBlock: isBlock,
        updateTimer: Math.floor(Math.random() * 10) // Jitter frequency
      };
      stateRef.current.particles.push(p);
    };

    const render = () => {
      const { mouseX, mouseY, isClicked, isHovering, hideCrosshair, particles } = stateRef.current;
      stateRef.current.frame++;

      // 1. Clear Screen
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 2. Spawn Particles (Digital Noise)
      if (mouseX > 0) {
        // If clicking, spawn many (Burst). If moving/idle, spawn random static.
        const chance = isClicked ? 1.0 : 0.4;
        const count = isClicked ? 5 : 1;
        
        if (Math.random() < chance) {
          for(let i = 0; i < count; i++) {
             spawnParticle(mouseX, mouseY, isClicked);
          }
        }
      }

      // 3. Update & Draw
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        // --- CHAOTIC PHYSICS ---
        // NO GRAVITY. Pure data glitch.
        
        p.updateTimer--;
        
        // Every few frames, glitch out:
        // 1. Teleport slightly
        // 2. Change velocity completely (90 deg snap)
        // 3. Stop moving
        if (p.updateTimer <= 0) {
            const glitchType = Math.random();
            if (glitchType < 0.3) {
                // Teleport
                p.x += (Math.random() - 0.5) * 20;
                p.y += (Math.random() - 0.5) * 20;
            } else if (glitchType < 0.6) {
                // Change Direction (Rectilinear)
                const angle = Math.floor(Math.random() * 4) * (Math.PI / 2);
                const speed = Math.random() * 5 + 1;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
            } else {
                // Freeze
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

        // Draw
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        
        if (p.isBlock) {
             // Render a data block (pixel artifact)
             const w = p.size;
             const h = Math.random() > 0.5 ? p.size : p.size / 4; // Square or thin line
             ctx.fillRect(p.x, p.y, w, h);
        } else {
             // Render character
             ctx.font = `bold ${p.size}px "Courier New", monospace`;
             ctx.fillText(p.char, p.x, p.y);
        }
      }

      // 4. Draw Cursor (Hacker Crosshair)
      // Only draw if we have valid coordinates AND we are not in a hidden zone
      if (mouseX > 0 && !hideCrosshair) {
          ctx.globalAlpha = 0.8;
          ctx.strokeStyle = isClicked ? '#bc13fe' : '#00f3ff'; // Purple click, Blue hover
          ctx.lineWidth = 2;
          
          const gap = isHovering ? 15 : 5;
          const len = isHovering ? 15 : 10;

          // Horizontal parts
          ctx.beginPath();
          ctx.moveTo(mouseX - gap - len, mouseY);
          ctx.lineTo(mouseX - gap, mouseY);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(mouseX + gap, mouseY);
          ctx.lineTo(mouseX + gap + len, mouseY);
          ctx.stroke();

          // Vertical parts
          ctx.beginPath();
          ctx.moveTo(mouseX, mouseY - gap - len);
          ctx.lineTo(mouseX, mouseY - gap);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(mouseX, mouseY + gap);
          ctx.lineTo(mouseX, mouseY + gap + len);
          ctx.stroke();
          
          // Center dot if idle
          if (!isHovering && !isClicked) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(mouseX - 1, mouseY - 1, 2, 2);
          }

          // Rotating brackets on hover
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
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseleave', onMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[10001] mix-blend-screen"
    />
  );
};

export default CustomCursor;