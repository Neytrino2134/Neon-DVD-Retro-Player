
import React, { useEffect, useRef } from 'react';
import { EffectsConfig } from '../types';

interface MediaRendererProps {
  type: 'image' | 'video' | 'color';
  url?: string;
  bgColor: string;
  effects: EffectsConfig;
}

const MediaRenderer: React.FC<MediaRendererProps> = ({ type, url, bgColor, effects }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animationRef = useRef<number>(0);
  const lastDrawTimeRef = useRef<number>(0);
  
  useEffect(() => {
    if (type === 'video' && url) {
      const vid = document.createElement('video');
      vid.src = url;
      vid.loop = true;
      vid.muted = true;
      vid.playsInline = true;
      vid.autoplay = true;
      vid.play().catch(e => console.warn("Video play failed or auto-play blocked", e));
      videoRef.current = vid;
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
        videoRef.current.load();
        videoRef.current = null;
      }
    };
  }, [type, url]);

  useEffect(() => {
    if (type === 'image' && url) {
      const img = new Image();
      img.src = url;
      imageRef.current = img;
    } else {
      imageRef.current = null;
    }
  }, [type, url]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = (timestamp: number) => {
      animationRef.current = requestAnimationFrame(render);

      const interval = 1000 / effects.fps;
      const elapsed = timestamp - lastDrawTimeRef.current;
      
      if (elapsed < interval) return;
      lastDrawTimeRef.current = timestamp - (elapsed % interval);

      if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }
      const w = canvas.width;
      const h = canvas.height;

      // Draw Background Color
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);

      // Render Media
      ctx.save();
      const scaleEffect = Math.max(1, effects.pixelation);
      
      if (type !== 'color') {
          const drawW = Math.ceil(w / scaleEffect);
          const drawH = Math.ceil(h / scaleEffect);
          ctx.imageSmoothingEnabled = false;

          let source: CanvasImageSource | null = null;
          let srcW = 0;
          let srcH = 0;

          if (type === 'video' && videoRef.current && videoRef.current.readyState >= 2) {
              source = videoRef.current;
              srcW = videoRef.current.videoWidth;
              srcH = videoRef.current.videoHeight;
          } else if (type === 'image' && imageRef.current && imageRef.current.complete) {
              source = imageRef.current;
              srcW = imageRef.current.naturalWidth;
              srcH = imageRef.current.naturalHeight;
          }

          if (source && srcW > 0 && srcH > 0) {
              // "Cover" logic: preserves aspect ratio, fills container
              const srcRatio = srcW / srcH;
              const dstRatio = drawW / drawH;
              
              let renderX = 0, renderY = 0, renderW = drawW, renderH = drawH;

              if (dstRatio > srcRatio) {
                  // Destination is wider than source -> Match Width
                  renderW = drawW;
                  renderH = drawW / srcRatio;
                  renderY = (drawH - renderH) / 2; // Center vertically
              } else {
                  // Destination is narrower than source -> Match Height
                  renderH = drawH;
                  renderW = drawH * srcRatio;
                  renderX = (drawW - renderW) / 2; // Center horizontally
              }

              ctx.drawImage(source, renderX, renderY, renderW, renderH);

              if (scaleEffect > 1) {
                  // Scale up the pixelated buffer to full screen
                  ctx.drawImage(canvas, 0, 0, drawW, drawH, 0, 0, w, h);
              }
          }
      }
      ctx.restore();
    };

    animationRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationRef.current);
  }, [type, url, bgColor, effects]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-0" />;
};

export default MediaRenderer;
