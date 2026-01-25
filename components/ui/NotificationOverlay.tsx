
import React, { useEffect, useState } from 'react';
import { Terminal } from 'lucide-react';
import { useNotification, Notification } from '../../contexts/NotificationContext';

const NotificationItem: React.FC<{ notification: Notification, onDismiss: (id: string) => void }> = ({ notification, onDismiss }) => {
  // Phases: 'spawn' (line only) -> 'expand' (slide open) -> 'type' (text) -> 'wait' -> 'untype' -> 'collapse' -> 'done'
  const [phase, setPhase] = useState<'spawn' | 'expand' | 'type' | 'wait' | 'untype' | 'collapse' | 'done'>('spawn');
  const [displayedText, setDisplayedText] = useState('');
  
  const EXPAND_DURATION = 500;
  const COLLAPSE_DURATION = 500;
  const TYPE_SPEED = 30; // ms per char
  const WAIT_DURATION = 3000;
  const UNTYPE_SPEED = 15;

  useEffect(() => {
    // Start animation sequence after mount
    const t = setTimeout(() => setPhase('expand'), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let t: number;
    let interval: number | undefined;

    if (phase === 'expand') {
        // Wait for CSS slide transition to finish before typing
        t = window.setTimeout(() => setPhase('type'), EXPAND_DURATION);
    } else if (phase === 'type') {
        let cursor = 0;
        const text = notification.message;
        interval = window.setInterval(() => {
            cursor++;
            setDisplayedText(text.slice(0, cursor));
            if (cursor >= text.length) {
                if (interval) clearInterval(interval);
                setPhase('wait');
            }
        }, TYPE_SPEED);
    } else if (phase === 'wait') {
        t = window.setTimeout(() => setPhase('untype'), WAIT_DURATION);
    } else if (phase === 'untype') {
        let cursor = notification.message.length;
        interval = window.setInterval(() => {
            cursor--;
            setDisplayedText(notification.message.slice(0, cursor));
            if (cursor <= 0) {
                if (interval) clearInterval(interval);
                setPhase('collapse');
            }
        }, UNTYPE_SPEED);
    } else if (phase === 'collapse') {
        t = window.setTimeout(() => onDismiss(notification.id), COLLAPSE_DURATION);
    }

    return () => {
        if (t) clearTimeout(t);
        if (interval) clearInterval(interval);
    };
  }, [phase, notification.message, onDismiss]);

  return (
    <div 
      className={`
        relative mb-2 
        bg-black/90 border-l-4 border-neon-green 
        shadow-[0_0_15px_rgba(0,255,0,0.2)]
        overflow-hidden
        transition-all duration-500 ease-in-out
        flex items-center
      `}
      style={{
        maxWidth: (phase === 'spawn' || phase === 'collapse') ? '4px' : '320px',
        opacity: 1,
        minHeight: '44px' // Fixed height ensures the "line" look works well
      }}
    >
      {/* Content Container - Fixed width prevents text reflow during slide */}
      <div className="flex items-center pl-3 pr-4 py-2 min-w-[320px]">
        <Terminal size={14} className="text-neon-green mr-2 shrink-0" />
        <span className="font-mono text-xs font-bold text-neon-green tracking-wide">
          {displayedText}
          {(phase === 'type' || phase === 'wait' || phase === 'untype') && (
             <span className="inline-block w-2 h-4 bg-neon-green ml-1 align-middle animate-pulse"></span>
          )}
        </span>
      </div>
    </div>
  );
};

const NotificationOverlay: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="absolute top-6 left-6 flex flex-col items-start gap-2 pointer-events-none z-[99999] w-auto">
      {notifications.map((n) => (
        <NotificationItem 
          key={n.id} 
          notification={n} 
          onDismiss={removeNotification} 
        />
      ))}
    </div>
  );
};

export default NotificationOverlay;
