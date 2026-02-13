
import React, { useEffect, useState, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface CameraControllerProps {
  followTarget?: React.MutableRefObject<THREE.Vector3>;
  locked?: boolean;
}

const CameraController: React.FC<CameraControllerProps> = ({ followTarget, locked }) => {
  const { gl } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  
  // Use -1 as a sentinel for "No Action" since THREE.MOUSE enum values are 0, 1, 2
  const NO_ACTION = -1 as unknown as THREE.MOUSE;

  const [mouseButtons, setMouseButtons] = useState({
      LEFT: NO_ACTION, 
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
  });

  // Smooth follow logic
  useFrame(() => {
      if (controlsRef.current && followTarget && followTarget.current) {
          // Smoothly interpolate the controls target to the moving object
          // This allows orbiting AROUND the moving object while it flies
          controlsRef.current.target.lerp(followTarget.current, 0.1);
          controlsRef.current.update();
      }
  });

  useEffect(() => {
    const handleKeyChange = (e: KeyboardEvent) => {
      // If locked, we ignore key changes and keep LEFT as NO_ACTION
      if (locked) return;

      const ctrl = e.ctrlKey || e.metaKey;
      const alt = e.altKey;
      const shift = e.shiftKey;

      let leftAction = NO_ACTION;
      let cursor = 'default';

      // Priority Logic:
      // Alt is the "Interaction Key". Without Alt, we don't interact (pass-through).
      // 1. Alt + Shift -> PAN
      // 2. Alt + Ctrl -> DOLLY (Zoom)
      // 3. Alt -> ROTATE
      
      if (alt) {
          if (shift) {
              leftAction = THREE.MOUSE.PAN;
              cursor = 'move';
          } else if (ctrl) {
              leftAction = THREE.MOUSE.DOLLY;
              cursor = 'ns-resize';
          } else {
              leftAction = THREE.MOUSE.ROTATE;
              cursor = 'grab';
          }
      }

      setMouseButtons(prev => {
          if (prev.LEFT !== leftAction) {
              return { ...prev, LEFT: leftAction };
          }
          return prev;
      });

      if (gl.domElement) {
          // Apply cursor to canvas
          if (leftAction !== NO_ACTION) {
             gl.domElement.style.cursor = cursor;
          } else {
             gl.domElement.style.cursor = 'default';
          }
      }
    };

    const handleBlur = () => {
        setMouseButtons(prev => ({ ...prev, LEFT: NO_ACTION }));
        if (gl.domElement) gl.domElement.style.cursor = 'default';
    };
    
    window.addEventListener('keydown', handleKeyChange);
    window.addEventListener('keyup', handleKeyChange);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('keydown', handleKeyChange);
      window.removeEventListener('keyup', handleKeyChange);
      window.removeEventListener('blur', handleBlur);
      if (gl.domElement) gl.domElement.style.cursor = 'default';
    };
  }, [gl, locked]);

  // Reset controls if locked changes
  useEffect(() => {
      if (locked) {
          setMouseButtons(prev => ({ ...prev, LEFT: NO_ACTION }));
          if (gl.domElement) gl.domElement.style.cursor = 'default';
      }
  }, [locked, gl]);

  // Direct sync to controls instance to ensure immediate responsiveness
  useEffect(() => {
      if (controlsRef.current) {
          controlsRef.current.mouseButtons.LEFT = mouseButtons.LEFT;
          controlsRef.current.update();
      }
  }, [mouseButtons]);

  if (locked) return null;

  return (
    <OrbitControls 
        ref={controlsRef}
        makeDefault 
        enableDamping={true} 
        dampingFactor={0.1}
        enablePan={true}
        enableRotate={true}
        enableZoom={true}
        // screenSpacePanning=true allows Up/Down panning on screen plane, which is better for 3D viewers
        screenSpacePanning={true}
        mouseButtons={mouseButtons}
        // If we are following a target, limit the polar angle to prevent going under the ground
        maxPolarAngle={followTarget ? Math.PI / 2 - 0.1 : Math.PI}
        minDistance={followTarget ? 5 : 0}
        maxDistance={followTarget ? 50 : Infinity}
    />
  );
};

export default CameraController;