
import React, { useEffect, useRef } from 'react';
import { EffectsConfig, FitMode, ScreenAlignment } from '../types';

interface MediaRendererProps {
  type: 'image' | 'video' | 'color';
  url?: string;
  stream?: MediaStream | null; // NEW: Live Stream
  bgColor: string;
  effects: EffectsConfig;
  fitMode?: FitMode; 
  alignment?: ScreenAlignment; // NEW
}

const CROSSFADE_DURATION = 1.0; // Seconds for seamless loop overlap

const MediaRenderer: React.FC<MediaRendererProps> = ({ type, url, stream, bgColor, effects, fitMode = 'cover', alignment = 'center' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Ref for Image
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // Refs for Seamless Video Looping (Double Buffering)
  const fileVideoRefA = useRef<HTMLVideoElement | null>(null);
  const fileVideoRefB = useRef<HTMLVideoElement | null>(null);
  const activeVideoRef = useRef<'A' | 'B'>('A');

  // Ref for Live Stream
  const streamVideoRef = useRef<HTMLVideoElement | null>(null);

  const animationRef = useRef<number>(0);
  const lastDrawTimeRef = useRef<number>(0);
  
  // --- 1. SETUP MEDIA SOURCES ---
  useEffect(() => {
    // CLEANUP PREVIOUS
    const cleanupVideo = (v: HTMLVideoElement | null) => {
        if (v) {
            v.pause();
            v.removeAttribute('src');
            v.load();
        }
    };
    cleanupVideo(fileVideoRefA.current);
    cleanupVideo(fileVideoRefB.current);
    fileVideoRefA.current = null;
    fileVideoRefB.current = null;

    if (streamVideoRef.current) {
        streamVideoRef.current.pause();
        streamVideoRef.current.srcObject = null;
        streamVideoRef.current = null;
    }
    imageRef.current = null;

    // RESET STATE
    activeVideoRef.current = 'A';

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
      // --- FILE VIDEO MODE (SEAMLESS LOOP SETUP) ---
      // We create TWO video elements to crossfade between end and start
      const setupVideo = () => {
          const v = document.createElement('video');
          v.src = url;
          v.muted = true;
          v.loop = false; // We handle loop manually
          v.playsInline = true;
          v.preload = 'auto';
          return v;
      };

      const vA = setupVideo();
      const vB = setupVideo();

      // Start the first one
      vA.play().catch(e => console.warn("Video play failed", e));
      
      fileVideoRefA.current = vA;
      fileVideoRefB.current = vB;

    } else if (type === 'image' && url) {
      // --- IMAGE MODE ---
      const img = new Image();
      img.src = url;
      imageRef.current = img;
    }
    
    // Cleanup on unmount or prop change
    return () => {
      cleanupVideo(fileVideoRefA.current);
      cleanupVideo(fileVideoRefB.current);
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
    // Enabled alpha to allow transparency when bgColor is 'transparent'
    const ctx = canvas.getContext('2d', { alpha: true });
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

      // Prepare Content
      const scaleEffect = Math.max(1, effects.pixelation);
      const drawW = Math.ceil(w / scaleEffect);
      const drawH = Math.ceil(h / scaleEffect);
      
      // --- OPTIMIZATION FOR TEXT READABILITY ---
      if (stream && scaleEffect <= 1.5) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
      } else {
          ctx.imageSmoothingEnabled = false;
      }

      // --- COLOR GRADING ---
      const vidSettings = effects.videoSettings;
      if (vidSettings && vidSettings.enabled) {
          const { brightness, contrast, saturation, grayscale, sepia, hueRotate } = vidSettings;
          // Apply filter BEFORE drawing
          ctx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) grayscale(${grayscale}) sepia(${sepia}) hue-rotate(${hueRotate}deg)`;
      } else {
          ctx.filter = 'none';
      }

      // --- DRAW HELPER ---
      const drawContent = (srcW: number, srcH: number, drawable: CanvasImageSource) => {
          // --- SPECIAL MODE: CONTAIN BLUR (BACKGROUND PASS) ---
          if (fitMode === 'contain-blur') {
              const srcRatio = srcW / srcH;
              const dstRatio = drawW / drawH;
              let bgW, bgH, bgX, bgY;

              // Cover Logic for background
              if (dstRatio > srcRatio) {
                  bgW = drawW;
                  bgH = drawW / srcRatio;
                  bgX = 0;
                  bgY = (drawH - bgH) / 2;
              } else {
                  bgH = drawH;
                  bgW = drawH * srcRatio;
                  bgY = 0;
                  bgX = (drawW - bgW) / 2;
              }

              ctx.save();
              // Apply strong blur and slight dimming for background
              // Note: If other filters are active via global grading (lines 142-147), this filter string appends/overrides
              // but since we want the blur ON TOP of color grading, we just set it here.
              // To preserve color grading, we might need to compose string, but ctx.filter applies to draw operations.
              // If we set a new filter string here, it replaces the previous one for this draw call.
              // So we should ideally combine them, or just accept that the background might look different.
              // For simplicity and performance, we just set blur. The visual distinction is good.
              ctx.filter = `blur(30px) brightness(0.5) saturate(1.2)`; 
              
              // Draw slightly larger to avoid edge artifacts from blur
              ctx.drawImage(drawable, bgX - 20, bgY - 20, bgW + 40, bgH + 40);
              ctx.restore();
          }

          // --- MAIN PASS ---
          let renderX = 0, renderY = 0, renderW = drawW, renderH = drawH;
          // Treat 'contain-blur' as 'contain' for the foreground image
          const effectiveFitMode = fitMode === 'contain-blur' ? 'contain' : fitMode;

          // 1. Calculate Target Dimensions based on Fit Mode
          if (effectiveFitMode === 'stretch') {
              renderW = drawW;
              renderH = drawH;
          } else {
              const srcRatio = srcW / srcH;
              const dstRatio = drawW / drawH;
              
              if (effectiveFitMode === 'contain') {
                  // Contain
                  if (dstRatio > srcRatio) {
                      renderH = drawH;
                      renderW = drawH * srcRatio;
                  } else {
                      renderW = drawW;
                      renderH = drawW / srcRatio;
                  }
              } else {
                  // Cover
                  if (dstRatio > srcRatio) {
                      renderW = drawW;
                      renderH = drawW / srcRatio;
                  } else {
                      renderH = drawH;
                      renderW = drawH * srcRatio;
                  }
              }
          }

          // 2. Calculate Position based on Alignment (X Axis)
          if (alignment === 'left') {
              renderX = 0;
          } else if (alignment === 'right') {
              renderX = drawW - renderW;
          } else {
              renderX = (drawW - renderW) / 2;
          }

          // 3. Y Axis Alignment (Center by default)
          renderY = (drawH - renderH) / 2;

          ctx.drawImage(drawable, renderX, renderY, renderW, renderH);
      };

      // --- RENDER LOGIC ---

      // CRITICAL FIX: Only clear the canvas if we are about to draw something or if it's not a video waiting to load.
      // If we are swapping video sources, 'fileVideoRefA.current' might exist but have readyState < 2.
      // In that case, we want to KEEP the previous frame on the canvas to prevent a black flash.
      let shouldClear = true;
      if (type === 'video' && fileVideoRefA.current) {
          const activeRef = activeVideoRef.current;
          const activeV = activeRef === 'A' ? fileVideoRefA.current : fileVideoRefB.current;
          // If video isn't ready to play, DON'T clear canvas. Leave the last frame from previous render (or previous component cycle)
          if (!activeV || activeV.readyState < 2) {
              shouldClear = false;
          }
      }

      if (shouldClear) {
          ctx.clearRect(0, 0, drawW, drawH);
      }

      if (stream && streamVideoRef.current) {
          // --- LIVE STREAM ---
          const v = streamVideoRef.current;
          if (v.readyState >= 2) {
              // Always clear for streams to avoid trails if transparent
              ctx.clearRect(0, 0, drawW, drawH);
              drawContent(v.videoWidth, v.videoHeight, v);
          }

      } else if (type === 'video' && fileVideoRefA.current && fileVideoRefB.current) {
          // --- SEAMLESS LOOPING VIDEO ---
          
          const activeRef = activeVideoRef.current; // 'A' or 'B'
          const activeV = activeRef === 'A' ? fileVideoRefA.current : fileVideoRefB.current;
          const nextV = activeRef === 'A' ? fileVideoRefB.current : fileVideoRefA.current;

          if (activeV && activeV.readyState >= 2) {
              const duration = activeV.duration;
              const currentTime = activeV.currentTime;
              const timeLeft = duration - currentTime;

              // 1. Draw Active Video
              // Only clear rect if contained, to avoid trails. If covering, drawing over is enough (and faster/safer).
              // Exception: if fitMode is contain-blur, we draw a full bg, so no need to clear.
              if (fitMode === 'contain' && shouldClear) ctx.clearRect(0, 0, drawW, drawH);
              
              drawContent(activeV.videoWidth, activeV.videoHeight, activeV);

              // 2. Check for Crossfade
              if (timeLeft <= CROSSFADE_DURATION && duration > CROSSFADE_DURATION) {
                  // Start next video if not playing
                  if (nextV.paused) {
                      nextV.currentTime = 0;
                      nextV.play().catch(() => {});
                  }

                  // Draw next video on top with opacity
                  if (nextV.readyState >= 2) {
                      const opacity = 1 - (timeLeft / CROSSFADE_DURATION);
                      ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
                      
                      // Draw Next Layer
                      drawContent(nextV.videoWidth, nextV.videoHeight, nextV);
                      
                      // Reset Alpha
                      ctx.globalAlpha = 1.0;
                  }
              }

              // 3. Swap Logic (When active finishes)
              // Use a small threshold before actual end to ensure visual continuity
              if (activeV.ended || currentTime >= duration - 0.05) {
                  // Swap Roles
                  activeVideoRef.current = activeRef === 'A' ? 'B' : 'A';
                  
                  // Stop old video and reset
                  activeV.pause();
                  activeV.currentTime = 0;
                  
                  // Ensure new active is playing (redundant safety)
                  if (nextV.paused) nextV.play().catch(() => {});
              }
          }

      } else {
          // --- IMAGE / COLOR ---
          // Always clear for images
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, w, h);

          if (type === 'image' && imageRef.current && imageRef.current.complete) {
              const img = imageRef.current;
              if (img.naturalWidth && img.naturalHeight) {
                  drawContent(img.naturalWidth, img.naturalHeight, img);
              }
          }
      }

      // --- APPLY WARMTH / TINT ---
      if (vidSettings && vidSettings.enabled && vidSettings.warmth !== 0) {
          const warmth = vidSettings.warmth;
          ctx.filter = 'none'; 
          ctx.globalCompositeOperation = 'overlay';
          
          if (warmth > 0) {
              ctx.fillStyle = `rgba(255, 150, 0, ${warmth * 0.3})`;
          } else {
              ctx.fillStyle = `rgba(0, 100, 255, ${Math.abs(warmth) * 0.3})`;
          }
          
          ctx.fillRect(0, 0, drawW, drawH);
          ctx.globalCompositeOperation = 'source-over'; 
      }

      // Scale up if needed (Pixelation)
      if (scaleEffect > 1) {
          ctx.filter = 'none'; 
          ctx.drawImage(canvas, 0, 0, drawW, drawH, 0, 0, w, h);
      }
    };

    animationRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationRef.current);
  }, [type, url, stream, bgColor, effects, fitMode, alignment]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-0" />;
};

export default MediaRenderer;
