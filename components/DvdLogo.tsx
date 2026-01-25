
import React, { useEffect, useRef, useState } from 'react';
import { NEON_COLORS, EffectsConfig, DvdConfig } from '../types';

interface DvdLogoProps {
  containerRef: React.RefObject<HTMLDivElement>;
  fps: number;
  effectsConfig?: EffectsConfig;
  config: DvdConfig;
  onPlaySfx?: (name: string) => void;
}

const DvdLogo: React.FC<DvdLogoProps> = ({ containerRef, fps, effectsConfig, config, onPlaySfx }) => {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [color, setColor] = useState(NEON_COLORS[0]);
  const [isVisible, setIsVisible] = useState(true);
  
  // Store direction separately from speed so we can change speed dynamically
  const directionRef = useRef({ x: 1, y: 1 });
  const logoRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const lastDrawTimeRef = useRef<number>(0);

  // Determine aspect ratio based on logo type
  const aspectRatio = config.logoType === 'neon_waves' ? (571.906 / 618.344) : 0.5;

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
            
            // Play SFX if enabled
            if (config.enableSfx && onPlaySfx) {
                const randomIdx = Math.floor(Math.random() * 3); // 0, 1, 2
                onPlaySfx(`Boing_${randomIdx}.mp3`);
            }
        }

        return { x: newX, y: newY };
      });
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [containerRef, fps, effectsConfig, config.speed, config.size, config.enableSfx, onPlaySfx]);

  return (
    <div
      ref={logoRef}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        color: color,
        filter: `drop-shadow(0 0 15px ${color})`,
        opacity: isVisible ? config.opacity : 0, 
        transition: 'opacity 0.05s steps(2), width 0.3s, height 0.3s',
        width: `${config.size}px`,
        height: `${config.size * aspectRatio}px`
      }}
      className="absolute top-0 left-0 z-20 select-none will-change-transform"
    >
        <div className="w-full h-full flex items-center justify-center">
            {config.logoType === 'neon_waves' ? (
                // NEON WAVES LOGO - UPDATED
                <svg id="SVG.SVG" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 618.344 571.906">
                    <defs>
                        <style>{`.cls-1{fill:currentColor;fill-rule:evenodd;}`}</style>
                    </defs>
                    <path id="WAVE" className="cls-1" d="M334,336L437,615l59-159h1l59,106,23-46H685c11.582,0,14.521,6.144,14.33,12.309-0.2,6.452-4.241,11.651-14.176,11.651C659.222,539.96,592,540,592,540l-36,73L500,511,435,683,338,412,274,643,235,540H96c-13.429-.04-15.031-9.363-15-13,0.041-4.752,2.544-11,14-11H251l20,53S290.369,498.562,334,336Z" transform="translate(-81 -111.094)"/>
                    <path id="SUN" className="cls-1" d="M326.346,120.253a221.2,221.2,0,0,1,116.35-2.624q4.885,1.206,9.661,2.624H326.346Zm156.588,11.494A220.58,220.58,0,0,1,507.4,144.994H271.535a223.645,223.645,0,0,1,24.423-13.247H482.934Zm49.222,31.259A222.164,222.164,0,0,1,553.06,183H225.726A222.353,222.353,0,0,1,246.7,163.006H532.156Z" transform="translate(-81 -111.094)"/>
                    <path id="NEON" className="cls-1" d="M247.718,316.261V199.249H215.079v52.468a105.88,105.88,0,0,0,.49,12.4h-0.327a18.614,18.614,0,0,0-1.428-2.611q-0.939-1.47-2-3.02t-2.121-3.019q-1.062-1.468-1.8-2.529l-39.575-53.692H135.031V316.261h32.64V267.139q0-10.771-.49-19.421h0.326a134.347,134.347,0,0,0,8,12.077l41.289,56.466h30.925Zm111.94,0v-27.58H319.349V271.464h35.332V243.883H319.349V226.829h37.616v-27.58H284.1V316.261h75.56Zm134.094-90.207a50.913,50.913,0,0,0-20.482-21.3,60.219,60.219,0,0,0-30.069-7.466q-17.461,0-31.17,7.792a53.924,53.924,0,0,0-21.3,22.073,67.432,67.432,0,0,0-7.589,32.149,61.814,61.814,0,0,0,7.507,30.559,52.832,52.832,0,0,0,21.012,20.971,64.1,64.1,0,0,0,60.505-.245,54.1,54.1,0,0,0,21.215-21.624q7.588-13.911,7.589-31.537Q500.973,239.885,493.752,226.054ZM460.908,274.32A22.988,22.988,0,0,1,453.32,284.6a18.167,18.167,0,0,1-11.016,3.59,18.609,18.609,0,0,1-15.871-8q-5.835-8-5.834-22.277,0-14.606,5.875-22.6t16.4-8q9.627,0,15.177,8.323t5.549,22.766A42.535,42.535,0,0,1,460.908,274.32Zm182.686,41.941V199.249h-32.64v52.468a106.108,106.108,0,0,0,.49,12.4h-0.326a18.824,18.824,0,0,0-1.428-2.611q-0.939-1.47-2-3.02t-2.121-3.019q-1.062-1.468-1.795-2.529L564.2,199.249H530.907V316.261h32.639V267.139q0-10.771-.49-19.421h0.327a134.1,134.1,0,0,0,8,12.077l41.289,56.466h30.926Zm-372.677,24.97-18.892,78.086a58.1,58.1,0,0,0-1.7,9.78h-0.3a61.413,61.413,0,0,0-1.556-9.483l-20.151-78.383H210.167l-21.782,77.79c-1.185,4.3-2.074,10.224-2.074,10.224h-0.37s-0.693-6.964-1.482-10.224L165.2,341.231H145.86L175.569,447.47h20.373l20.3-74.456a50.473,50.473,0,0,0,1.778-10.224h0.3a50.648,50.648,0,0,0,1.556,10.372L240.1,447.47h19.929l29.116-106.239H270.917Zm187.029,0-26.819,80.457a47.11,47.11,0,0,0-2.148,9.113h-0.3a49.758,49.758,0,0,0-1.926-8.965L400.53,341.231H381.268L418.755,447.47h19.707l38.154-106.239h-18.67ZM558.7,432.579H516.693V401.166h36.524V386.275H516.693V356.2h39.636V341.231H499.061V447.47H558.7V432.579Zm25.189,13.187a73.222,73.222,0,0,0,7.705,1.889q4.072,0.779,7.964,1.185a64.872,64.872,0,0,0,6.556.408,71.655,71.655,0,0,0,15.188-1.556,39.092,39.092,0,0,0,12.7-5.038,25.12,25.12,0,0,0,12.039-22.67,25.143,25.143,0,0,0-2.185-10.7,30.99,30.99,0,0,0-5.927-8.557,49.486,49.486,0,0,0-8.668-7.038q-4.927-3.185-10.483-6.075-5.409-2.37-9.52-4.408a44.2,44.2,0,0,1-6.964-4.186,15.827,15.827,0,0,1-4.334-4.742,12.174,12.174,0,0,1-1.482-6.149,10.706,10.706,0,0,1,1.926-6.445,15.084,15.084,0,0,1,5-4.371,23.23,23.23,0,0,1,6.964-2.445,41.755,41.755,0,0,1,7.816-.741q14.224,0,23.263,6.52v-17.41q-7.632-3.779-24.3-3.779a59.665,59.665,0,0,0-14.373,1.741,40.765,40.765,0,0,0-12.557,5.334,28.484,28.484,0,0,0-8.89,9.113,24.448,24.448,0,0,0-3.371,13,26.413,26.413,0,0,0,1.963,10.594,27.418,27.418,0,0,0,5.408,8.112,43.282,43.282,0,0,0,8.113,6.557q4.666,2.964,10.075,5.853,5.037,2.3,9.446,4.408a53.454,53.454,0,0,1,7.668,4.408,19.055,19.055,0,0,1,5.075,5.075,11.715,11.715,0,0,1,1.815,6.556,12.186,12.186,0,0,1-5.445,10.743q-5.447,3.7-16.558,3.7a40.221,40.221,0,0,1-6.964-.667A56.257,56.257,0,0,1,591,432.1a44.921,44.921,0,0,1-7.149-3,28.034,28.034,0,0,1-5.816-4v18.151A24.368,24.368,0,0,0,583.889,445.766Z" transform="translate(-81 -111.094)"/>
                </svg>
            ) : (
                // CLASSIC DVD LOGO (RECTANGLE 2:1)
                <svg viewBox="0 0 100 50" width="100%" height="100%" fill="currentColor">
                     <path d="M 10 25 C 10 10 90 10 90 25 C 90 40 10 40 10 25" stroke="currentColor" strokeWidth="4" fill="none" />
                     <text x="50" y="32" fontSize="22" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" letterSpacing="2">DVD</text>
                     <path d="M 20 40 Q 50 50 80 40" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
            )}
        </div>
    </div>
  );
};

export default DvdLogo;
