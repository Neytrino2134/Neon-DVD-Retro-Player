
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Plane, Box, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import { RoadConfig, VisualizerConfig } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import CameraController from './CameraController';

interface VisualizerRoad3DProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  config: RoadConfig;
  visualizerConfig: VisualizerConfig; // Master config for wave
  volume: number;
}

// Reusable Building Logic
const BUILDINGS_COUNT = 60; // 30 per side
const ROAD_LENGTH = 200;
const SPAWN_Z = -100;
const DESPAWN_Z = 20;

const RoadScene: React.FC<{ analyser: AnalyserNode | null; isPlaying: boolean; config: RoadConfig; visualizerConfig: VisualizerConfig; volume: number }> = ({ analyser, isPlaying, config, visualizerConfig, volume }) => {
  const { colors } = useTheme();
  
  // Refs
  const roadMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const buildingsLeftRef = useRef<THREE.InstancedMesh>(null);
  const buildingsRightRef = useRef<THREE.InstancedMesh>(null);
  const waveMeshRef = useRef<THREE.InstancedMesh>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  
  // State for Building Positions
  const [buildings] = useState(() => {
      const b = [];
      for(let i=0; i<BUILDINGS_COUNT; i++) {
          b.push({
              z: SPAWN_Z + (Math.random() * (DESPAWN_Z - SPAWN_Z)),
              height: 2 + Math.random() * 8,
              width: 2 + Math.random() * 2,
              offset: 2 + Math.random() * 5 // lateral variance
          });
      }
      return b.sort((a,b) => a.z - b.z); // Sort for better initial rendering
  });

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Determine Main Color
  const getMainColor = () => {
      switch(config.colorMode) {
          case 'cyan': return '#00f3ff';
          case 'magenta': return '#ff00ff';
          case 'orange': return '#ff8c00';
          case 'theme': default: return colors.primary;
      }
  };
  const mainColor = getMainColor();
  const secondaryColor = config.colorMode === 'theme' ? colors.secondary : '#ffffff';

  // Init Analyser Data
  useEffect(() => {
      if (analyser && !dataArrayRef.current) {
          dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      }
  }, [analyser]);

  useFrame((_state, delta) => {
      // 1. Move Road Texture
      if (roadMatRef.current && roadMatRef.current.map) {
          // Move texture Y to simulate forward motion
          roadMatRef.current.map.offset.y -= delta * config.speed * 0.5;
      }

      // 2. Audio Processing
      let audioLevel = 0;
      if (analyser && dataArrayRef.current && isPlaying) {
          analyser.getByteFrequencyData(dataArrayRef.current as any);
          
          // Calculate average level for pulsing effects
          let sum = 0;
          const len = Math.floor(dataArrayRef.current.length * 0.5);
          for(let i=0; i<len; i++) sum += dataArrayRef.current[i];
          audioLevel = (sum / len) / 255;
          if (!visualizerConfig.preventVolumeScaling) audioLevel *= volume;
      }

      // 3. Move Buildings
      const speed = config.speed * 20 * delta;
      
      const updateBuildings = (mesh: THREE.InstancedMesh | null, sideMultiplier: number) => {
          if (!mesh) return;
          
          buildings.forEach((b, i) => {
              // Move Forward
              b.z += speed;
              
              // Reset if passed camera
              if (b.z > DESPAWN_Z) {
                  b.z = SPAWN_Z;
                  // Randomize new building
                  b.height = 2 + Math.random() * 8 * config.buildingHeightScale;
                  b.width = 2 + Math.random() * 2;
              }

              // Visual Pulse based on audio
              const pulse = 1 + (audioLevel * 0.2); 

              // Position
              const x = sideMultiplier * (config.roadWidth/2 + b.offset);
              dummy.position.set(x, b.height/2, b.z);
              dummy.rotation.set(0, 0, 0);
              dummy.scale.set(b.width, b.height * pulse, b.width);
              dummy.updateMatrix();
              
              mesh.setMatrixAt(i, dummy.matrix);
              
              // Color (Fade in distance)
              // Map Z from SPAWN_Z (-100) -> DESPAWN_Z (20) to Opacity
              // We want max brightness closer to 0
              const distFactor = 1 - Math.abs(b.z) / 100;
              const brightness = Math.max(0.1, distFactor * config.buildingBrightness * pulse);
              
              const col = new THREE.Color(mainColor);
              col.multiplyScalar(brightness);
              
              mesh.setColorAt(i, col);
          });
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      };

      updateBuildings(buildingsLeftRef.current, -1);
      updateBuildings(buildingsRightRef.current, 1);

      // 4. Update Horizon Wave
      if (waveMeshRef.current && analyser && dataArrayRef.current) {
          const barCount = 64; // Fixed resolution for horizon
          const totalWidth = 200; // Horizon width
          const gap = 1;
          const barW = (totalWidth / barCount) - gap;
          const startX = -totalWidth / 2;

          for (let i = 0; i < barCount; i++) {
              // Map frequency
              const binSize = analyser.frequencyBinCount / barCount; // Linear mapping for simplicity on horizon
              const idx = Math.floor(i * binSize);
              let val = dataArrayRef.current[idx] / 255;
              
              // Sensitivity
              val = Math.pow(val, 2) * (visualizerConfig.sensitivity || 1.5);
              if (!visualizerConfig.preventVolumeScaling) val *= volume;

              const h = Math.max(0.5, val * 30); // Max height 30 units

              dummy.position.set(startX + i * (barW + gap), h/2 - 2, SPAWN_Z + 5);
              dummy.rotation.set(0, 0, 0);
              dummy.scale.set(barW, h, 1);
              dummy.updateMatrix();
              waveMeshRef.current.setMatrixAt(i, dummy.matrix);
              
              // Color gradient based on height
              const c = new THREE.Color(mainColor);
              c.lerp(new THREE.Color(secondaryColor), val);
              c.multiplyScalar(2); // Glow
              waveMeshRef.current.setColorAt(i, c);
          }
          waveMeshRef.current.instanceMatrix.needsUpdate = true;
          if (waveMeshRef.current.instanceColor) waveMeshRef.current.instanceColor.needsUpdate = true;
      }
  });

  return (
    <>
        {/* Environment */}
        <ambientLight intensity={0.5} />
        <fog attach="fog" args={['#000000', 10, 120]} /> 

        {/* Road */}
        <Plane 
            args={[config.roadWidth, ROAD_LENGTH, 1, 20]} 
            rotation={[-Math.PI/2, 0, 0]} 
            position={[0, -0.1, -40]} // Positioned slightly below origin, extending back
        >
            <meshStandardMaterial 
                ref={roadMatRef}
                color="#000000"
                emissive={mainColor}
                emissiveIntensity={0.5}
                wireframe={true}
            />
        </Plane>
        
        {/* Solid floor beneath road to hide grid lines underneath */}
        <Plane 
            args={[config.roadWidth, ROAD_LENGTH]} 
            rotation={[-Math.PI/2, 0, 0]} 
            position={[0, -0.2, -40]} 
        >
            <meshBasicMaterial color="#000000" />
        </Plane>

        {/* Buildings Left */}
        <instancedMesh ref={buildingsLeftRef} args={[undefined, undefined, BUILDINGS_COUNT]}>
            <boxGeometry />
            <meshStandardMaterial 
                color={mainColor} 
                wireframe={config.showWireframe}
                transparent 
                opacity={0.8}
            />
        </instancedMesh>

        {/* Buildings Right */}
        <instancedMesh ref={buildingsRightRef} args={[undefined, undefined, BUILDINGS_COUNT]}>
            <boxGeometry />
            <meshStandardMaterial 
                color={mainColor} 
                wireframe={config.showWireframe}
                transparent 
                opacity={0.8}
            />
        </instancedMesh>

        {/* Horizon Wave */}
        <instancedMesh ref={waveMeshRef} args={[undefined, undefined, 64]}>
            <boxGeometry />
            <meshBasicMaterial color={mainColor} />
        </instancedMesh>

        {/* Motorcycle (Simplified) */}
        <group position={[0, 0.5, 0]}>
            {/* Body */}
            <Box args={[1, 0.5, 3]} position={[0, 0.5, 0]}>
                <meshStandardMaterial color={colors.secondary} emissive={colors.secondary} emissiveIntensity={0.5} />
            </Box>
            {/* Wheels */}
            <Cylinder args={[0.6, 0.6, 0.4, 16]} rotation={[0, 0, Math.PI/2]} position={[0, 0.6, 1.2]}>
                <meshStandardMaterial color="#333" />
            </Cylinder>
            <Cylinder args={[0.6, 0.6, 0.4, 16]} rotation={[0, 0, Math.PI/2]} position={[0, 0.6, -1.2]}>
                <meshStandardMaterial color="#333" />
            </Cylinder>
            {/* Trail / Engine Glow */}
            <pointLight position={[0, 0.5, 2]} color={mainColor} intensity={2} distance={10} />
        </group>

        {/* Sun on Horizon */}
        <mesh position={[0, 20, SPAWN_Z]}>
            <circleGeometry args={[15, 32]} />
            <meshBasicMaterial color={secondaryColor} transparent opacity={0.2} />
        </mesh>
        
        {/* Dynamic Grid Floor Lines (Moving side lines) */}
        {/* Implemented via the main road plane logic above */}

        <CameraController locked={config.lockView} />
    </>
  );
};

const VisualizerRoad3D: React.FC<VisualizerRoad3DProps> = (props) => {
  const [altPressed, setAltPressed] = useState(false);

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

  const isInteractive = altPressed && !props.config.lockView;

  return (
    <div className={`absolute inset-0 w-full h-full z-10 pointer-events-none ${isInteractive ? 'pointer-events-auto' : ''}`}>
        <Canvas 
            camera={{ position: [0, 4, 10], fov: 60 }} 
            gl={{ alpha: true, antialias: true }}
            dpr={[1, 2]} 
        >
            <RoadScene {...props} />
        </Canvas>
    </div>
  );
};

export default VisualizerRoad3D;
