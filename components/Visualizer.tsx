
import React, { useEffect, useRef } from 'react';
import { NEON_COLORS, VisualizerConfig } from '../types';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  config: VisualizerConfig;
  fps: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, isPlaying, config, fps }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastDrawTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize data array logic
    let bufferLength = 0;
    let dataArray: Uint8Array | null = null;
    
    // Reset draw time
    lastDrawTimeRef.current = 0;

    const render = (timestamp: number) => {
      animationRef.current = requestAnimationFrame(render);

      // FPS Throttling
      const interval = 1000 / fps;
      const elapsed = timestamp - lastDrawTimeRef.current;
      
      if (elapsed < interval) return;

      // Adjust for drift
      lastDrawTimeRef.current = timestamp - (elapsed % interval);

      if (!canvas) return;
      
      // Update dimensions
      if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }

      const WIDTH = canvas.width;
      const HEIGHT = canvas.height;

      // CLEAR SCREEN
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // Check if we have audio context ready
      if (analyser) {
         try {
             // We need high resolution FFT to allow zooming/cropping
             const requiredSize = 2048; 
             if (analyser.fftSize !== requiredSize) {
                 analyser.fftSize = requiredSize;
             }
         } catch (e) {
             console.warn("Error setting FFT size:", e);
         }

         if (!dataArray || dataArray.length !== analyser.frequencyBinCount) {
             bufferLength = analyser.frequencyBinCount;
             dataArray = new Uint8Array(bufferLength);
         }
      }

      if (isPlaying && analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);

        // --- NEW LOGIC: FREQUENCY SLICING (CUTOFFS) ---
        // Calculate start and end indices based on percentage sliders
        const totalBins = bufferLength;
        
        // Removed arbitrary 50% clamp. Now allows full range selection.
        const minP = Math.max(0, Math.min(99, config.minFrequency));
        // Ensure max is always at least 1% higher than min
        const maxP = Math.max(minP + 1, Math.min(100, config.maxFrequency));

        // Start index (Bass Cutoff)
        const startIndex = Math.floor(totalBins * (minP / 100));
        // End index (Treble Cutoff)
        const endIndex = Math.floor(totalBins * (maxP / 100));
        
        const effectiveLength = endIndex - startIndex;
        const binSize = effectiveLength / config.barCount;

        // Processed values array (sized to our desired Bar Count)
        const processedValues = new Float32Array(config.barCount);

        // --- MAPPING DATA TO BARS ---
        // We iterate through our target number of bars, and pull the max value 
        // from the corresponding chunk of frequency data.
        for (let i = 0; i < config.barCount; i++) {
            let maxInChunk = 0;
            const chunkStart = Math.floor(startIndex + (i * binSize));
            const chunkEnd = Math.floor(startIndex + ((i + 1) * binSize));
            
            for (let j = chunkStart; j < chunkEnd && j < totalBins; j++) {
                if (dataArray[j] > maxInChunk) {
                    maxInChunk = dataArray[j];
                }
            }
            
            // If binSize < 1 (zoomed way in), we might just sample indices
            if (binSize < 1) {
                const idx = Math.floor(startIndex + i * binSize);
                if (idx < totalBins) maxInChunk = dataArray[idx];
            }

            processedValues[i] = maxInChunk;
        }

        // --- NORMALIZE & EQUALIZE LOGIC ---
        if (config.normalize) {
            let maxVal = 0;

            // Step 1: Frequency Compensation 
            for (let i = 0; i < config.barCount; i++) {
                // Approximate freq boost based on position in displayed range
                const eqBoost = 1.0 + (i / config.barCount) * 2.0;
                let boostedVal = processedValues[i] * eqBoost;
                
                processedValues[i] = boostedVal;
                if (boostedVal > maxVal) maxVal = boostedVal;
            }

            // Step 2: Dynamic Scaling
            const floor = 50; 
            if (maxVal < floor) maxVal = floor;
            const normalizeScale = 255 / maxVal;

            for (let i = 0; i < config.barCount; i++) {
                processedValues[i] = processedValues[i] * normalizeScale;
            }
        }

        // --- DRAWING ---
        // Calculate Bar Width based on Gap
        let barWidth = 0;
        let startX = 0;

        if (config.mirror) {
            // Mirror Mode: Bars radiate from center
            // Width needs to fit barCount bars in HALF the screen width
            barWidth = (WIDTH / 2) / config.barCount;
            startX = WIDTH / 2;
        } else {
            // Normal Mode
            barWidth = WIDTH / config.barCount;
            startX = 0;
        }

        for (let i = 0; i < config.barCount; i++) {
            const val = processedValues[i];
            
            // Calculate Height
            let barHeight = (val / 255) * (HEIGHT * 0.5) * config.sensitivity;
            if (barHeight > HEIGHT) barHeight = HEIGHT;
            if (barHeight < 2 && config.strokeEnabled) barHeight = 2; 

            // Calculate Y
            let y = 0;
            switch (config.position) {
              case 'top': y = 0; break;
              case 'bottom': y = HEIGHT - barHeight; break;
              case 'center':
              default: y = (HEIGHT / 2) - (barHeight / 2); break;
            }
            
            // Determine Color
            let color = '#fff';
            switch (config.style) {
              case 'blue': color = '#00f3ff'; break;
              case 'pink': color = '#ff00ff'; break;
              case 'matrix':
                 const intensity = Math.min(255, val + 50);
                 color = `rgb(0, ${intensity}, 0)`;
                 break;
              case 'inferno':
                 color = `hsl(${val / 3}, 100%, 50%)`;
                 break;
              case 'retro':
              default:
                const colorIndex = i % NEON_COLORS.length;
                color = NEON_COLORS[colorIndex];
                break;
            }

            // Set Styles
            ctx.fillStyle = color;
            ctx.shadowBlur = config.style === 'matrix' ? 5 : 10;
            ctx.shadowColor = color;
            ctx.globalAlpha = config.fillOpacity;
            
            const gap = config.barGap;
            const drawWidth = Math.max(0.5, barWidth - gap);

            // Draw based on mode
            if (config.mirror) {
                // Right side
                const xRight = startX + (i * barWidth) + (gap / 2);
                ctx.fillRect(xRight, y, drawWidth, barHeight);

                // Left side (mirrored)
                // (i + 1) ensures we don't overlap perfectly at 0, pushes leftwards
                const xLeft = startX - ((i + 1) * barWidth) + (gap / 2);
                ctx.fillRect(xLeft, y, drawWidth, barHeight);

                // Strokes
                if (config.strokeEnabled) {
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 1;
                    ctx.globalAlpha = config.strokeOpacity;
                    ctx.strokeRect(xRight, y, drawWidth, barHeight);
                    ctx.strokeRect(xLeft, y, drawWidth, barHeight);
                }
            } else {
                // Standard Left-to-Right
                const x = (i * barWidth) + (gap / 2);
                ctx.fillRect(x, y, drawWidth, barHeight);

                if (config.strokeEnabled) {
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 1;
                    ctx.globalAlpha = config.strokeOpacity;
                    ctx.strokeRect(x, y, drawWidth, barHeight);
                }
            }

            ctx.globalAlpha = 1.0;
        }
      } else {
        // Idle Line
        ctx.beginPath();
        let yLine = HEIGHT / 2;
        if (config.position === 'top') yLine = 10;
        if (config.position === 'bottom') yLine = HEIGHT - 10;

        ctx.moveTo(0, yLine);
        ctx.lineTo(WIDTH, yLine);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.stroke();
      }
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isPlaying, config, fps]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full z-10 pointer-events-none"
    />
  );
};

export default Visualizer;
