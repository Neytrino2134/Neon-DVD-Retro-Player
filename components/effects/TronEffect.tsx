
import React, { useEffect, useRef } from 'react';
import { EffectsConfig } from '../../types';

interface TronEffectProps {
  config: EffectsConfig['tron'];
}

interface Agent {
  id: number;
  x: number;
  y: number;
  spawnX: number; 
  spawnY: number; 
  dirIndex: number; // 0: Up, 1: Right, 2: Down, 3: Left
  color: string;
  hue: number;
  name: string;
  alive: boolean;
  erasing: boolean; 
  stepsAlive: number;
  lastTurnStep: number;
  moveAccumulator: number; 
  eraseAccumulator: number; 
  path: {x: number, y: number}[]; 
  // User specifics
  isUser: boolean;
  immortality: number; // Seconds
}

interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'pixel' | 'ring' | 'glitch' | 'text';
  phase: number; 
  text?: string;
}

const BASE_CELL_SIZE = 4;

// --- NICKNAME DATABASE ---
const NICKNAMES = [
  "ZeroCool", "AcidBurn", "Neo", "Morpheus", "Trinity", "Cypher", "Tank", "Dozer",
  "Crash", "Burn", "Glitch", "Vector", "Pixel", "Voxel", "Sprite", "Render",
  "Shadow", "Ghost", "Wraith", "Phantom", "Spectre", "Spirit", "Soul", "Daemon",
  "Root", "Admin", "User", "Guest", "System", "Kernel", "Shell", "Bash",
  "Python", "Ruby", "Rust", "Java", "Kotlin", "Swift", "Dart", "Go",
  "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta",
  "Omega", "Prime", "Core", "Nexus", "Matrix", "Grid", "Net", "Web",
  "Data", "Info", "Bit", "Byte", "Kilo", "Mega", "Giga", "Tera",
  "Nano", "Micro", "Milli", "Centi", "Deci", "Hecto", "Kilo", "Myria",
  "Red", "Blue", "Green", "Cyan", "Magenta", "Yellow", "White", "Black",
  "Neon", "Argon", "Xenon", "Krypton", "Radon", "Helium", "Oganesson",
  "Flux", "Spark", "Volt", "Amp", "Ohm", "Watt", "Joule", "Hertz",
  "ByteRot", "NullPtr", "SegFault", "Deadlock", "Livelock", "RaceCond",
  "Overflow", "Underflow", "NaN", "Infinity", "Undefined", "Void",
  "Syntax", "Logic", "Runtime", "Compile", "Build", "Deploy", "Release",
  "Patch", "Hotfix", "Bug", "Feature", "Issue", "Ticket", "Review",
  "Commit", "Push", "Pull", "Merge", "Rebase", "Cherry", "Pick",
  "Stash", "Pop", "Clone", "Fork", "Remote", "Origin", "Master",
  "Main", "Develop", "Staging", "Prod", "Test", "Spec", "Mock",
  "Stub", "Spy", "Fake", "Dummy", "Proxy", "Adapter", "Bridge"
];

const TronEffect: React.FC<TronEffectProps> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const agentsRef = useRef<Agent[]>([]);
  const explosionsRef = useRef<ExplosionParticle[]>([]);
  const agentIdCounter = useRef(0);
  
  // User Input State
  const userNextDirRef = useRef<number | null>(null);
  
  // Grid: 0 = empty, 1 = wall
  const gridRef = useRef<Uint8Array | null>(null);
  const gridDimsRef = useRef({ w: 0, h: 0 });
  
  const configRef = useRef(config);

  useEffect(() => {
      configRef.current = config;
  }, [config]);

  // Spawn Gate Logic
  const getGateCoordinates = (gridW: number, gridH: number) => {
      return [
          { x: Math.floor(gridW / 2), y: 2, dir: 2 }, // Top Gate (Spawns Down)
          { x: gridW - 3, y: Math.floor(gridH / 2), dir: 3 }, // Right Gate (Spawns Left)
          { x: Math.floor(gridW / 2), y: gridH - 3, dir: 0 }, // Bottom Gate (Spawns Up)
          { x: 2, y: Math.floor(gridH / 2), dir: 1 } // Left Gate (Spawns Right)
      ];
  };

  const spawnUser = (gridW: number, gridH: number): Agent => {
      // Bottom Gate for User
      const x = Math.floor(gridW / 2);
      const y = gridH - 5;
      const dir = 0; // Up

      userNextDirRef.current = dir; // Reset input

      return {
          id: agentIdCounter.current++,
          x,
          y,
          spawnX: x,
          spawnY: y,
          dirIndex: dir,
          color: '#ffffff',
          hue: 0,
          name: "USER",
          alive: true,
          erasing: false,
          stepsAlive: 0,
          lastTurnStep: 0,
          moveAccumulator: 0,
          eraseAccumulator: 0,
          path: [],
          isUser: true,
          immortality: 3.0 // 3 Seconds
      };
  };

  // Input Listener
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (!configRef.current.enableUser) return;

          // RESTART USER
          if (e.code === 'Numpad0') {
              const cols = gridDimsRef.current.w;
              const rows = gridDimsRef.current.h;
              if (cols === 0 || rows === 0) return;

              // Find existing user to reset
              const userAgent = agentsRef.current.find(a => a.isUser);
              
              if (userAgent) {
                  // FIX: We MUST clear the old path from the grid before resetting position.
                  // Otherwise, invisible walls (the old trail) remain if death animation was interrupted.
                  const grid = gridRef.current;
                  if (grid) {
                      userAgent.path.forEach(p => {
                          const idx = p.y * cols + p.x;
                          if (idx >= 0 && idx < grid.length) grid[idx] = 0;
                      });
                      
                      // Also ensure the spawn point itself is clear
                      const startX = Math.floor(cols / 2);
                      const startY = rows - 5;
                      const spawnIdx = startY * cols + startX;
                      if (spawnIdx >= 0 && spawnIdx < grid.length) grid[spawnIdx] = 0;
                  }

                  // Reset existing
                  userAgent.x = Math.floor(cols / 2);
                  userAgent.y = rows - 5;
                  userAgent.dirIndex = 0; // Up
                  userAgent.path = [];
                  userAgent.alive = true;
                  userAgent.erasing = false;
                  userAgent.immortality = 3.0;
                  userAgent.stepsAlive = 0;
                  userAgent.moveAccumulator = 0;
                  userNextDirRef.current = 0;
                  
              } else {
                  // Spawn new
                  const newAgent = spawnUser(cols, rows);
                  // Ensure spawn area is clear for new agent
                  const grid = gridRef.current;
                  if (grid) {
                      const idx = newAgent.y * cols + newAgent.x;
                      if (idx >= 0 && idx < grid.length) grid[idx] = 0;
                  }
                  agentsRef.current.push(newAgent);
              }
              return;
          }

          // MOVEMENT
          let dir = -1;
          
          if (e.code === 'Numpad8' || e.code === 'ArrowUp') dir = 0;
          else if (e.code === 'Numpad6' || e.code === 'ArrowRight') dir = 1;
          else if (e.code === 'Numpad5' || e.code === 'ArrowDown') dir = 2; // Numpad 5 is Down per request
          else if (e.code === 'Numpad4' || e.code === 'ArrowLeft') dir = 3;

          if (dir !== -1) {
              userNextDirRef.current = dir;
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const DIRECTIONS = [
      { x: 0, y: -1 }, // 0: Up
      { x: 1, y: 0 },  // 1: Right
      { x: 0, y: 1 },  // 2: Down
      { x: -1, y: 0 }  // 3: Left
  ];

  // --- COLOR GENERATION LOGIC ---
  const generateUniqueColor = (activeAgents: Agent[]): { color: string, hue: number } => {
      const BASE_HUES = [0, 30, 60, 120, 180, 240, 280, 300, 330]; 
      
      const usedHues = new Set(activeAgents.map(a => a.hue));
      const freeHues = BASE_HUES.filter(h => !usedHues.has(h));
      
      if (freeHues.length > 0) {
          const hue = freeHues[Math.floor(Math.random() * freeHues.length)];
          return { color: `hsl(${hue}, 100%, 50%)`, hue };
      }
      
      const hue = BASE_HUES[Math.floor(Math.random() * BASE_HUES.length)];
      const lightness = 60 + Math.floor(Math.random() * 25);
      return { color: `hsl(${hue}, 100%, ${lightness}%)`, hue };
  };

  const spawnAgent = (gridW: number, gridH: number, activeAgents: Agent[]): Agent => {
      const gates = getGateCoordinates(gridW, gridH);
      const gate = gates[Math.floor(Math.random() * gates.length)];
      
      const { color, hue } = generateUniqueColor(activeAgents);
      const name = NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)];

      return {
          id: agentIdCounter.current++,
          x: gate.x,
          y: gate.y,
          spawnX: gate.x,
          spawnY: gate.y,
          dirIndex: gate.dir,
          color,
          hue,
          name,
          alive: true,
          erasing: false,
          stepsAlive: 0,
          lastTurnStep: 0,
          moveAccumulator: 0,
          eraseAccumulator: 0,
          path: [],
          isUser: false,
          immortality: 0
      };
  };

  const createExplosion = (gx: number, gy: number, color: string, cellSize: number, name: string) => {
      const px = gx * cellSize + cellSize / 2;
      const py = gy * cellSize + cellSize / 2;
      
      // 1. Digital Debris (Pixels)
      for (let i = 0; i < 32; i++) {
          const angle = (Math.PI * 2 * i) / 32;
          const speed = (Math.random() * 2 + 1); 
          
          explosionsRef.current.push({
              x: px,
              y: py,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 1.0,
              maxLife: 1.0,
              color: color,
              size: cellSize, 
              type: 'pixel',
              phase: Math.random() * Math.PI * 2
          });
      }

      // 2. Shockwave Rings
      explosionsRef.current.push({
          x: px,
          y: py,
          vx: 0,
          vy: 0,
          life: 1.0,
          maxLife: 1.0,
          color: '#ffffff',
          size: cellSize * 2,
          type: 'ring',
          phase: 0
      });

      // 3. Glitch Strip
      explosionsRef.current.push({
          x: px,
          y: py,
          vx: 0,
          vy: 0,
          life: 0.8, 
          maxLife: 0.8,
          color: '#ffffff',
          size: cellSize * 10,
          type: 'glitch',
          phase: 0
      });

      // 4. DEATH TEXT (Kill Feed)
      if (configRef.current.showNames) {
          explosionsRef.current.push({
              x: px,
              y: py - cellSize * 4,
              vx: 0,
              vy: -0.5,
              life: 1.5,
              maxLife: 1.5,
              color: color,
              size: Math.max(10, cellSize * 3),
              type: 'text',
              phase: 0,
              text: `${name} DELETED`
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
      allAgents: Agent[],
      isImmune: boolean 
  ): number => {
      const dir = DIRECTIONS[potentialDirIndex];
      const nextX = agent.x + dir.x;
      const nextY = agent.y + dir.y;

      if (nextX < 0 || nextX >= cols || nextY < 0 || nextY >= rows) return -9999;
      
      // If NOT immune, avoid walls. If immune, walls are passable (don't kill), but we still
      // prefer empty space unless trapped.
      if (!isImmune && grid[nextY * cols + nextX] === 1) return -9999;

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
          // During lookahead, we treat walls as obstacles to encourage good pathfinding,
          // even if immune, so they don't just walk into a dead end immediately.
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
          if (other.id === agent.id || !other.alive || other.erasing) continue;
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

    // Use a ref to track current cell size so we can re-init grid on change
    const currentSizeRef = { val: config.size || 1 };

    let w = canvas.width = canvas.offsetWidth;
    let h = canvas.height = canvas.offsetHeight;
    
    const initGrid = (scale: number) => {
        const cellSize = BASE_CELL_SIZE * scale;
        w = canvas.width = canvas.offsetWidth;
        h = canvas.height = canvas.offsetHeight;
        let cols = Math.ceil(w / cellSize);
        let rows = Math.ceil(h / cellSize);
        gridRef.current = new Uint8Array(cols * rows).fill(0);
        gridDimsRef.current = { w: cols, h: rows };
        agentsRef.current = [];
        explosionsRef.current = [];
        ctx.clearRect(0, 0, w, h);
    };

    initGrid(config.size || 1);

    const render = () => {
        const cfg = configRef.current;
        const scale = Math.max(1, cfg.size || 1);
        const cellSize = BASE_CELL_SIZE * scale;

        if (currentSizeRef.val !== scale || canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
             initGrid(scale);
             currentSizeRef.val = scale;
        }
        
        // --- CLEAN CANVAS ---
        ctx.clearRect(0, 0, w, h);

        if (!cfg.enabled) {
             agentsRef.current = [];
             explosionsRef.current = [];
             if (gridRef.current) gridRef.current.fill(0);
             animationRef.current = requestAnimationFrame(render);
             return;
        }

        const cols = gridDimsRef.current.w;
        const rows = gridDimsRef.current.h;
        const grid = gridRef.current;

        // Draw Arena Border (To visualize walls)
        ctx.strokeStyle = `rgba(255, 255, 255, ${cfg.opacity * 0.2})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, w, h);

        // Draw Spawn Gates
        ctx.globalAlpha = cfg.opacity * 0.5;
        const gates = getGateCoordinates(cols, rows);
        gates.forEach(gate => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(gate.x * cellSize, gate.y * cellSize, cellSize, cellSize);
            // Draw marker bracket
            ctx.strokeStyle = '#00f3ff';
            ctx.lineWidth = 1;
            const size = cellSize * 3;
            const x = gate.x * cellSize + cellSize/2;
            const y = gate.y * cellSize + cellSize/2;
            ctx.strokeRect(x - size/2, y - size/2, size, size);
        });

        // Calculate dynamic trail length
        const userTrail = cfg.trailLength !== undefined ? cfg.trailLength : 0.8;
        const maxPathLen = Math.floor((userTrail * 400) / (scale * 0.5)) + 20;

        // Spawn AI
        const maxAgents = cfg.maxAgents || 12;
        const spawnChance = cfg.spawnRate * 0.02;
        const activeAiAgents = agentsRef.current.filter(a => !a.isUser).length;
        if (Math.random() < spawnChance && activeAiAgents < maxAgents) {
            agentsRef.current.push(spawnAgent(cols, rows, agentsRef.current));
        }

        // Spawn User if missing and enabled
        const hasUser = agentsRef.current.some(a => a.isUser && a.alive);
        if (cfg.enableUser && !hasUser) {
            agentsRef.current.push(spawnUser(cols, rows));
        }

        // --- UPDATE AGENTS ---
        agentsRef.current.forEach(agent => {
            if (!agent.alive) return;
            if (!grid) return;

            // --- ERASING LOGIC (Death Animation) ---
            if (agent.erasing) {
                agent.eraseAccumulator += cfg.speed;
                while (agent.eraseAccumulator >= 1) {
                    agent.eraseAccumulator -= 1;
                    const head = agent.path.pop();
                    if (head) {
                        const idx = head.y * cols + head.x;
                        if (idx >= 0 && idx < grid.length) grid[idx] = 0;
                        
                        // Glitch Effect during erasure
                        if (Math.random() > 0.5) {
                            ctx.fillStyle = agent.color;
                            ctx.globalAlpha = 0.8;
                            const size = cellSize * (Math.random() * 2 + 1);
                            ctx.fillRect(
                                head.x * cellSize + (Math.random() - 0.5) * cellSize * 4,
                                head.y * cellSize + (Math.random() - 0.5) * cellSize * 4,
                                size,
                                cellSize * 0.5
                            );
                        }
                    }
                    if (agent.path.length === 0) {
                        agent.alive = false; 
                        break;
                    }
                }
                return;
            }

            // --- MOVEMENT LOGIC ---
            agent.moveAccumulator += cfg.speed;
            
            // Decrease Immortality (Approximation: 60fps)
            if (agent.immortality > 0) {
                agent.immortality -= 0.016; 
            }

            while (agent.moveAccumulator >= 1) {
                agent.moveAccumulator -= 1;
                
                let bestOption = -1;
                let crashed = false;

                if (agent.isUser) {
                    // --- USER CONTROL LOGIC ---
                    const inputDir = userNextDirRef.current;
                    
                    // Prevent 180 turns
                    if (inputDir !== null) {
                        const isOpposite = Math.abs(inputDir - agent.dirIndex) === 2;
                        if (!isOpposite) {
                            agent.dirIndex = inputDir;
                        }
                    }
                    
                    bestOption = agent.dirIndex;
                    const move = DIRECTIONS[agent.dirIndex];
                    const nextX = agent.x + move.x;
                    const nextY = agent.y + move.y;

                    // Wall Check (Arena Border)
                    if (nextX < 0 || nextX >= cols || nextY < 0 || nextY >= rows) {
                        crashed = true;
                    } 
                    // Trail Check (Invisible Walls on Grid)
                    else if (grid[nextY * cols + nextX] === 1) {
                        if (agent.immortality <= 0) {
                            crashed = true;
                        }
                    }

                } else {
                    // --- AI LOGIC ---
                    const distPixels = Math.sqrt((agent.x - agent.spawnX)**2 + (agent.y - agent.spawnY)**2) * cellSize;
                    const isImmune = distPixels < 100;

                    const currentDir = agent.dirIndex;
                    const leftDir = (currentDir + 3) % 4;
                    const rightDir = (currentDir + 1) % 4;

                    const options = [currentDir, leftDir, rightDir];
                    let maxScore = -Infinity;

                    for (const opt of options) {
                        const score = evaluateMove(agent, opt, grid, cols, rows, agentsRef.current, isImmune);
                        if (score > maxScore) {
                            maxScore = score;
                            bestOption = opt;
                        }
                    }
                    
                    if (maxScore <= -5000) crashed = true;
                }

                if (!crashed && bestOption !== -1) {
                    if (bestOption !== agent.dirIndex) {
                        agent.lastTurnStep = agent.stepsAlive;
                    }
                    agent.dirIndex = bestOption;
                    const move = DIRECTIONS[agent.dirIndex];
                    
                    agent.x += move.x;
                    agent.y += move.y;
                    agent.stepsAlive++;

                    // Mark grid
                    grid[agent.y * cols + agent.x] = 1;
                    
                    // Add to path
                    agent.path.push({x: agent.x, y: agent.y});

                    // Trim Path
                    while (agent.path.length > maxPathLen) {
                        const tail = agent.path.shift();
                        if (tail && tail.x >= 0 && tail.x < cols && tail.y >= 0 && tail.y < rows) {
                            grid[tail.y * cols + tail.x] = 0;
                        }
                    }

                } else {
                    // CRASH START
                    if (agent.immortality <= 0) {
                        agent.erasing = true; 
                        createExplosion(agent.x, agent.y, agent.color, cellSize, agent.name);
                    }
                }
            }
        });

        // --- DRAW AGENTS (Paths & Names) ---
        agentsRef.current.forEach(agent => {
            if (!agent.alive) return;

            const pathLen = agent.path.length;
            const fadeStartRatio = 0.2; 
            const fadeLen = Math.max(5, pathLen * fadeStartRatio);

            for (let i = 0; i < pathLen; i++) {
                const pt = agent.path[i];
                let alpha = 1;
                if (i < fadeLen) alpha = i / fadeLen;
                
                // Glitchy stepped flickering when erasing
                if (agent.erasing) {
                    const steps = 4;
                    const noise = Math.floor(Math.random() * steps) + 1;
                    alpha *= (noise / steps);
                }
                
                ctx.fillStyle = agent.color;
                ctx.globalAlpha = alpha * cfg.opacity;
                ctx.fillRect(pt.x * cellSize, pt.y * cellSize, cellSize, cellSize);
            }

            // Draw Head & Name
            if (!agent.erasing && pathLen > 0) {
                const head = agent.path[pathLen - 1];
                
                // Immortality Blink
                if (agent.immortality > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
                    ctx.globalAlpha = 0.5;
                } else {
                    ctx.globalAlpha = 1.0;
                }

                ctx.fillStyle = '#ffffff';
                const hlSize = Math.max(1, cellSize - 2);
                const hlOffset = (cellSize - hlSize) / 2;
                ctx.fillRect(head.x * cellSize + hlOffset, head.y * cellSize + hlOffset, hlSize, hlSize);

                if (cfg.showNames !== false || agent.isUser) {
                    const fontSize = Math.max(8, cellSize * 2);
                    ctx.font = `bold ${fontSize}px "Courier New", monospace`;
                    const text = agent.name;
                    const metrics = ctx.measureText(text);
                    const bgW = metrics.width + 8;
                    const bgH = fontSize + 4; // Used in fillRect below
                    const textX = head.x * cellSize + cellSize/2;
                    const textY = head.y * cellSize - cellSize;

                    // Nickname Background
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    // Use bgH here
                    ctx.fillRect(textX - bgW/2, textY - fontSize - 2, bgW, bgH);

                    ctx.fillStyle = agent.color;
                    ctx.fillText(text, textX, textY);
                }
            }
        });

        // --- UPDATE EXPLOSIONS ---
        for (let i = explosionsRef.current.length - 1; i >= 0; i--) {
            const p = explosionsRef.current[i];
            
            if (p.type === 'pixel') {
                p.x += p.vx;
                p.y += p.vy;
                p.phase += 0.2;
                const jitterX = Math.sin(p.phase) * 0.5;
                const jitterY = Math.cos(p.phase) * 0.5;
                p.vx *= 0.95;
                p.vy *= 0.95;
                p.life -= 0.02;
                ctx.globalAlpha = p.life * cfg.opacity;
                ctx.fillStyle = p.life > 0.6 ? '#ffffff' : p.color; 
                ctx.shadowBlur = 10 * p.life;
                ctx.shadowColor = p.color;
                ctx.fillRect(p.x + jitterX, p.y + jitterY, p.size, p.size);
                ctx.shadowBlur = 0;

            } else if (p.type === 'ring') {
                p.size += 2;
                p.life -= 0.04;
                ctx.globalAlpha = p.life * cfg.opacity;
                ctx.strokeStyle = p.life > 0.5 ? '#ffffff' : p.color;
                ctx.lineWidth = 2; 
                const offset = p.size / 2;
                ctx.strokeRect(p.x - offset, p.y - offset, p.size, p.size);

            } else if (p.type === 'glitch') {
                p.life -= 0.08;
                ctx.globalAlpha = p.life * cfg.opacity;
                ctx.fillStyle = p.color;
                if (Math.random() > 0.5) {
                    ctx.fillRect(p.x - p.size/2, p.y, p.size, 2); 
                } else {
                    ctx.fillRect(p.x, p.y - p.size/2, 2, p.size);
                }
            } else if (p.type === 'text' && p.text) {
                p.y += p.vy; 
                p.life -= 0.015;
                
                ctx.globalAlpha = p.life * cfg.opacity;
                ctx.fillStyle = p.color;
                ctx.textAlign = 'center';
                ctx.font = `bold ${p.size}px "Courier New", monospace`;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 5;
                ctx.fillText(p.text, p.x, p.y);
                ctx.shadowBlur = 0;
            }

            if (p.life <= 0) {
                explosionsRef.current.splice(i, 1);
            }
        }

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
