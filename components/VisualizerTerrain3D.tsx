
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, extend, ReactThreeFiber, useThree } from '@react-three/fiber';
import { Line, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { TerrainConfig } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import CameraController from './CameraController';

// --- CUSTOM SHADER MATERIAL ---
// Draws a quad grid based on UV coordinates, ignoring geometry triangles.
// Supports thickness, anti-aliasing, FOG, and BRIGHTNESS boost.
const TerrainGridMaterial = shaderMaterial(
  {
    color: new THREE.Color(0xffffff),
    thickness: 0.1,
    opacity: 1.0,
    segments: 64,
    brightness: 1.0, // New Uniform
    // Fog uniforms (managed by Three.js if fog: true is set)
    fogColor: new THREE.Color(0x000000),
    fogNear: 0,
    fogFar: 100
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying float vDepth; // Distance from camera

    void main() {
      vUv = uv;
      vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
      vDepth = -viewPosition.z; // Positive depth in view space
      gl_Position = projectionMatrix * viewPosition;
    }
  `,
  // Fragment Shader
  `
    varying vec2 vUv;
    varying float vDepth;
    
    uniform vec3 color;
    uniform float thickness;
    uniform float opacity;
    uniform float segments;
    uniform float brightness; // Use this to boost intensity
    
    // Fog Uniforms (Supplied by Three.js)
    uniform vec3 fogColor;
    uniform float fogNear;
    uniform float fogFar;

    void main() {
      // Scale UVs to grid segments
      vec2 uv = vUv * segments;
      
      // Calculate distance to nearest cell edge
      vec2 grid = abs(fract(uv - 0.5) - 0.5);
      
      // Distance from the edge (0.5 is the edge)
      float d = min(0.5 - grid.x, 0.5 - grid.y);
      
      // Thickness threshold (scale input for usability)
      float t = thickness * 0.05; 
      
      // Smoothstep creates the line width with anti-aliasing at the edges
      float lineAlpha = 1.0 - smoothstep(t, t + 0.04, d);
      
      // --- FOG CALCULATION ---
      // Standard linear fog factor
      float fogFactor = smoothstep(fogNear, fogFar, vDepth);
      
      // Mix the line color with the fog color based on depth
      // BOOST COLOR WITH BRIGHTNESS HERE
      vec3 finalColor = mix(color, fogColor, fogFactor) * brightness;
      
      // Also fade opacity at the very edge of fog to ensure soft transition if colors mismatch slightly
      float fogFade = 1.0 - smoothstep(fogFar * 0.8, fogFar, vDepth);

      gl_FragColor = vec4(finalColor, lineAlpha * opacity * fogFade);
      
      // Discard transparent pixels
      if (gl_FragColor.a < 0.05) discard;
    }
  `
);

extend({ TerrainGridMaterial });

// Add type definition for the new material
declare global {
  namespace JSX {
    interface IntrinsicElements {
      terrainGridMaterial: ReactThreeFiber.Object3DNode<THREE.ShaderMaterial, typeof TerrainGridMaterial> & {
        color?: THREE.Color;
        thickness?: number;
        opacity?: number;
        segments?: number;
        fog?: boolean;
        brightness?: number;
      };
    }
  }
}

interface VisualizerTerrain3DProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  config: TerrainConfig;
  volume: number;
}

// --- SPACESHIP COMPONENT ---
// Receives a mutable ref for the target position to avoid React re-renders for camera tracking
const Spaceship: React.FC<{ color: string, active: boolean, targetRef: React.MutableRefObject<THREE.Vector3> }> = ({ color, active, targetRef }) => {
    const groupRef = useRef<THREE.Group>(null);
    
    useFrame((state) => {
        if (!groupRef.current || !active) return;
        
        const t = state.clock.getElapsedTime();
        
        // --- SMOOTHER FLIGHT PHYSICS ---
        // Slower sway speed (0.2 instead of 0.5) prevents jerky feeling
        const swaySpeed = 0.2;
        const swayRange = 30; 
        const x = Math.sin(t * swaySpeed) * swayRange;
        
        // Slower vertical bobbing
        const y = Math.sin(t * 1.5) * 0.5 + 4; 
        
        // Banking (Roll)
        const bankAngle = Math.cos(t * swaySpeed) * -0.5;
        
        // Pitch (Nose up/down) - slight variation based on vertical movement
        const pitchAngle = Math.cos(t * 1.5) * 0.05;

        // Apply transforms
        groupRef.current.position.set(x, y, 2); 
        groupRef.current.rotation.z = bankAngle;
        groupRef.current.rotation.x = pitchAngle;
        
        // Update the shared target ref directly (no state update)
        // This allows CameraController to read it smoothly in the same frame loop
        if (targetRef) {
            targetRef.current.set(x, y, 2);
        }
    });

    if (!active) return null;

    return (
        <group ref={groupRef}>
            {/* Main Body */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.8, 0.3, 3]} />
                <meshStandardMaterial color="#111" emissive={color} emissiveIntensity={0.5} roughness={0.4} />
            </mesh>
            
            {/* Cockpit */}
            <mesh position={[0, 0.2, -0.5]}>
                <boxGeometry args={[0.6, 0.3, 1.2]} />
                <meshStandardMaterial color="#000" emissive="#ffffff" emissiveIntensity={0.2} roughness={0.1} />
            </mesh>

            {/* Wings */}
            {/* FIX: Moved rotation from cylinderGeometry to mesh props */}
            <mesh position={[0, 0, 0.5]} rotation={[Math.PI/2, Math.PI/4, 0]}>
                <cylinderGeometry args={[0, 2.5, 1.5, 4, 1]} />
                <meshStandardMaterial color="#111" emissive={color} emissiveIntensity={0.2} wireframe />
            </mesh>

            {/* Engine Glow */}
            <mesh position={[0, 0, 1.6]}>
                <planeGeometry args={[0.6, 0.2]} />
                <meshBasicMaterial color={color} side={THREE.DoubleSide} />
            </mesh>
            <pointLight position={[0, 0, 2]} color={color} distance={5} intensity={2} decay={2} />
        </group>
    );
};

const TerrainScene: React.FC<{ analyser: AnalyserNode | null; isPlaying: boolean; config: TerrainConfig; volume: number }> = ({ analyser, isPlaying, config, volume }) => {
  // Use generic ref because it could be a Mesh or a Points object
  const meshRef = useRef<THREE.Mesh | THREE.Points>(null);
  const lineRef = useRef<any>(null); // Ref for the Line component
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const { colors } = useTheme();
  
  // Shared Mutable Ref for Ship Position
  const shipTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  
  // Normalization smoothing state
  const smoothNormRef = useRef({ bass: 1, mid: 1, treb: 1 });

  // Camera Update Logic
  const { camera } = useThree();
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = config.cameraFov || 75;
        camera.updateProjectionMatrix();
    }
  }, [config.cameraFov, camera]);
  
  // Initialize camera position when switching modes
  useEffect(() => {
      if (config.showSpaceship) {
          camera.position.set(0, 6, 15);
      } else {
          camera.position.set(0, 2, 8);
      }
      camera.lookAt(0, 0, 0);
  }, [config.showSpaceship, camera]);

  // Determine grid dimensions
  const segments = config.gridSize || 64;
  
  // History buffer to store past audio frames for the "moving" effect
  const historyRef = useRef<Float32Array | null>(null);
  const idleTimeRef = useRef(0);
  const scrollAccumulatorRef = useRef(0);
  
  // State for gravity (previous frame's generated row)
  const prevFrontRowRef = useRef<Float32Array | null>(null);

  // Initialize data arrays
  useMemo(() => {
    if (analyser) {
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    }
    // Initialize history buffer: (segments + 1) squared
    const width = segments + 1;
    const size = width * width;
    historyRef.current = new Float32Array(size).fill(0);
    prevFrontRowRef.current = new Float32Array(width).fill(0);
  }, [analyser, segments]);

  // Points buffer for the Waveform Line (width segments + 1)
  const linePoints = useMemo(() => {
      const width = segments + 1;
      const points = new Float32Array(width * 3);
      const span = 80;
      const step = span / segments;
      const startX = -span / 2;
      
      for(let i=0; i<width; i++) {
          points[i*3] = startX + i * step; // X
          points[i*3+1] = 0; // Y (Height) - This axis is Depth in -90rot
          points[i*3+2] = 0; // Z (Depth) - This axis is UP in -90rot
      }
      return points;
  }, [segments]);

  // Determine Color
  const getColor = () => {
      switch(config.colorMode) {
          case 'theme': return colors.primary;
          case 'matrix': return '#00ff00';
          case 'rainbow': return '#ffffff'; 
          default: return colors.primary;
      }
  };
  
  const baseColor = getColor();
  const glowIntensity = config.brightness || 1.2;
  // Apply Additive Blending if Glow is active
  const blending = config.glow ? THREE.AdditiveBlending : THREE.NormalBlending;
  const depthWrite = !config.glow; // Usually disable depth write for additive transparency

  useFrame((_state, delta) => {
    if (!meshRef.current || !historyRef.current || !prevFrontRowRef.current) return;

    // Both Mesh and Points have geometry property
    const geometry = meshRef.current.geometry;
    const positionAttribute = geometry.getAttribute('position');
    
    // Width and Depth in vertices count
    const width = segments + 1;
    const depth = segments + 1;
    
    if (positionAttribute.count !== historyRef.current.length) return;
    
    let newData = new Float32Array(width).fill(0);
    const prevFrontRow = prevFrontRowRef.current;

    // --- DATA GENERATION ---
    if (isPlaying && analyser && dataArrayRef.current) {
        analyser.getByteFrequencyData(dataArrayRef.current as any);
        
        const effectiveWidth = config.mirror ? Math.floor(width / 2) : width;
        const sourceData = new Float32Array(effectiveWidth);

        const bufferLength = dataArrayRef.current.length;
        const sampleRate = analyser.context.sampleRate;
        const binSize = sampleRate / 2 / bufferLength;

        const minHz = 20 + ((config.minFrequency ?? 0) * 40); 
        const maxHz = minHz + 500 + ((config.maxFrequency ?? 100) * 180);
        const logMin = Math.log10(minHz);
        const logMax = Math.log10(maxHz);

        const fpsRatio = delta * 60;
        const gravityInput = config.barGravity ?? 5;
        const baseDecay = Math.max(0.1, 0.98 - (gravityInput * 0.05));
        const decay = Math.pow(baseDecay, fpsRatio);

        // --- NORMALIZATION LOGIC ---
        // Identify max levels for auto-gain
        const bassEnd = Math.floor(250 / binSize);   
        const midEnd = Math.floor(2000 / binSize);
        let maxBass = 150, maxMid = 100, maxTreb = 80;

        for(let i=0; i<bufferLength; i++) {
            const val = dataArrayRef.current[i];
            if(i < bassEnd) maxBass = Math.max(maxBass, val);
            else if(i < midEnd) maxMid = Math.max(maxMid, val);
            else maxTreb = Math.max(maxTreb, val);
        }

        // Smoothed Normalization Targets
        let targetBassScale = 1, targetMidScale = 1, targetTrebScale = 1;
        if (config.normalize) {
            targetBassScale = 255 / Math.max(150, maxBass);
            targetMidScale = 255 / Math.max(100, maxMid);
            targetTrebScale = 255 / Math.max(80, maxTreb);
        }
        
        const normLerp = 0.05;
        smoothNormRef.current.bass += (targetBassScale - smoothNormRef.current.bass) * normLerp;
        smoothNormRef.current.mid += (targetMidScale - smoothNormRef.current.mid) * normLerp;
        smoothNormRef.current.treb += (targetTrebScale - smoothNormRef.current.treb) * normLerp;

        for (let i = 0; i < effectiveWidth; i++) {
            const t = i / (effectiveWidth - 1);
            const adjustedT = Math.pow(t, 0.6); 
            const freq = Math.pow(10, logMin + (adjustedT * (logMax - logMin)));
            const index = Math.floor(freq / binSize);
            
            let val = 0;
            if (index < bufferLength) {
                const nextT = Math.pow((i + 1) / (effectiveWidth - 1), 0.6);
                const nextFreq = Math.pow(10, logMin + (nextT * (logMax - logMin)));
                const nextIndex = Math.floor(nextFreq / binSize);
                const range = Math.max(1, nextIndex - index);
                
                let maxInRange = 0;
                for(let k=0; k<range && (index+k)<bufferLength; k++) {
                    maxInRange = Math.max(maxInRange, dataArrayRef.current[index+k]);
                }
                
                // Apply Normalization Scalar
                let normalizedVal = maxInRange;
                if (index < bassEnd) normalizedVal *= smoothNormRef.current.bass;
                else if (index < midEnd) normalizedVal *= smoothNormRef.current.mid;
                else normalizedVal *= smoothNormRef.current.treb;

                val = normalizedVal / 255;
            }

            // Curve Physics (Plateau Fix)
            // We use a softer power curve and apply tanh BEFORE the multiplier to prevent clipping top.
            // By scaling *after* tanh, we simply make the hills taller, preserving the shape.
            
            val = Math.pow(val, 2.0); // Slightly reduced exponent to keep more data visible
            
            if (!config.preventVolumeScaling) {
                val *= volume;
            }
            
            val *= (1 + (i / effectiveWidth) * 0.5); // High freq boost
            
            // Soft Limit the input range to keep it smooth
            val = Math.tanh(val); 
            
            // Apply Amplitude Multiplier LAST to stretch vertically without flattening
            val *= (config.heightMultiplier * 2.0);

            sourceData[i] = val;
        }

        if (config.mirror) {
            if (config.invertMirror) {
                for (let i = 0; i < effectiveWidth; i++) {
                    newData[i] = sourceData[i];
                    newData[width - 1 - i] = sourceData[i];
                }
            } else {
                for (let i = 0; i < effectiveWidth; i++) {
                    newData[i] = sourceData[effectiveWidth - 1 - i];
                    newData[width - 1 - i] = sourceData[effectiveWidth - 1 - i];
                }
            }
            if (width % 2 !== 0) {
                const centerIdx = Math.floor(width / 2);
                newData[centerIdx] = config.invertMirror ? sourceData[effectiveWidth - 1] : sourceData[0];
            }
        } else {
            for (let i = 0; i < width; i++) {
                if (i < sourceData.length) newData[i] = sourceData[i];
            }
        }

        for(let i = 0; i < width; i++) {
            let final = prevFrontRow[i] * decay;
            if (newData[i] > final) {
                final = newData[i];
            }
            prevFrontRow[i] = final;
            newData[i] = final;
        }

    } else {
        idleTimeRef.current += delta * config.speed;
        const t = idleTimeRef.current;
        for (let i = 0; i < width; i++) {
            const x = i / width;
            const wave = Math.sin(x * 10 + t) * Math.cos(x * 5 - t * 0.5);
            newData[i] = wave * 0.15 * config.heightMultiplier; 
            prevFrontRowRef.current[i] = newData[i];
        }
    }

    if (config.showWaveform && lineRef.current) {
        for(let i=0; i<width; i++) {
            linePoints[i*3+2] = newData[i] * 8; 
        }
        if (lineRef.current.geometry) {
             lineRef.current.geometry.setPositions(linePoints);
        }
    }

    scrollAccumulatorRef.current += delta * (config.scrollSpeed || 1) * 30;

    if (scrollAccumulatorRef.current >= 1) {
        const shifts = Math.floor(scrollAccumulatorRef.current);
        scrollAccumulatorRef.current -= shifts;

        const history = historyRef.current;
        
        for(let s=0; s<shifts; s++) {
            for (let y = depth - 1; y > 0; y--) {
                for (let x = 0; x < width; x++) {
                    const currentIdx = y * width + x;
                    const prevIdx = (y - 1) * width + x;
                    history[currentIdx] = history[prevIdx];
                }
            }
            for (let x = 0; x < width; x++) {
                history[x] = newData[x];
            }
        }

        for (let i = 0; i < history.length; i++) {
            const val = history[i];
            positionAttribute.setZ(i, val * 8); 
        }

        positionAttribute.needsUpdate = true;
        
        // Compute normals only for solid meshes to handle lighting correctly
        if (config.renderMode === 'solid') {
            geometry.computeVertexNormals();
        }
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 10, 5]} intensity={2.0} color={baseColor} />
      <fog attach="fog" args={['#030712', 0, config.viewDistance || 60]} />

      <Spaceship 
          color={baseColor} 
          active={config.showSpaceship || false} 
          targetRef={shipTargetRef}
      />

      <group position={[0, -3, -5]} rotation={[0.2, 0, 0]}> 
          {config.showWaveform && (
              <Line 
                ref={lineRef}
                points={[[0,0,0], [1,0,0]]} 
                color={baseColor}
                lineWidth={3}
                // When glow is on, line material doesn't support AdditiveBlending directly via props in older drei,
                // but usually works fine. To boost brightness we can rely on color intensity or toneMapping.
                position={[0, 0, -(config.terrainLength || 80) / 2]} 
                rotation={[-Math.PI / 2, 0, 0]} 
              />
          )}

          {/* RENDER MODE SWITCHER */}
          {config.renderMode === 'dots' ? (
              <points 
                ref={meshRef as any} 
                rotation={[-Math.PI / 2, 0, 0]} 
                position={[0, 0, 0]}
                frustumCulled={false} 
              >
                <planeGeometry args={[80, config.terrainLength || 80, segments, segments]} />
                <pointsMaterial 
                    color={baseColor} 
                    size={config.lineThickness ? config.lineThickness * 0.2 : 0.2} 
                    sizeAttenuation={true} 
                    transparent 
                    opacity={config.opacity}
                    blending={blending}
                    depthWrite={depthWrite}
                />
              </points>
          ) : (
              <mesh 
                ref={meshRef as any} 
                rotation={[-Math.PI / 2, 0, 0]} 
                position={[0, 0, 0]}
                frustumCulled={false} 
              >
                <planeGeometry args={[80, config.terrainLength || 80, segments, segments]} />
                
                {config.renderMode === 'wireframe' ? (
                    <terrainGridMaterial 
                        color={new THREE.Color(baseColor)} 
                        thickness={config.lineThickness || 1.0}
                        opacity={config.opacity}
                        segments={segments}
                        fog={true}
                        transparent={true}
                        side={THREE.DoubleSide}
                        brightness={glowIntensity} // Pass brightness to shader
                        blending={blending} // Apply Additive Blending
                        depthWrite={depthWrite}
                    />
                ) : (
                    <meshStandardMaterial
                        color={baseColor}
                        metalness={0.8}
                        roughness={0.2}
                        emissive={baseColor}
                        // Increase emissive intensity for solid mode glow
                        emissiveIntensity={config.glow ? glowIntensity : 1.0}
                        wireframe={false}
                        transparent
                        opacity={config.opacity}
                        side={THREE.DoubleSide}
                    />
                )}
              </mesh>
          )}
      </group>
      
      <CameraController followTarget={config.showSpaceship ? shipTargetRef : undefined} locked={config.lockView} />
    </>
  );
};

const VisualizerTerrain3D: React.FC<VisualizerTerrain3DProps> = (props) => {
  const [altPressed, setAltPressed] = useState(false);
  const { colors } = useTheme();

  // Determine base color from theme if mode is theme
  const baseColor = props.config.colorMode === 'theme' ? colors.primary : 
                   (props.config.colorMode === 'matrix' ? '#00ff00' : '#ffffff');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
        setAltPressed(e.altKey);
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);
    return () => {
        window.removeEventListener('keydown', handleKey);
        window.removeEventListener('keyup', handleKey);
    }
  }, []);

  const fov = props.config.cameraFov || 75;

  // Apply real CSS drop-shadow based glow if enabled
  const glowStyle = props.config.glow 
    ? { filter: `drop-shadow(0 0 8px ${baseColor}) drop-shadow(0 0 15px ${baseColor})` } 
    : {};

  const isInteractive = altPressed && !props.config.lockView;

  return (
    <div 
        className={`absolute inset-0 w-full h-full z-[35] mix-blend-screen ${isInteractive ? 'pointer-events-auto' : 'pointer-events-none'}`}
        style={glowStyle}
    >
        <Canvas 
            camera={{ position: [0, 2, 8], fov: fov }} 
            gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
            dpr={[1, 2]} 
        >
            <TerrainScene {...props} />
        </Canvas>
    </div>
  );
};

export default VisualizerTerrain3D;
