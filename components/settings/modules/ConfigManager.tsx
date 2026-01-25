
import React, { useState } from 'react';
import { Save, FolderOpen, Trash2, Edit2, Check, X } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { AppPreset } from '../../../types';

interface ConfigManagerProps {
  presets: AppPreset[];
  onSave: (name: string) => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

const ConfigManager: React.FC<ConfigManagerProps> = ({ presets, onSave, onLoad, onDelete, onRename }) => {
  const { t } = useLanguage();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleSave = () => {
    if (!newName.trim()) return;
    onSave(newName);
    setNewName('');
  };

  const startEditing = (preset: AppPreset) => {
    setEditingId(preset.id);
    setEditName(preset.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEditing = (id: string) => {
    if (!editName.trim()) return;
    onRename(id, editName);
    setEditingId(null);
  };

  return (
    <div className="pt-2">
      {/* Save Input */}
      <div className="flex gap-2 mb-4 bg-black/40 p-2 rounded border border-gray-700">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t('preset_name')}
          className="flex-1 bg-transparent border-b border-gray-600 focus:border-neon-blue outline-none text-xs font-mono text-white placeholder-gray-600 px-1"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button
          onClick={handleSave}
          disabled={!newName.trim()}
          className="flex items-center gap-1 px-3 py-1 bg-neon-blue/10 border border-neon-blue text-neon-blue rounded text-[10px] font-bold tracking-wider hover:bg-neon-blue hover:text-black disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-neon-blue transition-all"
        >
          <Save size={12} /> {t('save_preset')}
        </button>
      </div>

      {/* Preset List */}
      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
        {presets.length === 0 && (
          <div className="text-center text-gray-600 text-[10px] font-mono py-4 italic">
            {t('no_presets')}
          </div>
        )}
        
        {presets.map((preset) => (
          <div 
            key={preset.id} 
            className="flex items-center justify-between p-2 bg-gray-800/40 border border-gray-700/50 rounded group hover:border-gray-600 transition-colors"
          >
            {editingId === preset.id ? (
              <div className="flex flex-1 items-center gap-2 mr-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 bg-black/50 border border-neon-purple rounded px-2 py-0.5 text-xs text-white font-mono focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEditing(preset.id);
                    if (e.key === 'Escape') cancelEditing();
                  }}
                />
                <button onClick={() => saveEditing(preset.id)} className="text-neon-green hover:scale-110">
                  <Check size={14} />
                </button>
                <button onClick={cancelEditing} className="text-red-500 hover:scale-110">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex-1 min-w-0 mr-2">
                <div className="text-xs font-mono text-gray-300 truncate font-bold group-hover:text-white transition-colors">
                  {preset.name}
                </div>
                <div className="text-[9px] text-gray-600 font-mono">
                  {new Date(preset.createdAt).toLocaleDateString()}
                </div>
              </div>
            )}

            {editingId !== preset.id && (
              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                 <button 
                  onClick={() => onLoad(preset.id)}
                  title={t('load')}
                  className="p-1.5 hover:bg-neon-green/20 hover:text-neon-green rounded transition-colors"
                >
                  <FolderOpen size={12} />
                </button>
                <button 
                  onClick={() => startEditing(preset)}
                  title={t('rename')}
                  className="p-1.5 hover:bg-neon-purple/20 hover:text-neon-purple rounded transition-colors"
                >
                  <Edit2 size={12} />
                </button>
                <button 
                  onClick={() => onDelete(preset.id)}
                  title={t('delete')}
                  className="p-1.5 hover:bg-red-500/20 hover:text-red-500 rounded transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConfigManager;
