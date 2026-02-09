
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

const MediaRenderer: React.FC<MediaRendererProps> = ({ type, url, stream, bgColor, effects, fitMode = 'cover', alignment = 'center' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Ref for Image
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // Ref for Single File Video (Native Loop)
  const fileVideoRef = useRef<HTMLVideoElement | null>(null);

  // Ref for Live Stream
  const streamVideoRef = useRef<HTMLVideoElement | null>(null);

  const animationRef = useRef<number>(0);
  const lastDrawTimeRef = useRef<number>(0);
  
  // --- 1. SETUP MEDIA SOURCES ---
  useEffect(() => {
    // CLEANUP PREVIOUS
    if (fileVideoRef.current) {
        fileVideoRef.current.pause();
        fileVideoRef.current.removeAttribute('src');
        fileVideoRef.current.load();
        fileVideoRef.current = null;
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
      // --- FILE VIDEO MODE (NATIVE LOOP) ---
      const v = document.createElement('video');
      v.src = url;
      v.muted = true;
      v.loop = true; // Native seamless loop
      v.playsInline = true;
      v.autoplay = true;
      v.preload = 'auto'; // Important for buffer

      // Optimization: Force hardware acceleration hints if possible
      v.play().catch(e => console.warn("Video play failed", e));
      
      fileVideoRef.current = v;

    } else if (type === 'image' && url) {
      // --- IMAGE MODE ---
      const img = new Image();
      img.src = url;
      imageRef.current = img;
    }
    
    // Cleanup on unmount or prop change
    return () => {
      if (fileVideoRef.current) {
        fileVideoRef.current.pause();
        fileVideoRef.current.removeAttribute('src');
        fileVideoRef.current.load();
        fileVideoRef.current = null;
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

      // --- LOGIC SPLIT: VIDEO VS IMAGE/COLOR ---
      
      let videoSource: HTMLVideoElement | null = null;
      if (stream && streamVideoRef.current) {
          videoSource = streamVideoRef.current;
      } else if (type === 'video' && fileVideoRef.current) {
          videoSource = fileVideoRef.current;
      }

      const drawContent = (srcW: number, srcH: number, drawable: CanvasImageSource) => {
          let renderX = 0, renderY = 0, renderW = drawW, renderH = drawH;

          // 1. Calculate Target Dimensions based on Fit Mode
          if (fitMode === 'stretch') {
              renderW = drawW;
              renderH = drawH;
          } else {
              const srcRatio = srcW / srcH;
              const dstRatio = drawW / drawH;
              
              if (fitMode === 'contain') {
                  // Contain: Scale down to fit completely within canvas
                  if (dstRatio > srcRatio) {
                      // Canvas is wider than image (fit height)
                      renderH = drawH;
                      renderW = drawH * srcRatio;
                  } else {
                      // Canvas is taller than image (fit width)
                      renderW = drawW;
                      renderH = drawW / srcRatio;
                  }
              } else {
                  // Cover: Scale up to fill canvas completely (crop)
                  if (dstRatio > srcRatio) {
                      // Canvas is wider than image (match width, crop height)
                      renderW = drawW;
                      renderH = drawW / srcRatio;
                  } else {
                      // Canvas is taller than image (match height, crop width)
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
              // Center
              renderX = (drawW - renderW) / 2;
          }

          // 3. Y Axis Alignment (Center by default)
          // renderY can be positive (centering small image) or negative (centering crop)
          renderY = (drawH - renderH) / 2;

          ctx.drawImage(drawable, renderX, renderY, renderW, renderH);
      };

      if (videoSource) {
          // --- VIDEO RENDERING ---
          // Clear only if using contain mode to show background bars
          if (fitMode === 'contain') {
              ctx.clearRect(0, 0, drawW, drawH);
          }

          if (videoSource.readyState >= 2) {
              const srcW = videoSource.videoWidth;
              const srcH = videoSource.videoHeight;

              if (srcW && srcH) {
                  if (videoSource.paused && !stream) videoSource.play().catch(() => {});
                  drawContent(srcW, srcH, videoSource);
              }
          }
      } else {
          // --- IMAGE / COLOR RENDERING ---
          ctx.clearRect(0, 0, w, h);
          
          // Apply filter to solid color too if image
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, w, h);

          if (type === 'image' && imageRef.current && imageRef.current.complete) {
              const img = imageRef.current;
              const srcW = img.naturalWidth;
              const srcH = img.naturalHeight;

              if (srcW && srcH) {
                  drawContent(srcW, srcH, img);
              }
          }
      }

      // --- APPLY WARMTH / TINT ---
      // We apply this as an overlay AFTER the filter but BEFORE scaling up
      if (vidSettings && vidSettings.enabled && vidSettings.warmth !== 0) {
          const warmth = vidSettings.warmth;
          ctx.filter = 'none'; // Ensure filter is off for overlay
          
          // Use 'overlay' or 'soft-light' for cinematic tint
          ctx.globalCompositeOperation = 'overlay';
          
          if (warmth > 0) {
              // Warm (Orange/Amber)
              ctx.fillStyle = `rgba(255, 150, 0, ${warmth * 0.3})`;
          } else {
              // Cool (Blue/Cyan)
              ctx.fillStyle = `rgba(0, 100, 255, ${Math.abs(warmth) * 0.3})`;
          }
          
          ctx.fillRect(0, 0, drawW, drawH);
          ctx.globalCompositeOperation = 'source-over'; // Reset
      }

      // Scale up if needed (Pixelation)
      if (scaleEffect > 1) {
          ctx.filter = 'none'; // Ensure no double filter
          ctx.drawImage(canvas, 0, 0, drawW, drawH, 0, 0, w, h);
      }
    };

    animationRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationRef.current);
  }, [type, url, stream, bgColor, effects, fitMode, alignment]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-0" />;
};

export default MediaRenderer;
