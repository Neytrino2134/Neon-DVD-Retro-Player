
import React, { useEffect, useRef } from 'react';
import { NEON_COLORS, VisualizerConfig } from '../types';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  config: VisualizerConfig;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, isPlaying, config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize data array logic
    let bufferLength = 0;
    let dataArray: Uint8Array | null = null;

    const render = () => {
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
         // Update FFT size based on config
         // We multiply by 2 because frequencyBinCount is half of fftSize
         // Wrap in try-catch because Web Audio API requires powers of 2 (32-32768)
         try {
             const targetFFT = config.barCount * 2;
             if (analyser.fftSize !== targetFFT) {
                 analyser.fftSize = targetFFT;
             }
         } catch (e) {
             console.warn("Error setting FFT size:", e);
             // Fallback to safe default if current is invalid
             if (analyser.fftSize !== 256) analyser.fftSize = 256;
         }

         if (!dataArray || dataArray.length !== analyser.frequencyBinCount) {
             bufferLength = analyser.frequencyBinCount;
             dataArray = new Uint8Array(bufferLength);
         }
      }

      if (isPlaying && analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);

        const barWidth = (WIDTH / bufferLength);
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            // Apply sensitivity and scaling
            let barHeight = (dataArray[i] / 255) * (HEIGHT * 0.4) * config.sensitivity;
            if (barHeight > HEIGHT) barHeight = HEIGHT; // Cap at screen height

            // Determine Position
            let y = 0;
            switch (config.position) {
              case 'top':
                y = 0;
                break;
              case 'bottom':
                y = HEIGHT - barHeight;
                break;
              case 'center':
              default:
                y = (HEIGHT / 2) - (barHeight / 2);
                break;
            }
            
            // Determine Color
            let color = '#fff';
            switch (config.style) {
              case 'blue':
                color = '#00f3ff';
                break;
              case 'pink':
                color = '#ff00ff';
                break;
              case 'matrix':
                 // Shades of green based on intensity
                 const intensity = Math.min(255, dataArray[i] + 50);
                 color = `rgb(0, ${intensity}, 0)`;
                 break;
              case 'inferno':
                 // Red to Yellow gradient
                 color = `hsl(${dataArray[i] / 4}, 100%, 50%)`;
                 break;
              case 'retro':
              default:
                const colorIndex = i % NEON_COLORS.length;
                color = NEON_COLORS[colorIndex];
                break;
            }

            // Draw Fill
            ctx.fillStyle = color;
            ctx.shadowBlur = config.style === 'matrix' ? 5 : 10;
            ctx.shadowColor = color;
            ctx.globalAlpha = config.fillOpacity;
            
            // Gap adjustment
            const gap = 2;
            const drawWidth = Math.max(1, barWidth - gap);

            ctx.fillRect(x, y, drawWidth, barHeight);

            // Draw Stroke (Outline)
            if (config.strokeEnabled) {
              ctx.strokeStyle = color; // Use same color or white? Let's use same color.
              ctx.lineWidth = 1;
              ctx.globalAlpha = config.strokeOpacity;
              ctx.strokeRect(x, y, drawWidth, barHeight);
            }

            // Reset alpha for next iteration safety
            ctx.globalAlpha = 1.0;

            x += barWidth;
        }
      } else {
        // Draw idle line
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

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isPlaying, config]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full z-10 pointer-events-none"
    />
  );
};

export default Visualizer;
