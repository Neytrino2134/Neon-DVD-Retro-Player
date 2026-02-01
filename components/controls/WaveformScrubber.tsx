
import React, { useRef, useState, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface WaveformScrubberProps { 
    currentTime: number;
    duration: number;
    onSeek: (time: number) => void;
    trackId?: string;
    isLocked?: boolean; // Unused but kept for prop compatibility if needed
}

export const WaveformScrubber: React.FC<WaveformScrubberProps> = ({ currentTime, duration, onSeek, trackId }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { colors } = useTheme();
    const [isHovering, setIsHovering] = useState(false);

    const bars = useMemo(() => {
        const seed = trackId ? trackId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
        const count = 60; 
        const generated = [];
        for(let i=0; i<count; i++) {
            const x = Math.sin(seed + i * 0.5) * 10000;
            const rand = x - Math.floor(x); 
            generated.push(0.2 + (rand * 0.8));
        }
        return generated;
    }, [trackId]);

    const handleClick = (e: React.MouseEvent) => {
        if (!containerRef.current || duration <= 0) return;
        const rect = containerRef.current.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        onSeek(Math.max(0, Math.min(duration, percent * duration)));
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (e.buttons === 1) handleClick(e); 
    };

    const progressPercent = duration > 0 ? (currentTime / duration) : 0;

    return (
        <div 
            ref={containerRef}
            className="relative h-full w-full group flex items-center gap-0.5 cursor-pointer"
            onMouseDown={handleClick}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {bars.map((height, i) => {
                const barPos = i / bars.length;
                const isPast = barPos <= progressPercent;
                
                return (
                    <div 
                        key={i}
                        className="flex-1 rounded-full transition-all duration-75"
                        style={{
                            height: `${height * 100}%`,
                            // Restrained colors: Primary for active, very dim gray for inactive
                            backgroundColor: isPast ? colors.primary : (isHovering ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'),
                            boxShadow: isPast ? `0 0 5px ${colors.primary}` : 'none',
                            opacity: isPast ? 0.8 : 1 // Less glare
                        }}
                    />
                );
            })}
        </div>
    );
};
