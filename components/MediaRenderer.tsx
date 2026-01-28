
import React, { useEffect, useRef } from 'react';
import { EffectsConfig } from '../types';

interface MediaRendererProps {
  type: 'image' | 'video' | 'color';
  url?: string;
  stream?: MediaStream | null; // NEW: Live Stream
  bgColor: string;
  effects: EffectsConfig;
}

const MediaRenderer: React.FC<MediaRendererProps> = ({ type, url, stream, bgColor, effects }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Ref for Image
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // Refs for Seamless Video Looping (Double Buffering) for FILES
  const videoRefs = useRef<[HTMLVideoElement, HTMLVideoElement] | null>(null);
  const activeVideoIndex = useRef<number>(0);

  // Ref for Live Stream
  const streamVideoRef = useRef<HTMLVideoElement | null>(null);

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
    if (streamVideoRef.current) {
        streamVideoRef.current.pause();
        streamVideoRef.current.srcObject = null;
        streamVideoRef.current = null;
    }
    imageRef.current = null;

    if (stream) {
        // --- LIVE STREAM MODE ---
        const v = document.createElement('video');
        v.srcObject = stream;
        v.muted = true;
        v.playsInline = true;
        v.onloadedmetadata = () => {
            v.play().catch(e => console.warn("Stream play failed", e));
        };
        streamVideoRef.current = v;

    } else if (type === 'video' && url) {
      // --- FILE VIDEO MODE (SEAMLESS LOOP) ---
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
      // --- IMAGE MODE ---
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
      if (streamVideoRef.current) {
          streamVideoRef.current.pause();
          streamVideoRef.current.srcObject = null;
          streamVideoRef.current = null;
      }
    };
  }, [type, url, stream]);

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
      
      if (type !== 'color' || stream) {
          const drawW = Math.ceil(w / scaleEffect);
          const drawH = Math.ceil(h / scaleEffect);
          ctx.imageSmoothingEnabled = false;

          let source: CanvasImageSource | null = null;
          let srcW = 0;
          let srcH = 0;

          // --- LIVE STREAM LOGIC ---
          if (stream && streamVideoRef.current) {
              const v = streamVideoRef.current;
              if (v.readyState >= 2) {
                  source = v;
                  srcW = v.videoWidth;
                  srcH = v.videoHeight;
              }
          }
          // --- FILE VIDEO LOGIC ---
          else if (type === 'video' && videoRefs.current) {
              const videos = videoRefs.current;
              const currentIndex = activeVideoIndex.current;
              const nextIndex = (currentIndex + 1) % 2;
              
              const activeVid = videos[currentIndex];
              const nextVid = videos[nextIndex];

              if (activeVid.duration > 0 && activeVid.currentTime >= activeVid.duration - 0.25) {
                  if (nextVid.readyState >= 2) {
                      nextVid.play().catch(e => console.warn("Seamless swap failed", e));
                      activeVideoIndex.current = nextIndex;
                      activeVid.pause();
                      activeVid.currentTime = 0;
                  } else {
                      if (activeVid.currentTime >= activeVid.duration - 0.05) {
                          activeVid.currentTime = 0;
                          activeVid.play();
                      }
                  }
              }

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
                  renderW = drawW;
                  renderH = drawW / srcRatio;
                  renderY = (drawH - renderH) / 2; 
              } else {
                  renderH = drawH;
                  renderW = drawH * srcRatio;
                  renderX = (drawW - renderW) / 2;
              }

              ctx.drawImage(source, renderX, renderY, renderW, renderH);

              if (scaleEffect > 1) {
                  ctx.drawImage(canvas, 0, 0, drawW, drawH, 0, 0, w, h);
              }
          }
      }
      ctx.restore();
    };

    animationRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationRef.current);
  }, [type, url, stream, bgColor, effects]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-0" />;
};

export default MediaRenderer;
