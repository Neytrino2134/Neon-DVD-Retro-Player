
import React, { useEffect, useState, useRef } from 'react';
import { EffectsConfig, HologramCategory } from '../../types';
import { messagesEn, messagesRu } from '../../data/messages';
import { useLanguage } from '../../contexts/LanguageContext';
import { MessageSquare } from 'lucide-react';

interface HologramEffectProps {
  effects: EffectsConfig;
}

type AnimationPhase = 'spawn' | 'expandX' | 'expandY' | 'typing' | 'waiting' | 'collapseY' | 'collapseX' | 'despawn';

interface ActiveHologram {
  id: string;
  x: number;
  y: number;
  text: string;
  phase: AnimationPhase;
  displayedText: string;
  opacity: number;
  
  // Animation dimensions
  currentWidth: number;
  currentHeight: number;
  targetHeight: number;
  
  // Timers
  timer: number;
}

const START_SIZE = 40; // Size of the initial cube
const TARGET_WIDTH = 280; // Full width of the window
const HEADER_HEIGHT = 40;

// NIRVANA MODE CONSTANTS (Very slow, smooth movement)
const EXPAND_SPEED_X = 6; // Reduced from 25
const EXPAND_SPEED_Y = 4; // Reduced from 15
const FADE_SPEED = 0.02;  // Reduced from 0.1 for very smooth fade

const HologramEffect: React.FC<HologramEffectProps> = ({ effects }) => {
  // State for rendering only
  const [renderMessage, setRenderMessage] = useState<ActiveHologram | null>(null);
  
  // Ref for animation loop logic
  const messageRef = useRef<ActiveHologram | null>(null);
  
  const { language, t } = useLanguage();
  const config = effects.holograms;
  
  const lastSpawnTime = useRef(0);
  
  // Helper to estimate height based on text
  const estimateHeight = (text: string) => {
      // Approximate chars per line for a 280px wide box with padding
      // Box width 280, Padding 16px*2 = 32. Content = 248.
      // Mono font ~8px width per char? Let's say 32 chars per line conservatively.
      const charsPerLine = 30; 
      const lines = Math.ceil(text.length / charsPerLine);
      const lineHeight = 20;
      const padding = 32; // Top+Bottom content padding
      const minHeight = 80;
      
      const contentHeight = (lines * lineHeight) + padding;
      return Math.max(minHeight, HEADER_HEIGHT + contentHeight);
  };

  useEffect(() => {
    if (!config.enabled) {
      messageRef.current = null;
      setRenderMessage(null);
      return;
    }

    let animationId: number;

    const loop = (timestamp: number) => {
      // 1. Spawning Logic
      if (!messageRef.current) {
        if (timestamp - lastSpawnTime.current > config.interval * 1000) {
          const allMessages = language === 'ru' ? messagesRu : messagesEn;
          
          const enabledCategories = Object.entries(config.categories)
             .filter(([_, enabled]) => enabled)
             .map(([cat]) => cat as HologramCategory);
          
          const availableMessages = allMessages.filter(msg => enabledCategories.includes(msg.category));
          
          if (availableMessages.length > 0) {
              const randomMsg = availableMessages[Math.floor(Math.random() * availableMessages.length)];
              
              // Random Position (safe zone: 10% to 60% to avoid overflow)
              // We constrain X so expanding to 280px doesn't clip off screen right
              // Screen width approx 100%. 280px is ~20-30% of screen. 
              // Safe X: 5% - 60%.
              
              const x = 5 + Math.random() * 55; 
              const y = 10 + Math.random() * 60;

              const targetH = estimateHeight(randomMsg.text);

              const newMsg: ActiveHologram = {
                id: crypto.randomUUID(),
                x,
                y,
                text: randomMsg.text,
                phase: 'spawn',
                displayedText: "",
                opacity: 0,
                currentWidth: START_SIZE,
                currentHeight: START_SIZE,
                targetHeight: targetH,
                timer: 0
              };
              
              messageRef.current = newMsg;
              setRenderMessage(newMsg);
          }
          lastSpawnTime.current = timestamp;
        }
      } else {
        // 2. Animation Logic
        const msg = messageRef.current;
        let shouldUpdateRender = false;
        
        switch (msg.phase) {
            case 'spawn':
                // Fade in cube slowly
                msg.opacity += FADE_SPEED;
                if (msg.opacity >= 1) {
                    msg.opacity = 1;
                    msg.phase = 'expandX';
                }
                shouldUpdateRender = true;
                break;
            
            case 'expandX':
                // Expand horizontally to bar
                msg.currentWidth += EXPAND_SPEED_X;
                if (msg.currentWidth >= TARGET_WIDTH) {
                    msg.currentWidth = TARGET_WIDTH;
                    msg.phase = 'expandY';
                }
                shouldUpdateRender = true;
                break;

            case 'expandY':
                // Expand vertically to window
                msg.currentHeight += EXPAND_SPEED_Y;
                if (msg.currentHeight >= msg.targetHeight) {
                    msg.currentHeight = msg.targetHeight;
                    msg.phase = 'typing';
                    msg.timer = timestamp;
                }
                shouldUpdateRender = true;
                break;

            case 'typing':
                // Type Text - Slower base speed (120 instead of 80)
                const charDelay = 120 / (config.speed || 1);
                if (timestamp - msg.timer > charDelay) {
                    if (msg.displayedText.length < msg.text.length) {
                        msg.displayedText = msg.text.substring(0, msg.displayedText.length + 1);
                        msg.timer = timestamp;
                        shouldUpdateRender = true;
                    } else {
                        msg.phase = 'waiting';
                        msg.timer = timestamp;
                    }
                }
                break;

            case 'waiting':
                // Wait before closing - Increased to 5s for nirvana reading time
                if (timestamp - msg.timer > 5000) { 
                    msg.phase = 'collapseY';
                }
                break;

            case 'collapseY':
                // Shrink vertically
                msg.currentHeight -= EXPAND_SPEED_Y;
                if (msg.currentHeight <= START_SIZE) {
                    msg.currentHeight = START_SIZE;
                    msg.phase = 'collapseX';
                }
                shouldUpdateRender = true;
                break;

            case 'collapseX':
                // Shrink horizontally
                msg.currentWidth -= EXPAND_SPEED_X;
                if (msg.currentWidth <= START_SIZE) {
                    msg.currentWidth = START_SIZE;
                    msg.phase = 'despawn';
                }
                shouldUpdateRender = true;
                break;

            case 'despawn':
                // Fade out slowly
                msg.opacity -= FADE_SPEED;
                shouldUpdateRender = true;
                if (msg.opacity <= 0) {
                    messageRef.current = null;
                    setRenderMessage(null);
                    lastSpawnTime.current = timestamp;
                    shouldUpdateRender = false; // Handled by setRenderMessage(null)
                }
                break;
        }

        if (shouldUpdateRender && messageRef.current) {
            setRenderMessage({ ...messageRef.current });
        }
      }

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [config.enabled, config.interval, config.speed, config.categories, language]);

  if (!renderMessage) return null;

  const scale = config.scale || 1.0;
  
  // Determine if we show the full header content or just icon
  const showFullHeader = renderMessage.currentWidth > 100;
  const showBody = renderMessage.currentHeight > HEADER_HEIGHT + 10;

  return (
    <div 
      className="absolute z-30 pointer-events-none"
      style={{
        left: `${renderMessage.x}%`,
        top: `${renderMessage.y}%`,
        opacity: renderMessage.opacity * config.opacity,
        transform: `scale(${scale})`, 
        transformOrigin: 'top left',
      }}
    >
        {/* Hologram Box Container */}
        <div 
            className="relative bg-neon-blue/10 backdrop-blur-sm border border-neon-blue/60 shadow-[0_0_15px_rgba(0,243,255,0.3)] overflow-hidden transition-none"
            style={{
                width: `${renderMessage.currentWidth}px`,
                height: `${renderMessage.currentHeight}px`,
                borderTopLeftRadius: '12px',
                borderBottomRightRadius: '12px'
            }}
        >
            
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.1)_1px,transparent_1px)] bg-[length:100%_4px] pointer-events-none"></div>
            
            {/* Decorative Corners */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-white/50"></div>
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-white/50"></div>
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-white/50"></div>
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-white/50"></div>

            {/* Header */}
            <div 
                className="flex items-center gap-3 bg-neon-blue/20 border-b border-neon-blue/40 overflow-hidden whitespace-nowrap"
                style={{ height: `${HEADER_HEIGHT}px`, paddingLeft: '10px', paddingRight: '10px' }}
            >
                <div className="min-w-[20px] flex items-center justify-center">
                    <MessageSquare size={16} className={`text-neon-blue ${renderMessage.phase === 'spawn' ? '' : 'animate-pulse'}`} />
                </div>
                
                <span 
                    className={`font-mono text-[10px] font-bold text-neon-blue tracking-widest uppercase transition-opacity duration-200 ${showFullHeader ? 'opacity-100' : 'opacity-0'}`}
                >
                    {t('hologram_incoming')}
                </span>
            </div>

            {/* Content Body */}
            {showBody && (
                <div className="p-4 font-mono text-white text-sm leading-relaxed text-shadow-neon absolute top-[40px] left-0 right-0 bottom-0">
                    {renderMessage.displayedText}
                    {renderMessage.phase === 'typing' && (
                        <span className="animate-pulse inline-block w-2 h-4 bg-neon-blue ml-0.5 align-middle"></span>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export default HologramEffect;
