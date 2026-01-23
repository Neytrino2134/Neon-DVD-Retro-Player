import React, { useEffect, useRef, useState } from 'react';
import { NEON_COLORS } from '../types';

interface DvdLogoProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

const DvdLogo: React.FC<DvdLogoProps> = ({ containerRef }) => {
  const [position, setPosition] = useState({ x: 50, y: 50 }); // Start slightly offset
  const [color, setColor] = useState(NEON_COLORS[0]);
  const velocityRef = useRef({ dx: 2, dy: 2 });
  const logoRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    const animate = () => {
      // If container isn't ready, wait a bit and try again
      if (!containerRef.current || !logoRef.current) {
         requestRef.current = requestAnimationFrame(animate);
         return;
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      const logoRect = logoRef.current.getBoundingClientRect();

      // Guard against zero-size container (e.g. hidden or initializing)
      if (containerRect.width === 0 || containerRect.height === 0) {
          requestRef.current = requestAnimationFrame(animate);
          return;
      }

      setPosition((prev) => {
        let newX = prev.x + velocityRef.current.dx;
        let newY = prev.y + velocityRef.current.dy;
        let hit = false;

        // Check horizontal boundaries
        if (newX + logoRect.width >= containerRect.width) {
          newX = containerRect.width - logoRect.width;
          velocityRef.current.dx = -Math.abs(velocityRef.current.dx);
          hit = true;
        } else if (newX <= 0) {
          newX = 0;
          velocityRef.current.dx = Math.abs(velocityRef.current.dx);
          hit = true;
        }

        // Check vertical boundaries
        if (newY + logoRect.height >= containerRect.height) {
          newY = containerRect.height - logoRect.height;
          velocityRef.current.dy = -Math.abs(velocityRef.current.dy);
          hit = true;
        } else if (newY <= 0) {
          newY = 0;
          velocityRef.current.dy = Math.abs(velocityRef.current.dy);
          hit = true;
        }

        if (hit) {
            const nextColor = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
            setColor(nextColor);
        }

        return { x: newX, y: newY };
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    // Start animation loop
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [containerRef]);

  return (
    <div
      ref={logoRef}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        color: color,
        filter: `drop-shadow(0 0 15px ${color})`,
      }}
      className="absolute top-0 left-0 z-20 select-none will-change-transform"
    >
        <div className="flex flex-col items-center">
            {/* Standard DVD Logo Path */}
            <svg viewBox="0 0 100 50" width="120" height="60" fill="currentColor">
                 <path d="M 10 25 C 10 10 90 10 90 25 C 90 40 10 40 10 25" stroke="currentColor" strokeWidth="4" fill="none" />
                 <text x="50" y="32" fontSize="22" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" letterSpacing="2">DVD</text>
                 <path d="M 20 40 Q 50 50 80 40" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
        </div>
    </div>
  );
};

export default DvdLogo;