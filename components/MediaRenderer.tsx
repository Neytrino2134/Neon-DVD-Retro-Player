
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
  
  // Ref for Image
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // Refs for Seamless Video Looping (Double Buffering)
  const videoRefs = useRef<[HTMLVideoElement, HTMLVideoElement] | null>(null);
  const activeVideoIndex = useRef<number>(0);

  const animationRef = useRef<number>(0);
  const lastDrawTimeRef = useRef<number>(0);
  
  // --- 1. SETUP MEDIA SOURCES ---
  useEffect(() => {
    // CLEANUP PREVIOUS
    if (videoRefs.current) {
        videoRefs.current.forEach(v => {
            v.pause();
            v.removeAttribute('src');
            v.load();
        });
        videoRefs.current = null;
    }
    imageRef.current = null;

    if (type === 'video' && url) {
      // Create TWO video elements for Ping-Pong looping
      const v1 = document.createElement('video');
      const v2 = document.createElement('video');
      
      const setupVideo = (v: HTMLVideoElement) => {
          v.src = url;
          v.muted = true;
          // We handle looping manually for seamlessness
          v.loop = false; 
          v.playsInline = true;
          v.preload = 'auto';
      };

      setupVideo(v1);
      setupVideo(v2);

      // Start the first one immediately
      v1.play().catch(e => console.warn("Video play failed", e));
      
      videoRefs.current = [v1, v2];
      activeVideoIndex.current = 0;

    } else if (type === 'image' && url) {
      const img = new Image();
      img.src = url;
      imageRef.current = img;
    }
    
    // Cleanup on unmount or prop change
    return () => {
      if (videoRefs.current) {
        videoRefs.current.forEach(v => {
            v.pause();
            v.removeAttribute('src');
            v.load();
        });
        videoRefs.current = null;
      }
    };
  }, [type, url]);

  // --- 2. RENDER LOOP ---
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

      // Resize
      if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }
      const w = canvas.width;
      const h = canvas.height;

      // Draw Background Color
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);

      // Prepare Content
      ctx.save();
      const scaleEffect = Math.max(1, effects.pixelation);
      
      if (type !== 'color') {
          const drawW = Math.ceil(w / scaleEffect);
          const drawH = Math.ceil(h / scaleEffect);
          ctx.imageSmoothingEnabled = false;

          let source: CanvasImageSource | null = null;
          let srcW = 0;
          let srcH = 0;

          // --- VIDEO LOGIC (SEAMLESS LOOP) ---
          if (type === 'video' && videoRefs.current) {
              const videos = videoRefs.current;
              const currentIndex = activeVideoIndex.current;
              const nextIndex = (currentIndex + 1) % 2;
              
              const activeVid = videos[currentIndex];
              const nextVid = videos[nextIndex];

              // Check if we need to swap (0.2s before end)
              // We use a threshold to ensure the next video starts BEFORE the current one goes black
              if (activeVid.duration > 0 && activeVid.currentTime >= activeVid.duration - 0.25) {
                  // Only swap if next video is ready
                  if (nextVid.readyState >= 2) {
                      nextVid.play().catch(e => console.warn("Seamless swap failed", e));
                      activeVideoIndex.current = nextIndex;
                      
                      // Reset the old video (now inactive) to 0 so it's ready for next time
                      activeVid.pause();
                      activeVid.currentTime = 0;
                  } else {
                      // If next isn't ready, loop current normally as fallback (might blink, but better than freezing)
                      if (activeVid.currentTime >= activeVid.duration - 0.05) {
                          activeVid.currentTime = 0;
                          activeVid.play();
                      }
                  }
              }

              // Use whichever is currently marked active for drawing
              const drawSource = videos[activeVideoIndex.current];
              if (drawSource.readyState >= 2) {
                  source = drawSource;
                  srcW = drawSource.videoWidth;
                  srcH = drawSource.videoHeight;
              }
          } 
          // --- IMAGE LOGIC ---
          else if (type === 'image' && imageRef.current && imageRef.current.complete) {
              source = imageRef.current;
              srcW = imageRef.current.naturalWidth;
              srcH = imageRef.current.naturalHeight;
          }

          // --- DRAWING TO CANVAS ---
          if (source && srcW > 0 && srcH > 0) {
              // "Cover" logic
              const srcRatio = srcW / srcH;
              const dstRatio = drawW / drawH;
              
              let renderX = 0, renderY = 0, renderW = drawW, renderH = drawH;

              if (dstRatio > srcRatio) {
                  // Screen is wider than video -> Fit Width, Crop Height
                  renderW = drawW;
                  renderH = drawW / srcRatio;
                  renderY = (drawH - renderH) / 2; 
              } else {
                  // Screen is taller than video -> Fit Height, Crop Width
                  renderH = drawH;
                  renderW = drawH * srcRatio;
                  renderX = (drawW - renderW) / 2;
              }

              ctx.drawImage(source, renderX, renderY, renderW, renderH);

              if (scaleEffect > 1) {
                  // Scale up the pixelated buffer
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
