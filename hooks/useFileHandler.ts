
import React, { useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';

interface UseFileHandlerProps {
  player: any;
  config: any;
  containerRef: React.RefObject<HTMLDivElement>;
  handleZipUpload: (file: File) => Promise<void>;
}

export const useFileHandler = ({ player, config, containerRef, handleZipUpload }: UseFileHandlerProps) => {
  const { addNotification } = useNotification();
  const [isDragging, setIsDragging] = useState(false);

  const handleFilesSelected = async (fileList: FileList) => {
    await player.processAudioFiles(Array.from(fileList));
    addNotification(`${fileList.length} tracks added`, "success");
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.dataTransfer.types.includes('Files')) return;
    const target = e.target as HTMLElement;
    if (target.closest('#tutorial-player')) {
        if (isDragging) setIsDragging(false);
        return;
    }
    if (!isDragging) setIsDragging(true);
  };

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.dataTransfer.types.includes('Files')) return;
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (containerRef.current) {
        const related = e.relatedTarget as Node;
        const isOutsideApp = !containerRef.current.contains(related);
        const isInsideControls = related && (related as Element).closest('#tutorial-player');
        if (isOutsideApp || isInsideControls) {
            setIsDragging(false);
        }
    }
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files) as File[];
    if (droppedFiles.length === 0) return;

    const nrpFiles = droppedFiles.filter(f => f.name.toLowerCase().endsWith('.nrp'));
    if (nrpFiles.length > 0) {
      config.importConfig(nrpFiles[0], (loadedConfig: any) => {
          if (loadedConfig.theme) config.setTheme(loadedConfig.theme); // Assumes config was passed with setTheme
          if (loadedConfig.controlStyle) config.setControlStyle(loadedConfig.controlStyle);
      });
      addNotification("Configuration Loaded", "success");
    }

    const audioFiles = droppedFiles.filter(f => f.type.startsWith('audio/'));
    const mediaFiles = droppedFiles.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    const zipFiles = droppedFiles.filter(f => f.name.toLowerCase().endsWith('.zip'));

    if (audioFiles.length > 0) {
        await player.processAudioFiles(audioFiles);
        addNotification(`${audioFiles.length} tracks added`, "success");
    }
    if (mediaFiles.length > 0) {
        await config.handleBgUpload(mediaFiles);
        addNotification(`${mediaFiles.length} backgrounds added`, "success");
    }
    if (zipFiles.length > 0) {
        await handleZipUpload(zipFiles[0]);
    }
  };

  return {
    isDragging,
    handleFilesSelected,
    onDragOver,
    onDragEnter,
    onDragLeave,
    onDrop
  };
};
