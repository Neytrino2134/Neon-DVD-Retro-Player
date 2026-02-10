
import React, { useState } from 'react';
import { Key, Link, Unlink, Youtube } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { YouTubeAuthConfig } from '../../../types';

interface YouTubeAuthSettingsProps {
  config: YouTubeAuthConfig;
  setYouTubeConfig: (config: YouTubeAuthConfig) => void;
}

const YouTubeAuthSettings: React.FC<YouTubeAuthSettingsProps> = ({ config, setYouTubeConfig }) => {
  const { t } = useLanguage();
  // Safe access with optional chaining and fallback
  const [clientIdInput, setClientIdInput] = useState(config?.clientId || '');

  // Render guard if config is missing
  if (!config) return null;

  const handleConnect = () => {
      // Mock connection for UI demo, real auth logic will be implemented later
      if (clientIdInput.trim()) {
          setYouTubeConfig({
              ...config,
              clientId: clientIdInput,
              isConnected: true,
              channelName: 'Demo Channel' // Placeholder
          });
      }
  };

  const handleDisconnect = () => {
      setYouTubeConfig({
          ...config,
          isConnected: false,
          channelName: undefined
      });
  };

  return (
    <div className="pt-2">
       {/* CLIENT ID INPUT */}
       <div className="mb-4 bg-black/20 p-2 rounded border border-theme-border">
          <label className="text-theme-text font-mono text-[10px] block mb-2 tracking-widest uppercase opacity-70 flex items-center gap-2">
             <Key size={12} /> {t('yt_client_id')}
          </label>
          <input 
             type="text" 
             value={clientIdInput}
             onChange={(e) => setClientIdInput(e.target.value)}
             placeholder="Enter Google Client ID"
             disabled={config.isConnected}
             className={`w-full bg-black/50 border-b border-theme-muted/50 focus:border-theme-primary outline-none text-xs font-mono text-theme-text placeholder-theme-muted/30 px-1 py-1 transition-colors ${config.isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
       </div>

       {/* CONNECT/DISCONNECT BUTTONS */}
       {!config.isConnected ? (
           <button 
               onClick={handleConnect}
               disabled={!clientIdInput.trim()}
               className="w-full py-3 bg-red-600/10 border border-red-500 text-red-500 hover:bg-red-600 hover:text-white transition-all rounded font-mono text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
           >
               <Link size={14} /> {t('yt_connect_btn')}
           </button>
       ) : (
           <div className="space-y-3">
               <div className="flex items-center justify-between bg-theme-panel p-2 rounded border border-theme-primary/50">
                   <div className="flex items-center gap-2">
                       <Youtube size={16} className="text-red-500" />
                       <div className="flex flex-col">
                           <span className="text-[9px] text-theme-muted uppercase">{t('yt_channel')}</span>
                           <span className="text-xs font-bold text-white">{config.channelName || 'Unknown'}</span>
                       </div>
                   </div>
                   <div className="px-2 py-0.5 bg-green-500/20 text-green-500 text-[9px] font-bold rounded border border-green-500/50">
                       {t('yt_connected')}
                   </div>
               </div>
               
               <button 
                   onClick={handleDisconnect}
                   className="w-full py-2 bg-theme-panel border border-theme-border text-theme-muted hover:text-red-500 hover:border-red-500 transition-all rounded font-mono text-xs font-bold flex items-center justify-center gap-2"
               >
                   <Unlink size={14} /> {t('yt_disconnect_btn')}
               </button>
           </div>
       )}
    </div>
  );
};

export default YouTubeAuthSettings;
