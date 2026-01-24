
// This file acts as the "File System" for your public assets.
// Since the browser cannot scan directories, you must list your files here.

export type FileType = 'dir' | 'audio' | 'image' | 'video';

export interface CatalogItem {
  name: string;
  type: FileType;
  path?: string; // Full public path (e.g., '/Music/Album1/song.mp3')
  children?: CatalogItem[]; // For directories
}

export const CATALOG_ROOT: CatalogItem[] = [
  {
    name: 'C: (SYSTEM)',
    type: 'dir',
    children: [
      {
        name: 'Backgrounds',
        type: 'dir',
        children: [
          {
            name: 'Images',
            type: 'dir',
            children: [
              // Example items - replace with your real files
              { name: 'cyber_city.jpg', type: 'image', path: '/Backgrounds/image_backgrounds/cyber_city.jpg' },
              { name: 'neon_grid.png', type: 'image', path: '/Backgrounds/image_backgrounds/neon_grid.png' },
            ]
          },
          {
            name: 'Videos',
            type: 'dir',
            children: [
              // Example items - replace with your real files
              { name: 'loop_tunnel.mp4', type: 'video', path: '/Backgrounds/video_backgrounds/loop_tunnel.mp4' },
            ]
          }
        ]
      },
      {
        name: 'Music',
        type: 'dir',
        children: [
          {
            name: 'Synthwave Vol.1',
            type: 'dir',
            children: [
               // Example items
               { name: 'Neon_Nights.mp3', type: 'audio', path: '/Music/Synthwave/Neon_Nights.mp3' },
               { name: 'Retro_Racer.mp3', type: 'audio', path: '/Music/Synthwave/Retro_Racer.mp3' },
            ]
          },
          {
            name: 'Cyberpunk Vibes',
            type: 'dir',
            children: [
                { name: 'Mainframe_Hack.mp3', type: 'audio', path: '/Music/Synthwave/Mainframe_Hack.mp3' },
            ]
          }
        ]
      }
    ]
  }
];
