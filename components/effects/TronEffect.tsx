
import React, { useEffect, useRef } from 'react';
import { EffectsConfig, NEON_COLORS } from '../../types';

interface TronEffectProps {
  config: EffectsConfig['tron'];
}

interface Agent {
  id: number;
  x: number;
  y: number;
  dirIndex: number; // 0: Up, 1: Right, 2: Down, 3: Left
  color: string;
  alive: boolean;
  stepsAlive: number;
  lastTurnStep: number;
  moveAccumulator: number; // For fractional speeds < 1
  path: {x: number, y: number}[]; // History for instant clearing
}

interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  w: number;
  h: number;
}

const CELL_SIZE = 4;

const TronEffect: React.FC<TronEffectProps> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const agentsRef = useRef<Agent[]>([]);
  const explosionsRef = useRef<ExplosionParticle[]>([]);
  const agentIdCounter = useRef(0);
  
  // Grid: 0 = empty, 1 = trail/wall
  const gridRef = useRef<Uint8Array | null>(null);
  const gridDimsRef = useRef({ w: 0, h: 0 });
  
  const fadeLevelRef = useRef<number>(0);
  const configRef = useRef(config);

  useEffect(() => {
      configRef.current = config;
  }, [config]);

  const DIRECTIONS = [
      { x: 0, y: -1 }, // 0: Up
      { x: 1, y: 0 },  // 1: Right
      { x: 0, y: 1 },  // 2: Down
      { x: -1, y: 0 }  // 3: Left
  ];

  const spawnAgent = (gridW: number, gridH: number): Agent => {
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0, dirIndex = 0;
      const margin = 2;

      switch(side) {
          case 0: // Top
              x = Math.floor(Math.random() * (gridW - margin * 2)) + margin;
              y = margin;
              dirIndex = 2; // Down
              break;
          case 1: // Right
              x = gridW - margin;
              y = Math.floor(Math.random() * (gridH - margin * 2)) + margin;
              dirIndex = 3; // Left
              break;
          case 2: // Bottom
              x = Math.floor(Math.random() * (gridW - margin * 2)) + margin;
              y = gridH - margin;
              dirIndex = 0; // Up
              break;
          case 3: // Left
              x = margin;
              y = Math.floor(Math.random() * (gridH - margin * 2)) + margin;
              dirIndex = 1; // Right
              break;
      }

      return {
          id: agentIdCounter.current++,
          x,
          y,
          dirIndex,
          color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)],
          alive: true,
          stepsAlive: 0,
          lastTurnStep: 0,
          moveAccumulator: 0,
          path: []
      };
  };

  const createExplosion = (gx: number, gy: number, color: string) => {
      const px = gx * CELL_SIZE + CELL_SIZE / 2;
      const py = gy * CELL_SIZE + CELL_SIZE / 2;
      
      // Glitch style: Fewer particles, square shapes, high speed
      for (let i = 0; i < 15; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 8 + 2; // Fast
          const size = Math.random() * 6 + 2;
          // Sometimes stretched rectangles
          const isStrip = Math.random() > 0.7;
          
          explosionsRef.current.push({
              x: px,
              y: py,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 1.0,
              color: color,
              w: isStrip ? size * 3 : size,
              h: isStrip ? size / 2 : size
          });
      }
  };

  // --- SMART AI LOGIC ---
  const evaluateMove = (
      agent: Agent, 
      potentialDirIndex: number, 
      grid: Uint8Array, 
      cols: number, 
      rows: number,
      allAgents: Agent[]
  ): number => {
      const dir = DIRECTIONS[potentialDirIndex];
      const nextX = agent.x + dir.x;
      const nextY = agent.y + dir.y;

      if (nextX < 0 || nextX >= cols || nextY < 0 || nextY >= rows) return -9999;
      if (grid[nextY * cols + nextX] === 1) return -9999;

      let score = 0;

      // Inertia
      const isStraight = potentialDirIndex === agent.dirIndex;
      if (isStraight) score += 40; 

      // Lookahead
      let lookAheadDist = 0;
      const maxLookAhead = 15;
      let scanX = nextX;
      let scanY = nextY;

      for (let i = 0; i < maxLookAhead; i++) {
          scanX += dir.x;
          scanY += dir.y;
          if (scanX < 0 || scanX >= cols || scanY < 0 || scanY >= rows || grid[scanY * cols + scanX] === 1) {
              break;
          }
          lookAheadDist++;
      }

      if (lookAheadDist < 3) score -= 200; 
      else if (lookAheadDist < 8) score -= 50;
      else score += lookAheadDist * 2;

      // Aggression
      let closestDistSq = Infinity;
      let targetAgent: Agent | null = null;

      for (const other of allAgents) {
          if (other.id === agent.id || !other.alive) continue;
          const dx = other.x - agent.x;
          const dy = other.y - agent.y;
          const dSq = dx*dx + dy*dy;
          if (dSq < closestDistSq) {
              closestDistSq = dSq;
              targetAgent = other;
          }
      }

      if (targetAgent && closestDistSq < 10000) {
          const targetDx = targetAgent.x - agent.x;
          const targetDy = targetAgent.y - agent.y;
          const movesCloserX = (Math.sign(targetDx) === dir.x);
          const movesCloserY = (Math.sign(targetDy) === dir.y);
          if (dir.x !== 0 && movesCloserX) score += 30;
          if (dir.y !== 0 && movesCloserY) score += 30;
      }

      // Anti-Spiral
      if (!isStraight) {
          const stepsSinceTurn = agent.stepsAlive - agent.lastTurnStep;
          if (stepsSinceTurn < 10) {
              score -= 30;
          }
      }

      score += Math.random() * 15;
      return score;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let w = canvas.width = canvas.offsetWidth;
    let h = canvas.height = canvas.offsetHeight;
    
    const initGrid = () => {
        w = canvas.width = canvas.offsetWidth;
        h = canvas.height = canvas.offsetHeight;
        let cols = Math.ceil(w / CELL_SIZE);
        let rows = Math.ceil(h / CELL_SIZE);
        gridRef.current = new Uint8Array(cols * rows).fill(0);
        gridDimsRef.current = { w: cols, h: rows };
        agentsRef.current = [];
        explosionsRef.current = [];
        ctx.clearRect(0, 0, w, h);
    };

    initGrid();

    const render = () => {
        if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
             initGrid();
        }

        const cfg = configRef.current;
        const cols = gridDimsRef.current.w;
        const rows = gridDimsRef.current.h;

        const targetFade = cfg.enabled ? 1.0 : 0.0;
        fadeLevelRef.current += (targetFade - fadeLevelRef.current) * 0.05;

        if (fadeLevelRef.current < 0.005 && !cfg.enabled) {
             ctx.clearRect(0, 0, w, h);
             agentsRef.current = [];
             explosionsRef.current = [];
             if (gridRef.current) gridRef.current.fill(0);
             animationRef.current = requestAnimationFrame(render);
             return;
        }

        // --- CLEAN FADE LOGIC ---
        // Instead of drawing black (dirty), we use destination-out to erase to transparency
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; // Adjust this value to control trail length (0.05 = long, 0.1 = short)
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';

        // Grid cleanup logic: Since visuals fade, we must clear logical walls too
        // Increased probability to match the visual fade
        if (gridRef.current && Math.random() < 0.2) {
            // Randomly clear 2% of the grid to prevent "invisible walls" buildup
            const totalCells = gridRef.current.length;
            const cellsToClear = Math.floor(totalCells * 0.02);
            for (let k = 0; k < cellsToClear; k++) {
                const idx = Math.floor(Math.random() * totalCells);
                gridRef.current[idx] = 0;
            }
        }

        // Spawn
        const maxAgents = 40;
        const spawnChance = cfg.spawnRate * 0.02;
        if (Math.random() < spawnChance && agentsRef.current.length < maxAgents) {
            agentsRef.current.push(spawnAgent(cols, rows));
        }

        // --- UPDATE AGENTS ---
        agentsRef.current.forEach(agent => {
            if (!agent.alive) return;
            const grid = gridRef.current;
            if (!grid) return;

            // Add speed to accumulator
            agent.moveAccumulator += cfg.speed;

            // If we have enough accumulation to move at least 1 step
            while (agent.moveAccumulator >= 1) {
                agent.moveAccumulator -= 1;

                if (!agent.alive) break; // Check death mid-loop

                const currentDir = agent.dirIndex;
                const leftDir = (currentDir + 3) % 4;
                const rightDir = (currentDir + 1) % 4;

                const options = [currentDir, leftDir, rightDir];
                let bestOption = -1;
                let maxScore = -Infinity;

                for (const opt of options) {
                    const score = evaluateMove(agent, opt, grid, cols, rows, agentsRef.current);
                    if (score > maxScore) {
                        maxScore = score;
                        bestOption = opt;
                    }
                }

                if (maxScore > -5000) {
                    if (bestOption !== agent.dirIndex) {
                        agent.lastTurnStep = agent.stepsAlive;
                    }
                    agent.dirIndex = bestOption;
                    const move = DIRECTIONS[agent.dirIndex];
                    
                    agent.x += move.x;
                    agent.y += move.y;
                    agent.stepsAlive++;

                    grid[agent.y * cols + agent.x] = 1;
                    
                    // Add to path history
                    agent.path.push({x: agent.x, y: agent.y});

                    // Draw Trail Head
                    ctx.fillStyle = agent.color;
                    ctx.globalAlpha = fadeLevelRef.current * cfg.opacity;
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = agent.color;
                    ctx.fillRect(agent.x * CELL_SIZE, agent.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    ctx.shadowBlur = 0;

                } else {
                    // CRASH - INSTANT DEATH
                    agent.alive = false;
                    createExplosion(agent.x, agent.y, agent.color);
                    
                    // 1. INSTANTLY ERASE TRAIL
                    // Clear both the grid and the canvas
                    agent.path.forEach(p => {
                        // Clear grid
                        if (p.x >= 0 && p.x < cols && p.y >= 0 && p.y < rows) {
                            grid[p.y * cols + p.x] = 0;
                        }
                        // Clear canvas (Clear slightly larger to handle potential glow/anti-alias bleed)
                        // Note: clearRect makes it transparent, which is perfect for overlay
                        ctx.clearRect(p.x * CELL_SIZE, p.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    });
                    
                    // 2. Clear surroundings of crash site (ensure head is gone too)
                    const range = 2;
                    for(let cy = -range; cy <= range; cy++) {
                        for(let cx = -range; cx <= range; cx++) {
                            const gx = agent.x + cx;
                            const gy = agent.y + cy;
                            if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
                                grid[gy * cols + gx] = 0;
                                ctx.clearRect(gx * CELL_SIZE, gy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                            }
                        }
                    }
                }
            }
        });

        // --- UPDATE EXPLOSIONS (GLITCH PARTICLES) ---
        for (let i = explosionsRef.current.length - 1; i >= 0; i--) {
            const p = explosionsRef.current[i];
            
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.08; // Fast decay
            
            // Random glitch movement/teleport
            if (Math.random() > 0.8) {
                p.x += (Math.random() - 0.5) * 10;
                p.y += (Math.random() - 0.5) * 10;
            }

            if (p.life <= 0) {
                explosionsRef.current.splice(i, 1);
            } else {
                ctx.globalAlpha = p.life * fadeLevelRef.current;
                ctx.fillStyle = p.color;
                
                // Random color glitch
                if (Math.random() > 0.9) ctx.fillStyle = '#ffffff';

                ctx.fillRect(p.x, p.y, p.w, p.h);
            }
        }

        // Cleanup dead agents
        agentsRef.current = agentsRef.current.filter(a => a.alive);

        animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10 mix-blend-screen"
    />
  );
};

export default TronEffect;
