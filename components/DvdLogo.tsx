
import React, { useEffect, useRef, useState } from 'react';
import { NEON_COLORS, EffectsConfig, DvdConfig } from '../types';

interface DvdLogoProps {
  containerRef: React.RefObject<HTMLDivElement>;
  fps: number;
  effectsConfig?: EffectsConfig;
  config: DvdConfig;
}

const DvdLogo: React.FC<DvdLogoProps> = ({ containerRef, fps, effectsConfig, config }) => {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [color, setColor] = useState(NEON_COLORS[0]);
  const [isVisible, setIsVisible] = useState(true);
  
  // Store direction separately from speed so we can change speed dynamically
  const directionRef = useRef({ x: 1, y: 1 });
  const logoRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const lastDrawTimeRef = useRef<number>(0);

  useEffect(() => {
    lastDrawTimeRef.current = 0;

    const animate = (timestamp: number) => {
      requestRef.current = requestAnimationFrame(animate);

      const interval = 1000 / fps;
      const elapsed = timestamp - lastDrawTimeRef.current;
      
      if (elapsed < interval) return;

      lastDrawTimeRef.current = timestamp - (elapsed % interval);

      if (!containerRef.current || !logoRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      // We can't rely solely on cached rect because size might change
      const logoRect = logoRef.current.getBoundingClientRect();

      if (containerRect.width === 0 || containerRect.height === 0) return;

      // Handle Glitch Randomness
      const isGlitching = effectsConfig?.glitch.enabled;
      const glitchIntensity = effectsConfig?.glitch.intensity || 0;

      if (isGlitching && Math.random() > 0.95 - (glitchIntensity * 0.1)) {
           setIsVisible(Math.random() > 0.5);
      } else {
           setIsVisible(true);
      }

      setPosition((prev) => {
        const frameSkip = 60 / fps;
        
        // Use config speed
        const speed = config.speed;
        let moveX = directionRef.current.x * speed * frameSkip;
        let moveY = directionRef.current.y * speed * frameSkip;
        
        let newX = prev.x + moveX;
        let newY = prev.y + moveY;

        // Glitch Jerk Logic
        if (isGlitching && Math.random() > 0.92 - (glitchIntensity * 0.1)) {
            newX += (Math.random() - 0.5) * 100 * glitchIntensity;
            newY += (Math.random() - 0.5) * 100 * glitchIntensity;
        }

        let hit = false;
        
        // Current width/height based on scaling
        // Since we are applying width via style, logoRect.width is accurate
        const currentW = logoRect.width;
        const currentH = logoRect.height;

        if (newX + currentW >= containerRect.width) {
          newX = containerRect.width - currentW;
          directionRef.current.x = -1;
          hit = true;
        } else if (newX <= 0) {
          newX = 0;
          directionRef.current.x = 1;
          hit = true;
        }

        if (newY + currentH >= containerRect.height) {
          newY = containerRect.height - currentH;
          directionRef.current.y = -1;
          hit = true;
        } else if (newY <= 0) {
          newY = 0;
          directionRef.current.y = 1;
          hit = true;
        }

        if (hit) {
            const nextColor = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
            setColor(nextColor);
        }

        return { x: newX, y: newY };
      });
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [containerRef, fps, effectsConfig, config.speed, config.size]);

  return (
    <div
      ref={logoRef}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        color: color,
        filter: `drop-shadow(0 0 15px ${color})`,
        opacity: isVisible ? config.opacity : 0, 
        transition: 'opacity 0.05s steps(2)',
        width: `${config.size}px`,
        // Aspect ratio is roughly 2:1 (100x50 viewbox), so height auto scales or we calculate it
        height: `${config.size * 0.5}px`
      }}
      className="absolute top-0 left-0 z-20 select-none will-change-transform"
    >
        <div className="w-full h-full flex items-center justify-center">
            <svg viewBox="0 0 100 50" width="100%" height="100%" fill="currentColor">
                 <path d="M 10 25 C 10 10 90 10 90 25 C 90 40 10 40 10 25" stroke="currentColor" strokeWidth="4" fill="none" />
                 <text x="50" y="32" fontSize="22" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" letterSpacing="2">DVD</text>
                 <path d="M 20 40 Q 50 50 80 40" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
        </div>
    </div>
  );
};

export default DvdLogo;
