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
    if (!config.enabled) {
        leaksRef.current = [];
        return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = canvas.offsetWidth;
    let h = canvas.height = canvas.offsetHeight;

    leaksRef.current = initLeaks(w, h, config.number);

    const render = (_timestamp: number) => {
        // Handle Resize
        if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
             w = canvas.width = canvas.offsetWidth;
             h = canvas.height = canvas.offsetHeight;
             // Re-init if drastic change, or just let them float back in
        }

        ctx.clearRect(0, 0, w, h);
        
        // Critical for the "Light" look
        ctx.globalCompositeOperation = 'screen'; 

        const speedMultiplier = config.speed * 2;

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
            // We actually want them to go off screen slightly, but wrap around for continuous flow
            if (leak.x < -leak.radius) leak.x = w + leak.radius;
            if (leak.x > w + leak.radius) leak.x = -leak.radius;
            if (leak.y < -leak.radius) leak.y = h + leak.radius;
            if (leak.y > h + leak.radius) leak.y = -leak.radius;

            // Draw
            // Opacity oscillation
            const currentOpacity = (leak.opacity + Math.sin(leak.phase * 0.5) * 0.1) * config.intensity;
            
            if (currentOpacity > 0) {
                const gradient = ctx.createRadialGradient(leak.x, leak.y, 0, leak.x, leak.y, leak.radius);
                
                // Core color
                gradient.addColorStop(0, `hsla(${leak.hue}, ${leak.saturation}%, ${leak.lightness}%, ${currentOpacity})`);
                // Soft fade out
                gradient.addColorStop(0.5, `hsla(${leak.hue}, ${leak.saturation}%, ${leak.lightness}%, ${currentOpacity * 0.5})`);
                // Transparent edge
                gradient.addColorStop(1, `hsla(${leak.hue}, ${leak.saturation}%, ${leak.lightness}%, 0)`);

                ctx.fillStyle = gradient;
                
                // Optional: Draw slightly larger rectangle to ensure gradient covers
                ctx.beginPath();
                ctx.arc(leak.x, leak.y, leak.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        // Reset composite for next frame safety (though clearRect handles it usually)
        ctx.globalCompositeOperation = 'source-over';

        animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [config.enabled, config.speed, config.intensity, config.number]);

  // Handle re-init when count changes
  useEffect(() => {
      if (config.enabled && canvasRef.current) {
          const w = canvasRef.current.width;
          const h = canvasRef.current.height;
          // Only re-init if count changed drastically or empty
          if (leaksRef.current.length !== config.number) {
              leaksRef.current = initLeaks(w, h, config.number);
          }
      }
  }, [config.number]);

  if (!config.enabled) return null;

  return (
    <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
    />
  );
};

export default LightLeaksEffect;