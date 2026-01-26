
import React, { useEffect, useState, useRef } from 'react';
import { EffectsConfig, HologramCategory } from '../../types';
import { messagesEn, messagesRu } from '../../data/messages';
import { useLanguage } from '../../contexts/LanguageContext';
import { MessageSquare, Heart, ThumbsUp, Smile, DollarSign, Music, Zap, Star, Ghost } from 'lucide-react';

interface HologramEffectProps {
  effects: EffectsConfig;
}

type AnimationPhase = 'spawn' | 'expandX' | 'expandY' | 'typing' | 'waiting' | 'collapseY' | 'collapseX' | 'despawn';

interface ActiveHologram {
  id: string;
  type: 'text' | 'icon';
  x: number;
  y: number;
  text: string;
  iconNode?: React.ReactNode;
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
const EXPAND_SPEED_X = 6; 
const EXPAND_SPEED_Y = 4; 
const FADE_SPEED = 0.02;  

const ICON_TYPES = [
    <Heart size={120} strokeWidth={1} />,
    <ThumbsUp size={120} strokeWidth={1} />,
    <Smile size={120} strokeWidth={1} />,
    <DollarSign size={120} strokeWidth={1} />,
    <Music size={120} strokeWidth={1} />,
    <Zap size={120} strokeWidth={1} />,
    <Star size={120} strokeWidth={1} />,
    <Ghost size={120} strokeWidth={1} />, // Proxy for "poop" or fun stuff
];

const HologramEffect: React.FC<HologramEffectProps> = ({ effects }) => {
  const [renderMessage, setRenderMessage] = useState<ActiveHologram | null>(null);
  const messageRef = useRef<ActiveHologram | null>(null);
  const { language } = useLanguage();
  const config = effects.holograms;
  const lastSpawnTime = useRef(0);
  
  const estimateHeight = (text: string) => {
      // Conservative estimation to ensure text fits
      const charsPerLine = 25; // Adjusted for word wrap (was 30)
      const lines = Math.ceil(text.length / charsPerLine);
      const lineHeight = 24; // Adjusted for leading-relaxed (was 20)
      const padding = 50; // Extra buffer at bottom (was 32)
      const minHeight = 120; // Increased min height (was 80)
      
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
      if (!messageRef.current) {
        if (timestamp - lastSpawnTime.current > config.interval * 1000) {
          
          // Decision Logic: Text vs Icon
          const spawnIcon = config.enableIcons && Math.random() > 0.6; // 40% chance for icons if enabled
          
          if (spawnIcon) {
              const randomIcon = ICON_TYPES[Math.floor(Math.random() * ICON_TYPES.length)];
              const x = 20 + Math.random() * 60; // Center biased
              const y = 20 + Math.random() * 40;

              const newMsg: ActiveHologram = {
                id: crypto.randomUUID(),
                type: 'icon',
                x,
                y,
                text: '',
                iconNode: randomIcon,
                phase: 'spawn',
                displayedText: "",
                opacity: 0,
                currentWidth: 0,
                currentHeight: 0,
                targetHeight: 0,
                timer: 0
              };
              messageRef.current = newMsg;
              setRenderMessage(newMsg);
              lastSpawnTime.current = timestamp;

          } else {
              // Standard Text Hologram
              const allMessages = language === 'ru' ? messagesRu : messagesEn;
              const enabledCategories = Object.entries(config.categories)
                 .filter(([_, enabled]) => enabled)
                 .map(([cat]) => cat as HologramCategory);
              
              const availableMessages = allMessages.filter(msg => enabledCategories.includes(msg.category));
              
              if (availableMessages.length > 0) {
                  const randomMsg = availableMessages[Math.floor(Math.random() * availableMessages.length)];
                  const x = 5 + Math.random() * 55; 
                  const y = 10 + Math.random() * 60;
                  const targetH = estimateHeight(randomMsg.text);

                  const newMsg: ActiveHologram = {
                    id: crypto.randomUUID(),
                    type: 'text',
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
        }
      } else {
        const msg = messageRef.current;
        let shouldUpdateRender = false;
        
        // --- ANIMATION LOGIC ---
        // For Icons, we skip the expansion/typing phases
        if (msg.type === 'icon') {
            switch (msg.phase) {
                case 'spawn':
                    msg.opacity += FADE_SPEED * 0.8;
                    if (msg.opacity >= 1) {
                        msg.opacity = 1;
                        msg.phase = 'waiting';
                        msg.timer = timestamp;
                    }
                    shouldUpdateRender = true;
                    break;
                case 'waiting':
                    // Float logic handled in CSS/Render, just wait here
                    if (timestamp - msg.timer > 3000) { 
                        msg.phase = 'despawn';
                    }
                    break;
                case 'despawn':
                    msg.opacity -= FADE_SPEED * 0.8;
                    shouldUpdateRender = true;
                    if (msg.opacity <= 0) {
                        messageRef.current = null;
                        setRenderMessage(null);
                        lastSpawnTime.current = timestamp;
                        shouldUpdateRender = false;
                    }
                    break;
            }
        } else {
            // Text Logic
            switch (msg.phase) {
                case 'spawn':
                    msg.opacity += FADE_SPEED;
                    if (msg.opacity >= 1) {
                        msg.opacity = 1;
                        msg.phase = 'expandX';
                    }
                    shouldUpdateRender = true;
                    break;
                case 'expandX':
                    msg.currentWidth += EXPAND_SPEED_X;
                    if (msg.currentWidth >= TARGET_WIDTH) {
                        msg.currentWidth = TARGET_WIDTH;
                        msg.phase = 'expandY';
                    }
                    shouldUpdateRender = true;
                    break;
                case 'expandY':
                    msg.currentHeight += EXPAND_SPEED_Y;
                    if (msg.currentHeight >= msg.targetHeight) {
                        msg.currentHeight = msg.targetHeight;
                        msg.phase = 'typing';
                        msg.timer = timestamp;
                    }
                    shouldUpdateRender = true;
                    break;
                case 'typing':
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
                    if (timestamp - msg.timer > 5000) { 
                        msg.phase = 'collapseY';
                    }
                    break;
                case 'collapseY':
                    msg.currentHeight -= EXPAND_SPEED_Y;
                    if (msg.currentHeight <= START_SIZE) {
                        msg.currentHeight = START_SIZE;
                        msg.phase = 'collapseX';
                    }
                    shouldUpdateRender = true;
                    break;
                case 'collapseX':
                    msg.currentWidth -= EXPAND_SPEED_X;
                    if (msg.currentWidth <= START_SIZE) {
                        msg.currentWidth = START_SIZE;
                        msg.phase = 'despawn';
                    }
                    shouldUpdateRender = true;
                    break;
                case 'despawn':
                    msg.opacity -= FADE_SPEED;
                    shouldUpdateRender = true;
                    if (msg.opacity <= 0) {
                        messageRef.current = null;
                        setRenderMessage(null);
                        lastSpawnTime.current = timestamp;
                        shouldUpdateRender = false;
                    }
                    break;
            }
        }

        if (shouldUpdateRender && messageRef.current) {
            setRenderMessage({ ...messageRef.current });
        }
      }
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [config.enabled, config.interval, config.speed, config.categories, config.enableIcons, language]);

  if (!renderMessage) return null;

  const scale = config.scale || 1.0;
  
  // Determine Dynamic Color
  const baseColor = (!config.color || config.color === 'theme') ? 'var(--color-primary)' : config.color;

  // --- ICON RENDER ---
  if (renderMessage.type === 'icon' && renderMessage.iconNode) {
      return (
        <div 
            className="absolute z-30 pointer-events-none flex items-center justify-center animate-pulse"
            style={{
                left: `${renderMessage.x}%`,
                top: `${renderMessage.y}%`,
                opacity: renderMessage.opacity * 0.6, // Low opacity as requested
                transform: `scale(${scale}) translateY(${renderMessage.phase === 'waiting' ? '-20px' : '0px'})`, 
                transition: 'transform 3s ease-in-out',
                color: baseColor,
                filter: `drop-shadow(0 0 10px ${baseColor})` // Tinted shadow
            }}
        >
            {renderMessage.iconNode}
        </div>
      );
  }

  // --- TEXT BOX RENDER ---
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
            className="relative overflow-hidden transition-none backdrop-blur-sm"
            style={{
                width: `${renderMessage.currentWidth}px`,
                height: `${renderMessage.currentHeight}px`,
                borderTopLeftRadius: '12px',
                borderBottomRightRadius: '12px',
                // Inline styles for dynamic coloring using color-mix for transparency
                backgroundColor: `color-mix(in srgb, ${baseColor}, transparent 90%)`,
                border: `1px solid color-mix(in srgb, ${baseColor}, transparent 40%)`,
                boxShadow: `0 0 15px color-mix(in srgb, ${baseColor}, transparent 70%)`
            }}
        >
            
            {/* Background Grid - Colored */}
            <div 
                className="absolute inset-0 bg-[length:100%_4px] pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(color-mix(in srgb, ${baseColor}, transparent 90%) 1px, transparent 1px)`
                }}
            ></div>
            
            {/* Decorative Corners - Colored */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l opacity-50" style={{ borderColor: baseColor }}></div>
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r opacity-50" style={{ borderColor: baseColor }}></div>
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l opacity-50" style={{ borderColor: baseColor }}></div>
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r opacity-50" style={{ borderColor: baseColor }}></div>

            {/* Header - Colored Background */}
            <div 
                className="flex items-center gap-3 overflow-hidden whitespace-nowrap"
                style={{ 
                    height: `${HEADER_HEIGHT}px`, 
                    paddingLeft: '10px', 
                    paddingRight: '10px',
                    backgroundColor: `color-mix(in srgb, ${baseColor}, transparent 80%)`,
                    borderBottom: `1px solid color-mix(in srgb, ${baseColor}, transparent 60%)`
                }}
            >
                <div className="min-w-[20px] flex items-center justify-center">
                    <MessageSquare size={16} style={{ color: baseColor }} className={`${renderMessage.phase === 'spawn' ? '' : 'animate-pulse'}`} />
                </div>
                
                <span 
                    className={`font-mono text-[10px] font-bold tracking-widest uppercase transition-opacity duration-200 ${showFullHeader ? 'opacity-100' : 'opacity-0'}`}
                    style={{ color: baseColor }}
                >
                    INCOMING TRANSMISSION
                </span>
            </div>

            {/* Content Body */}
            {showBody && (
                <div className="p-4 font-mono text-white text-sm leading-relaxed text-shadow-neon absolute top-[40px] left-0 right-0 bottom-0">
                    {renderMessage.displayedText}
                    {renderMessage.phase === 'typing' && (
                        <span 
                            className="animate-pulse inline-block w-2 h-4 ml-0.5 align-middle"
                            style={{ backgroundColor: baseColor }}
                        ></span>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export default HologramEffect;
