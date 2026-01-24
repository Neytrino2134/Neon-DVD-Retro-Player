
import React, { useState, useEffect } from 'react';
import { X, Folder, FileMusic, FileImage, FileVideo, CornerLeftUp, HardDrive } from 'lucide-react';
import { CATALOG_ROOT, CatalogItem } from '../data/catalog';

interface FileExplorerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'music' | 'background';
  onSelect: (items: CatalogItem[]) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ isOpen, onClose, mode, onSelect }) => {
  // 1. Calculate constants (Derived state)
  const rootDir: CatalogItem = CATALOG_ROOT.length === 1 && CATALOG_ROOT[0].name.includes('C:') 
    ? CATALOG_ROOT[0] 
    : { name: 'ROOT', type: 'dir', children: CATALOG_ROOT };

  // 2. Define ALL Hooks (MUST be before any return statement)
  const [directoryStack, setDirectoryStack] = useState<CatalogItem[]>([rootDir]);
  const [selectedItems, setSelectedItems] = useState<Set<CatalogItem>>(new Set());

  // 3. Effects
  useEffect(() => {
    if (isOpen) {
      setDirectoryStack([rootDir]);
      setSelectedItems(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // 4. Conditional Rendering (Now it's safe)
  if (!isOpen) return null;

  // 5. Component Logic
  const activeDir = directoryStack[directoryStack.length - 1];

  const handleEnter = (item: CatalogItem) => {
    if (item.type === 'dir') {
      setDirectoryStack([...directoryStack, item]);
      if (mode === 'background') setSelectedItems(new Set());
    } else {
      toggleSelection(item);
    }
  };

  const handleUp = () => {
    if (directoryStack.length > 1) {
      const newStack = [...directoryStack];
      newStack.pop();
      setDirectoryStack(newStack);
    }
  };

  const toggleSelection = (item: CatalogItem) => {
    if (mode === 'background') {
       // Single select for background
       if (item.type !== 'image' && item.type !== 'video') return;
       const newSet = new Set<CatalogItem>();
       newSet.add(item);
       setSelectedItems(newSet);
    } else {
        // Multi select for music
        if (item.type !== 'audio') return;
        const newSet = new Set(selectedItems);
        if (newSet.has(item)) newSet.delete(item);
        else newSet.add(item);
        setSelectedItems(newSet);
    }
  };
  
  const selectAllInFolder = () => {
      if (!activeDir.children) return;
      const newSet = new Set(selectedItems);
      activeDir.children.forEach(child => {
          if (child.type === 'audio') newSet.add(child);
      });
      setSelectedItems(newSet);
  }

  const handleConfirm = () => {
    onSelect(Array.from(selectedItems));
    onClose();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'dir': return <Folder size={18} className="text-yellow-400" />;
      case 'audio': return <FileMusic size={18} className="text-neon-pink" />;
      case 'image': return <FileImage size={18} className="text-neon-blue" />;
      case 'video': return <FileVideo size={18} className="text-neon-purple" />;
      default: return <HardDrive size={18} className="text-gray-400" />;
    }
  };

  const displayedItems = activeDir.children?.filter(item => {
     if (item.type === 'dir') return true;
     if (mode === 'music') return item.type === 'audio';
     if (mode === 'background') return item.type === 'image' || item.type === 'video';
     return false;
  }) || [];

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl h-[80vh] bg-gray-900 border-2 border-neon-green shadow-[0_0_30px_rgba(0,255,0,0.2)] flex flex-col rounded overflow-hidden font-mono animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-neon-green/20 border-b border-neon-green p-2 flex justify-between items-center select-none">
          <div className="flex items-center gap-2 text-neon-green">
            <HardDrive size={20} />
            <span className="font-bold tracking-wider">FILE COMMANDER v1.0</span>
          </div>
          <button onClick={onClose} className="text-neon-green hover:bg-neon-green hover:text-black p-1 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Path Bar */}
        <div className="bg-black border-b border-gray-800 p-2 text-neon-green/80 flex items-center gap-2 overflow-hidden whitespace-nowrap">
           <span className="text-yellow-500">PATH{'>'}</span> 
           {directoryStack.map(d => d.name).join('\\')}
        </div>

        {/* Main Area */}
        <div className="flex-1 bg-black p-4 overflow-y-auto custom-scrollbar">
           {directoryStack.length > 1 && (
             <div 
               onClick={handleUp}
               className="flex items-center gap-3 p-2 text-yellow-400 hover:bg-neon-green/20 cursor-pointer border border-transparent hover:border-neon-green/50 mb-1"
             >
               <CornerLeftUp size={18} />
               <span>.. [PARENT DIRECTORY]</span>
             </div>
           )}

           {displayedItems.length === 0 ? (
               <div className="text-gray-600 italic p-4 text-center">-- EMPTY FOLDER --</div>
           ) : (
               displayedItems.map((item, idx) => (
                 <div
                   key={idx}
                   onClick={() => handleEnter(item)}
                   className={`
                     flex items-center gap-3 p-2 cursor-pointer border border-transparent transition-all mb-1
                     ${selectedItems.has(item) ? 'bg-neon-green/30 border-neon-green' : 'hover:bg-gray-800 hover:border-gray-700'}
                   `}
                 >
                   {getIcon(item.type)}
                   <span className={`flex-1 truncate ${item.type === 'dir' ? 'text-white font-bold' : 'text-gray-300'}`}>
                     {item.name}
                   </span>
                   {selectedItems.has(item) && <span className="text-neon-green text-xs">[SELECTED]</span>}
                   {item.type === 'dir' && <span className="text-gray-500 text-xs text-right w-16">&lt;DIR&gt;</span>}
                 </div>
               ))
           )}
        </div>

        {/* Footer */}
        <div className="bg-gray-900 border-t border-neon-green p-3 flex justify-between items-center">
           <div className="text-xs text-gray-400">
              {selectedItems.size} ITEM(S) SELECTED
           </div>
           <div className="flex gap-2">
             {mode === 'music' && (
                 <button 
                   onClick={selectAllInFolder}
                   className="px-4 py-2 text-xs border border-gray-600 text-gray-400 hover:text-white hover:border-white transition-colors"
                 >
                   SELECT ALL
                 </button>
             )}
             <button
               onClick={handleConfirm}
               disabled={selectedItems.size === 0}
               className={`
                 px-6 py-2 text-sm font-bold border-2 transition-all shadow-[0_0_10px_transparent]
                 ${selectedItems.size > 0 
                    ? 'border-neon-green text-neon-green hover:bg-neon-green hover:text-black hover:shadow-[0_0_20px_#00ff00]' 
                    : 'border-gray-700 text-gray-700 cursor-not-allowed'}
               `}
             >
               {mode === 'music' ? 'LOAD' : 'APPLY'}
             </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default FileExplorer;
