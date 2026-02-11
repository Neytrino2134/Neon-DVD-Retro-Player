
import React, { useEffect, useState } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const CameraController: React.FC = () => {
  const { gl } = useThree();
  
  const [mouseButtons, setMouseButtons] = useState({
      LEFT: null as unknown as THREE.MOUSE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
  });

  useEffect(() => {
    const handleKeyChange = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey;
      const alt = e.altKey;
      const shift = e.shiftKey;

      let leftAction: any = null;
      let cursor = 'default';

      // Priority: Ctrl+Alt (Dolly) > Alt+Shift (Pan) > Alt (Rotate)
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
          // Avoid redundant state updates to prevent re-renders
          if (prev.LEFT !== leftAction) {
              return { ...prev, LEFT: leftAction };
          }
          return prev;
      });

      if (gl.domElement) {
          // Only override cursor if we have an active override action
          if (leftAction !== null) {
             gl.domElement.style.cursor = cursor;
          } else {
             gl.domElement.style.cursor = 'default';
          }
      }
    };

    const handleBlur = () => {
        setMouseButtons(prev => ({ ...prev, LEFT: null as any }));
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
  }, [gl]);

  return (
    <OrbitControls 
        makeDefault 
        enableDamping={true} 
        dampingFactor={0.1}
        enablePan={true}
        enableRotate={true}
        enableZoom={true}
        mouseButtons={mouseButtons}
    />
  );
};

export default CameraController;
