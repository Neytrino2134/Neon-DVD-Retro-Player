
import React, { useEffect, useRef } from 'react';
import { EffectsConfig, VisualizerConfig } from '../../types';

interface LifeEffectProps {
  config: EffectsConfig['life'];
  analyser?: AnalyserNode | null;
  isPlaying?: boolean;
  volume?: number;
  visualizerConfig?: VisualizerConfig;
}

const LifeEffect: React.FC<LifeEffectProps> = ({ config, analyser, isPlaying, volume = 1, visualizerConfig }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  // Simulation State
  const gridRef = useRef<Uint8Array | null>(null);
  const nextGridRef = useRef<Uint8Array | null>(null);
  const trailRef = useRef<Float32Array | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  
  // Dimensions
  const gridDimsRef = useRef({ w: 0, h: 0 });
  const lastDrawTimeRef = useRef(0);
  
  // Config cache to detect trigger changes
  const lastTriggerTokenRef = useRef(0);
  
  // Store config in ref to access latest values inside requestAnimationFrame loop
  const configRef = useRef(config);
  const visConfigRef = useRef(visualizerConfig);

  useEffect(() => {
      configRef.current = config;
  }, [config]);

  useEffect(() => {
      visConfigRef.current = visualizerConfig;
  }, [visualizerConfig]);

  useEffect(() => {
      if (analyser && !dataArrayRef.current) {
          dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      }
  }, [analyser]);

  // Initialize Grids
  const initGrid = (w: number, h: number, cellSize: number) => {
      const cols = Math.ceil(w / cellSize);
      const rows = Math.ceil(h / cellSize);
      const size = cols * rows;
      
      gridRef.current = new Uint8Array(size).fill(0);
      nextGridRef.current = new Uint8Array(size).fill(0);
      trailRef.current = new Float32Array(size).fill(0);
      
      gridDimsRef.current = { w: cols, h: rows };
      
      randomize(cols, rows);
  };

  const randomize = (_cols: number, _rows: number) => {
      const grid = gridRef.current;
      if (!grid) return;
      
      for(let i=0; i<grid.length; i++) {
          grid[i] = Math.random() > 0.85 ? 1 : 0; // Sparse random
      }
  };

  const clear = () => {
      if (gridRef.current) gridRef.current.fill(0);
      if (nextGridRef.current) nextGridRef.current.fill(0);
      if (trailRef.current) trailRef.current.fill(0);
  };

  const spawnGliderGun = (cols: number, rows: number) => {
      clear();
      const grid = gridRef.current;
      if (!grid) return;
      
      const ox = 5;
      const oy = 5;
      const set = (x: number, y: number) => {
          if (x >= 0 && x < cols && y >= 0 && y < rows) {
              grid[y * cols + x] = 1;
          }
      };

      // Gosper Glider Gun pattern
      const coords = [
          [1,5],[2,5],[1,6],[2,6],
          [11,5],[11,6],[11,7],
          [12,4],[12,8],
          [13,3],[13,9],
          [14,3],[14,9],
          [15,6],
          [16,4],[16,8],
          [17,5],[17,6],[17,7],
          [18,6],
          [21,3],[21,4],[21,5],
          [22,3],[22,4],[22,5],
          [23,2],[23,6],
          [25,1],[25,2],[25,6],[25,7],
          [35,3],[35,4],[36,3],[36,4]
      ];

      coords.forEach(p => set(ox + p[0], oy + p[1]));
  };

  const spawnPulsar = (cols: number, rows: number) => {
      clear();
      const grid = gridRef.current;
      if (!grid) return;
      
      const cx = Math.floor(cols / 2);
      const cy = Math.floor(rows / 2);
      
      const set = (x: number, y: number) => {
          if (x >= 0 && x < cols && y >= 0 && y < rows) {
              grid[y * cols + x] = 1;
          }
      };

      // Pulsar pattern quadrants
      const pattern = [
          [2,4],[2,5],[2,6],[4,2],[4,7],[5,2],[5,7],[6,2],[6,7],[7,4],[7,5],[7,6]
      ];

      // Draw 4 quadrants
      pattern.forEach(p => {
          set(cx - p[0], cy - p[1]);
          set(cx + p[0], cy - p[1]);
          set(cx - p[0], cy + p[1]);
          set(cx + p[0], cy + p[1]);
      });
  };

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let w = canvas.width = canvas.offsetWidth;
    let h = canvas.height = canvas.offsetHeight;
    
    // Initial setup with current config values
    initGrid(w, h, configRef.current.cellSize || 10);

    const render = (time: number) => {
        const cfg = configRef.current; // Access latest config
        const visCfg = visConfigRef.current;

        if (!cfg.enabled) {
            ctx.clearRect(0, 0, w, h);
            animationRef.current = requestAnimationFrame(render);
            return;
        }

        // Resize Check
        if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
            w = canvas.width = canvas.offsetWidth;
            h = canvas.height = canvas.offsetHeight;
            initGrid(w, h, cfg.cellSize || 10);
        }

        // Trigger Check (Buttons)
        if (cfg.triggerToken !== lastTriggerTokenRef.current) {
            const cols = gridDimsRef.current.w;
            const rows = gridDimsRef.current.h;
            
            // Ensure grid exists before triggering
            if (gridRef.current && cols > 0 && rows > 0) {
                if (cfg.triggerAction === 'clear') clear();
                else if (cfg.triggerAction === 'random') randomize(cols, rows);
                else if (cfg.triggerAction === 'glider_gun') spawnGliderGun(cols, rows);
                else if (cfg.triggerAction === 'pulsar') spawnPulsar(cols, rows);
            }
            
            lastTriggerTokenRef.current = cfg.triggerToken || 0;
        }

        // Simulation Update
        const targetFPS = Math.max(1, cfg.speed * 6); // Speed 1-10 -> 6-60 FPS
        const interval = 1000 / targetFPS;
        const delta = time - lastDrawTimeRef.current;

        const cols = gridDimsRef.current.w;
        const rows = gridDimsRef.current.h;
        const grid = gridRef.current;
        const nextGrid = nextGridRef.current;
        const trail = trailRef.current;

        if (grid && nextGrid && trail) {
            
            // --- AUDIO INJECTION ---
            // If audio reactive, seed the grid BEFORE calculating next generation
            if (cfg.audioReactive && analyser && isPlaying && dataArrayRef.current && visCfg) {
                analyser.getByteFrequencyData(dataArrayRef.current as any);
                const bufferLen = dataArrayRef.current.length;
                const sampleRate = analyser.context.sampleRate;
                const binSize = sampleRate / 2 / bufferLen;
                
                // Frequency Map
                const minHz = 20 + (visCfg.minFrequency * 40); 
                const maxHz = minHz + 500 + (visCfg.maxFrequency * 180);
                const logMin = Math.log10(minHz);
                const logMax = Math.log10(maxHz);

                // Determine effective columns for mirroring
                const effectiveCols = visCfg.mirror ? Math.floor(cols / 2) : cols;
                
                // Sensitivity from Master Control (fallback to 1.5)
                const sensitivity = (visCfg.sensitivity || 1.5) * (visCfg.preventVolumeScaling ? 1 : volume);

                const inject = (x: number, hRatio: number) => {
                    if (x < 0 || x >= cols) return;
                    
                    const barHeight = Math.floor(hRatio * rows);
                    
                    // Injection Position Logic
                    let y = 0;
                    if (cfg.audioPosition === 'top') {
                        y = barHeight;
                    } else if (cfg.audioPosition === 'center') {
                        // Center is tricky for GoL, maybe just offset from center?
                        // Let's do symmetrical expansion from center line
                        const mid = Math.floor(rows / 2);
                        const halfH = Math.floor(barHeight / 2);
                        // Injecting a strip in center
                        // For 'tip' mode, we inject at top/bottom of the bar
                        // For 'solid', we fill the bar
                        if (cfg.audioInjectionMode === 'tip') {
                             const y1 = Math.max(0, mid - halfH);
                             const y2 = Math.min(rows - 1, mid + halfH);
                             grid[y1 * cols + x] = 1;
                             grid[y2 * cols + x] = 1;
                             return;
                        } else {
                             const start = Math.max(0, mid - halfH);
                             const end = Math.min(rows - 1, mid + halfH);
                             for(let iy = start; iy <= end; iy++) grid[iy * cols + x] = 1;
                             return;
                        }
                    } else {
                        // Bottom (Default)
                        y = rows - 1 - barHeight;
                    }

                    // Clamp
                    y = Math.max(0, Math.min(rows - 1, y));

                    if (cfg.audioInjectionMode === 'tip') {
                        grid[y * cols + x] = 1;
                        // Add a neighbor to ensure survival for 1 tick if isolated
                        if (y + 1 < rows) grid[(y + 1) * cols + x] = 1;
                    } else {
                        // Solid Bar
                        if (cfg.audioPosition === 'top') {
                            for(let iy = 0; iy <= y; iy++) grid[iy * cols + x] = 1;
                        } else {
                            // Bottom
                            for(let iy = rows - 1; iy >= y; iy--) grid[iy * cols + x] = 1;
                        }
                    }
                };

                for (let i = 0; i < effectiveCols; i++) {
                    const t = i / (effectiveCols - 1);
                    // Use logarithmic mapping similar to Visualizer.tsx
                    const freq = Math.pow(10, logMin + (t * (logMax - logMin)));
                    const index = Math.floor(freq / binSize);
                    
                    if (index < bufferLen) {
                        let val = dataArrayRef.current[index] / 255;
                        
                        // Apply physics/curves
                        val = Math.pow(val, 2.5); 
                        val *= sensitivity;
                        
                        // Clamp
                        val = Math.min(1, val);

                        if (val > 0.05) { // Threshold
                            if (visCfg.mirror) {
                                // Left Side
                                const leftX = Math.floor(cols / 2) - 1 - i;
                                inject(leftX, val);
                                // Right Side
                                const rightX = Math.floor(cols / 2) + i;
                                inject(rightX, val);
                            } else {
                                inject(i, val);
                            }
                        }
                    }
                }
            }

            // Update logic only if interval passed
            if (delta > interval) {
                lastDrawTimeRef.current = time - (delta % interval);

                for (let y = 0; y < rows; y++) {
                    for (let x = 0; x < cols; x++) {
                        const idx = y * cols + x;
                        const cell = grid[idx];
                        
                        // Count neighbors (wrapping)
                        let neighbors = 0;
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                if (dx === 0 && dy === 0) continue;
                                const nx = (x + dx + cols) % cols;
                                const ny = (y + dy + rows) % rows;
                                neighbors += grid[ny * cols + nx];
                            }
                        }

                        // Rules (B3/S23)
                        if (cell === 1) {
                            if (neighbors < 2 || neighbors > 3) nextGrid[idx] = 0;
                            else nextGrid[idx] = 1;
                        } else {
                            if (neighbors === 3) nextGrid[idx] = 1;
                            else nextGrid[idx] = 0;
                        }
                    }
                }

                // Swap grids
                gridRef.current = nextGrid;
                nextGridRef.current = grid;
            }

            // Draw
            ctx.clearRect(0, 0, w, h);
            
            // Draw border
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, w, h);

            const cs = cfg.cellSize;
            const activeGrid = gridRef.current!; // Current active grid

            // Iterate to draw and update trails
            // We update trails every frame for smoothness even if sim is slow
            const fade = Math.max(0.01, (1 - cfg.fadeSpeed) * 0.2); 

            ctx.fillStyle = cfg.color;
            
            for (let i = 0; i < activeGrid.length; i++) {
                const cell = activeGrid[i];
                
                // Trail logic
                if (cell === 1) trail[i] = 1.0;
                else trail[i] = Math.max(0, trail[i] - fade);

                if (trail[i] > 0.01) {
                    const x = (i % cols) * cs;
                    const y = Math.floor(i / cols) * cs;
                    
                    // Draw cell
                    ctx.globalAlpha = trail[i];
                    
                    // Add slight gap for grid effect
                    const gap = 1;
                    ctx.fillRect(x + gap, y + gap, cs - gap*2, cs - gap*2);
                }
            }
            ctx.globalAlpha = 1.0;
        }

        animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationRef.current);
  }, []); // Empty dependency array: we rely on configRef for updates to avoid loop restarts

  return (
    <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10 mix-blend-screen"
    />
  );
};

export default LifeEffect;
