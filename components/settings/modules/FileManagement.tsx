
import React, { useRef } from 'react';
import { Image as ImageIcon, Music, FileArchive, Download, Check, X } from 'lucide-react';
import { Tooltip } from '../../ui/Tooltip';
import { useLanguage } from '../../../contexts/LanguageContext';
import { REQUIRED_SFX_FILES } from '../../../hooks/useSFX';

interface FileManagementProps {
  onBgMediaUpload: (files: FileList) => void;
  onAudioUpload: (files: FileList) => void;
  onSfxUpload?: (file: File) => void;
  onExportConfig: () => void;
  sfxMap?: Record<string, string>;
}

const FileManagement: React.FC<FileManagementProps> = ({
  onBgMediaUpload,
  onAudioUpload,
  onSfxUpload,
  onExportConfig,
  sfxMap
}) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const sfxInputRef = useRef<HTMLInputElement>(null);

  const getSfxTooltipContent = () => {
    if (!sfxMap) return t('load_sfx_zip');

    const missingFiles = REQUIRED_SFX_FILES.filter(requiredBase => {
        const found = Object.keys(sfxMap).some(uploadedFile => uploadedFile.startsWith(requiredBase));
        return !found;
    });

    const isComplete = missingFiles.length === 0 && Object.keys(sfxMap).length > 0;
    const isEmpty = Object.keys(sfxMap).length === 0;

    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
         <div className="flex items-center justify-between border-b border-theme-border pb-1 mb-1">
             <span className="text-theme-muted">STATUS:</span>
             <span className={`font-bold ${isComplete ? 'text-theme-accent' : isEmpty ? 'text-theme-muted' : 'text-yellow-500'}`}>
                {isComplete ? 'ACTIVE' : isEmpty ? 'EMPTY' : 'PARTIAL'}
             </span>
         </div>
         
         <div className="space-y-1">
            {REQUIRED_SFX_FILES.map(baseName => {
                const isFound = Object.keys(sfxMap).some(k => k.startsWith(baseName));
                return (
                    <div key={baseName} className="flex items-center gap-2 text-[9px]">
                        {isFound ? <Check size={10} className="text-theme-accent" /> : <X size={10} className="text-red-500" />}
                        <span className={isFound ? 'text-theme-text' : 'text-theme-muted line-through'}>{baseName}</span>
                    </div>
                );
            })}
         </div>

         {!isComplete && (
             <div className="text-[9px] text-theme-muted mt-1 italic border-t border-theme-border pt-1">
                 Required: wav/mp3/m4a with these names
             </div>
         )}
      </div>
    );
  };

  return (
    <div className="pt-2">
      <div className="grid grid-cols-4 gap-2">
          <Tooltip content="LOAD IMAGE/VIDEO" position="top">
            <button onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center justify-center p-2 bg-theme-panel border border-theme-border rounded text-theme-muted hover:text-theme-text hover:border-theme-accent transition-colors min-h-[50px]">
                <ImageIcon size={16} className="text-theme-accent mb-1" /> <span className="font-mono text-[9px]">IMG</span>
            </button>
          </Tooltip>
          
          <Tooltip content="LOAD AUDIO" position="top">
            <button id="tutorial-load-audio-btn" onClick={() => audioInputRef.current?.click()} className="w-full flex flex-col items-center justify-center p-2 bg-theme-panel border border-theme-border rounded text-theme-muted hover:text-theme-text hover:border-theme-primary transition-colors min-h-[50px]">
                <Music size={16} className="text-theme-primary mb-1" /> <span className="font-mono text-[9px]">AUDIO</span>
            </button>
          </Tooltip>
          
          {onSfxUpload && (
            <Tooltip content={getSfxTooltipContent()} position="top">
              <button onClick={() => sfxInputRef.current?.click()} className="w-full flex flex-col items-center justify-center p-2 bg-theme-panel border border-theme-border rounded text-theme-muted hover:text-theme-text hover:border-theme-secondary transition-colors min-h-[50px]">
                  <FileArchive size={16} className="text-theme-secondary mb-1" /> <span className="font-mono text-[9px]">SFX</span>
              </button>
            </Tooltip>
          )}

          <Tooltip content={t('export_config')} position="top">
            <button 
                onClick={onExportConfig} 
                className="w-full flex flex-col items-center justify-center p-2 bg-theme-panel border border-theme-border text-theme-muted rounded hover:bg-theme-secondary hover:text-black hover:border-theme-secondary transition-all min-h-[50px]"
            >
              <Download size={16} className="mb-1" /> <span className="font-mono text-[9px]">SAVE</span>
            </button>
          </Tooltip>
      </div>

      {/* Hidden File Inputs */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={e => {
            if(e.target.files && e.target.files.length > 0) {
                onBgMediaUpload(e.target.files);
                e.target.value = '';
            }
        }} 
        accept="image/*,video/*" 
        multiple
        className="hidden" 
      />
      <input 
        type="file" 
        ref={audioInputRef} 
        onChange={e => {
            if(e.target.files && e.target.files.length > 0) {
                onAudioUpload(e.target.files);
                e.target.value = '';
            }
        }} 
        accept="audio/*" 
        multiple
        className="hidden" 
      />
      <input 
        type="file" 
        ref={sfxInputRef} 
        onChange={e => {
            if(e.target.files && e.target.files.length > 0 && onSfxUpload) {
                onSfxUpload(e.target.files[0]);
                e.target.value = '';
            }
        }} 
        accept=".zip" 
        className="hidden" 
      />
    </div>
  );
};

export default FileManagement;
