
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TerrainConfig } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import CameraController from './CameraController';

interface VisualizerTerrain3DProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  config: TerrainConfig;
  volume: number;
}

const TerrainScene: React.FC<{ analyser: AnalyserNode | null; isPlaying: boolean; config: TerrainConfig; volume: number }> = ({ analyser, isPlaying, config, volume }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const { colors } = useTheme();

  // Determine grid dimensions
  const segments = config.gridSize || 64;
  
  // History buffer to store past audio frames for the "moving" effect
  // Rows = time history (depth)
  // Cols = frequency bins (width)
  const historyRef = useRef<Float32Array | null>(null);
  const idleTimeRef = useRef(0);

  // Initialize data arrays
  useMemo(() => {
    if (analyser) {
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    }
    // Initialize history buffer: (segments + 1) squared
    const size = (segments + 1) * (segments + 1);
    historyRef.current = new Float32Array(size).fill(0);
  }, [analyser, segments]);

  // Determine Color
  const getColor = () => {
      switch(config.colorMode) {
          case 'theme': return colors.primary;
          case 'matrix': return '#00ff00';
          case 'rainbow': return '#ffffff'; // Vertex colors handled by shader usually, but here simple white base
          default: return colors.primary;
      }
  };
  
  const baseColor = getColor();

  useFrame((_state, delta) => {
    if (!meshRef.current || !historyRef.current) return;

    const geometry = meshRef.current.geometry;
    const positionAttribute = geometry.getAttribute('position');
    
    // Width and Depth in vertices count
    const width = segments + 1;
    const depth = segments + 1;
    
    // Safety check: ensure geometry matches our history buffer expectation
    if (positionAttribute.count !== historyRef.current.length) return;
    
    let newData = new Float32Array(width).fill(0);

    // --- DATA GENERATION ---
    if (isPlaying && analyser && dataArrayRef.current) {
        // Fix TS typing issue with Web Audio API
        analyser.getByteFrequencyData(dataArrayRef.current as any);
        
        // Logic for Mirroring
        // If mirroring, we only generate half the data, then flip it
        const effectiveWidth = config.mirror ? Math.floor(width / 2) : width;
        const sourceData = new Float32Array(effectiveWidth);

        // Map frequency data to effective grid width
        const step = Math.floor(dataArrayRef.current.length / 2 / effectiveWidth);
        
        for (let i = 0; i < effectiveWidth; i++) {
            let sum = 0;
            const start = i * step;
            // Catch OOB
            if (start + step <= dataArrayRef.current.length) {
                for(let j=0; j<step; j++) sum += dataArrayRef.current[start + j];
                let val = (sum / step) / 255;
                
                // --- SENSITIVITY MATCHING ---
                // Replicate the 2D visualizer's "punchiness"
                // 1. Exponential Curve
                val = Math.pow(val, 2.5);
                // 2. Sensitivity Scaling
                val *= (config.heightMultiplier * 1.2); 
                // 3. Volume Scaling
                val *= volume;
                
                // 4. Frequency Boost (Highs usually lower amplitude, give them a kick)
                // Linear boost across spectrum
                val *= (1 + (i / effectiveWidth) * 0.5);

                sourceData[i] = val;
            }
        }

        // Populate newData based on Mirror Config
        if (config.mirror) {
            // Reconstruct full width from sourceData (half width)
            if (config.invertMirror) {
                // Invert Mirror: Highs in Center, Bass on Edges
                // sourceData[0] is Bass.
                // We want [Bass -> Highs] [Highs -> Bass]
                // Left side: sourceData (Bass to Highs)
                // Right side: reversed sourceData (Highs to Bass)
                for (let i = 0; i < effectiveWidth; i++) {
                    newData[i] = sourceData[i];
                    newData[width - 1 - i] = sourceData[i];
                }
            } else {
                // Standard Mirror: Bass in Center
                // We want [Highs -> Bass] [Bass -> Highs]
                // Left side: reversed sourceData
                // Right side: sourceData
                for (let i = 0; i < effectiveWidth; i++) {
                    newData[i] = sourceData[effectiveWidth - 1 - i];
                    newData[width - 1 - i] = sourceData[effectiveWidth - 1 - i];
                }
            }
            // If width is odd (often 65 vertices for 64 segments), handle center
            if (width % 2 !== 0) {
                const centerIdx = Math.floor(width / 2);
                newData[centerIdx] = config.invertMirror ? sourceData[effectiveWidth - 1] : sourceData[0];
            }
        } else {
            // No Mirror
            for (let i = 0; i < width; i++) {
                if (i < sourceData.length) newData[i] = sourceData[i];
            }
        }

    } else {
        // IDLE ANIMATION (Simulate movement when paused)
        idleTimeRef.current += delta;
        const t = idleTimeRef.current;
        for (let i = 0; i < width; i++) {
            // Create gentle rolling waves
            const x = i / width;
            const wave = Math.sin(x * 10 + t) * Math.cos(x * 5 - t * 0.5);
            newData[i] = wave * 0.15 * config.heightMultiplier; // Low amplitude
        }
    }

    // --- SHIFT LOGIC (The "4D" movement) ---
    // Move row Y to Y+1 (visually moving towards camera or away)
    // We shift from the second-to-last row down to 0, then push new data at 0.
    // Index = y * width + x
    const history = historyRef.current;

    // Shift everything 'back' (index wise increases)
    // Row D <- Row D-1
    for (let y = depth - 1; y > 0; y--) {
        for (let x = 0; x < width; x++) {
            const currentIdx = y * width + x;
            const prevIdx = (y - 1) * width + x;
            history[currentIdx] = history[prevIdx];
        }
    }

    // Insert new data at Row 0 (The "Horizon")
    for (let x = 0; x < width; x++) {
        history[x] = newData[x];
    }

    // --- APPLY HEIGHTS TO GEOMETRY ---
    // PlaneGeometry vertices are typically ordered row by row
    for (let i = 0; i < history.length; i++) {
        // Apply height (Z attribute of plane geometry, which becomes Y after rotation)
        // Scale up visually (x8) to match the new punchier sensitivity
        const val = history[i];
        positionAttribute.setZ(i, val * 8); 
    }

    positionAttribute.needsUpdate = true;
    // We skip computeVertexNormals every frame for performance unless using standard material lighting
    if (!config.wireframe) {
        geometry.computeVertexNormals();
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      {/* Light following camera */}
      <directionalLight position={[0, 10, 5]} intensity={2.0} color={baseColor} />
      
      {/* Fog for depth fading at horizon (matches typical BG color #030712) */}
      <fog attach="fog" args={['#030712', 0, 60]} />

      <group position={[0, -3, -5]} rotation={[0.2, 0, 0]}> {/* Adjusted position/tilt for better view */}
          <mesh 
            ref={meshRef} 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[0, 0, 0]}
            frustumCulled={false} // CRITICAL FIX: Prevent disappearing when vertices move out of initial bounds
          >
            <planeGeometry args={[80, 80, segments, segments]} />
            
            {config.wireframe ? (
                <meshBasicMaterial 
                    color={baseColor} 
                    wireframe={true} 
                    transparent 
                    opacity={config.opacity}
                    side={THREE.DoubleSide} 
                />
            ) : (
                <meshStandardMaterial
                    color={baseColor}
                    metalness={0.8}
                    roughness={0.2}
                    emissive={baseColor}
                    emissiveIntensity={1.0} // Increased emission for visibility
                    wireframe={false}
                    transparent
                    opacity={config.opacity}
                    side={THREE.DoubleSide}
                />
            )}
          </mesh>
      </group>
      
      {/* Ceiling Reflection (Optional for cyber feel) */}
      {config.glow && (
          <group position={[0, 10, -5]} rotation={[-0.1, 0, 0]}>
             <mesh 
                rotation={[Math.PI / 2, 0, 0]} 
                scale={[1, 1, 0.5]} 
             >
                <planeGeometry args={[80, 80, 16, 16]} />
                <meshBasicMaterial 
                    color={baseColor} 
                    wireframe={true} 
                    transparent 
                    opacity={config.opacity * 0.1} 
                    side={THREE.DoubleSide}
                />
             </mesh>
          </group>
      )}
      
      <CameraController />
    </>
  );
};

const VisualizerTerrain3D: React.FC<VisualizerTerrain3DProps> = (props) => {
  const [isInteractive, setIsInteractive] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
        setIsInteractive(e.altKey);
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);
    return () => {
        window.removeEventListener('keydown', handleKey);
        window.removeEventListener('keyup', handleKey);
    }
  }, []);

  return (
    // Increased z-index to 35 to ensure it sits above Scanlines (z-30)
    <div className={`absolute inset-0 w-full h-full z-[35] mix-blend-screen ${isInteractive ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <Canvas 
            camera={{ position: [0, 2, 8], fov: 75 }} // Adjusted camera for better perspective
            gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
            dpr={[1, 2]} 
        >
            <TerrainScene {...props} />
        </Canvas>
    </div>
  );
};

export default VisualizerTerrain3D;
