
import React, { useEffect, useState, useRef } from 'react';

const FpsCounter: React.FC = () => {
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    let rafId: number;

    const loop = (time: number) => {
      frameCount.current++;
      if (time - lastTime.current >= 1000) {
        setFps(frameCount.current);
        frameCount.current = 0;
        lastTime.current = time;
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="absolute bottom-2 left-2 z-50 pointer-events-none font-mono text-xs font-bold text-green-500 bg-black/50 px-2 py-1 rounded backdrop-blur-sm border border-green-500/30">
      FPS: {fps}
    </div>
  );
};

export default FpsCounter;
