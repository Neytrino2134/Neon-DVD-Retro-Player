
import React, { useEffect, useRef } from 'react';
import { EffectsConfig } from '../../types';

interface LightLeaksEffectProps {
  config: EffectsConfig['lightLeaks'];
}

interface Leak {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  hue: number;
  saturation: number;
  lightness: number;
  opacity: number;
  phase: number;
  phaseSpeed: number;
}

const LightLeaksEffect: React.FC<LightLeaksEffectProps> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const leaksRef = useRef<Leak[]>([]);
  const animationRef = useRef<number>(0);
  
  // Master opacity for smooth transitions (0 to 1)
  const fadeLevelRef = useRef<number>(0);
  
  // Store config in ref to allow access inside render loop without restarting it
  const configRef = useRef(config);

  useEffect(() => {
      configRef.current = config;
  }, [config]);

  // Cinematic Color Palette (H, S, L)
  const PALETTE = [
      { h: 30, s: 100, l: 60 }, // Amber/Gold
      { h: 330, s: 90, l: 65 }, // Rose/Pink
      { h: 200, s: 90, l: 60 }, // Cyan/Blue
      { h: 260, s: 80, l: 70 }, // Purple
      { h: 40, s: 100, l: 80 }, // Warm White
  ];

  const initLeaks = (width: number, height: number, count: number) => {
      const leaks: Leak[] = [];
      for (let i = 0; i < count; i++) {
          const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
          leaks.push({
              x: Math.random() * width,
              y: Math.random() * height,
              radius: Math.random() * (Math.min(width, height) * 0.4) + (Math.min(width, height) * 0.2),
              vx: (Math.random() - 0.5) * 0.5,
              vy: (Math.random() - 0.5) * 0.5,
              hue: color.h + (Math.random() * 20 - 10), // slight variation
              saturation: color.s,
              lightness: color.l,
              opacity: Math.random() * 0.5 + 0.2,
              phase: Math.random() * Math.PI * 2,
              phaseSpeed: (Math.random() * 0.02) + 0.005
          });
      }
      return leaks;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = canvas.offsetWidth;
    let h = canvas.height = canvas.offsetHeight;

    const render = () => {
        // Handle Resize
        if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
             w = canvas.width = canvas.offsetWidth;
             h = canvas.height = canvas.offsetHeight;
        }

        const cfg = configRef.current;
        const targetFade = cfg.enabled ? 1.0 : 0.0;
        
        // Smooth Interpolation for appearance/disappearance
        // 0.05 factor gives a nice smooth fade over ~1-1.5 seconds
        const delta = (targetFade - fadeLevelRef.current) * 0.05;
        fadeLevelRef.current += delta;

        // Snap to target if very close to avoid endless micro-calcs
        if (Math.abs(targetFade - fadeLevelRef.current) < 0.001) {
            fadeLevelRef.current = targetFade;
        }

        // Optimization: If completely faded out and disabled, stop drawing details
        if (fadeLevelRef.current <= 0 && !cfg.enabled) {
             ctx.clearRect(0, 0, w, h);
             leaksRef.current = []; // Cleanup memory
             animationRef.current = requestAnimationFrame(render);
             return;
        }

        // Initialize leaks if needed
        // 1. If we have opacity but no leaks (e.g. appearing)
        if (leaksRef.current.length === 0 && fadeLevelRef.current > 0) {
             leaksRef.current = initLeaks(w, h, cfg.number);
        } 
        // 2. If config number changed AND we are enabled (don't shift count while fading out to avoid pop)
        else if (cfg.enabled && leaksRef.current.length !== cfg.number) {
             leaksRef.current = initLeaks(w, h, cfg.number);
        }

        ctx.clearRect(0, 0, w, h);
        
        // Critical for the "Light" look
        ctx.globalCompositeOperation = 'screen'; 

        const speedMultiplier = cfg.speed * 2;

        leaksRef.current.forEach((leak) => {
            // Physics Update
            leak.x += leak.vx * speedMultiplier;
            leak.y += leak.vy * speedMultiplier;
            leak.phase += leak.phaseSpeed * speedMultiplier;

            // Hovering effect (Sine wave movement)
            const hoverX = Math.sin(leak.phase) * 0.5 * speedMultiplier;
            const hoverY = Math.cos(leak.phase) * 0.5 * speedMultiplier;
            leak.x += hoverX;
            leak.y += hoverY;

            // Bounce / Wrap Logic
            if (leak.x < -leak.radius) leak.x = w + leak.radius;
            if (leak.x > w + leak.radius) leak.x = -leak.radius;
            if (leak.y < -leak.radius) leak.y = h + leak.radius;
            if (leak.y > h + leak.radius) leak.y = -leak.radius;

            // Draw
            // Opacity oscillation combined with Master Fade
            const osc = Math.sin(leak.phase * 0.5) * 0.1;
            const currentOpacity = (leak.opacity + osc) * cfg.intensity * fadeLevelRef.current;
            
            if (currentOpacity > 0) {
                const gradient = ctx.createRadialGradient(leak.x, leak.y, 0, leak.x, leak.y, leak.radius);
                
                // Core color
                gradient.addColorStop(0, `hsla(${leak.hue}, ${leak.saturation}%, ${leak.lightness}%, ${currentOpacity})`);
                // Soft fade out
                gradient.addColorStop(0.5, `hsla(${leak.hue}, ${leak.saturation}%, ${leak.lightness}%, ${currentOpacity * 0.5})`);
                // Transparent edge
                gradient.addColorStop(1, `hsla(${leak.hue}, ${leak.saturation}%, ${leak.lightness}%, 0)`);

                ctx.fillStyle = gradient;
                
                ctx.beginPath();
                ctx.arc(leak.x, leak.y, leak.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        // Reset composite for next frame safety
        ctx.globalCompositeOperation = 'source-over';

        animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []); // Run once on mount

  return (
    <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
    />
  );
};

export default LightLeaksEffect;
