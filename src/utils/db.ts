
import { AudioTrack, VisualizerConfig } from '../types';

const DB_NAME = 'NeonPlayerDB';
const DB_VERSION = 1;
const STORE_TRACKS = 'tracks';
const STORE_MEDIA = 'media';

// --- IndexedDB for Files (Blobs) ---

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_MEDIA)) {
        db.createObjectStore(STORE_MEDIA, { keyPath: 'key' });
      }
    };
  });
};

export const saveTracksToDB = async (tracks: AudioTrack[]) => {
  const db = await initDB();
  const tx = db.transaction(STORE_TRACKS, 'readwrite');
  const store = tx.objectStore(STORE_TRACKS);
  
  // Clear existing
  await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
  });

  // Add all
  for (const track of tracks) {
    if (track.file) {
        // It's a user uploaded file
        store.put({
            id: track.id,
            name: track.name,
            file: track.file,
            type: 'local'
        });
    } else {
        // It's a library asset (just save the URL/Path)
        store.put({
            id: track.id,
            name: track.name,
            url: track.url,
            type: 'library'
        });
    }
  }
  
  return tx.oncomplete;
};

export const loadTracksFromDB = async (): Promise<AudioTrack[]> => {
  const db = await initDB();
  const tx = db.transaction(STORE_TRACKS, 'readonly');
  const store = tx.objectStore(STORE_TRACKS);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const records = request.result;
      if (!records) {
          resolve([]);
          return;
      }
      const tracks: AudioTrack[] = records.map((rec: any) => {
          if (rec.type === 'local' && rec.file) {
              return {
                  id: rec.id,
                  name: rec.name,
                  file: rec.file,
                  url: URL.createObjectURL(rec.file)
              };
          } else {
              return {
                  id: rec.id,
                  name: rec.name,
                  url: rec.url,
                  isLibraryAsset: true
              };
          }
      });
      resolve(tracks);
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveBackgroundToDB = async (type: 'image' | 'video', file: File) => {
  const db = await initDB();
  const tx = db.transaction(STORE_MEDIA, 'readwrite');
  const store = tx.objectStore(STORE_MEDIA);
  store.put({ key: 'background', type, file, source: 'local' });
};

export const saveLibraryBackgroundToDB = async (type: 'image' | 'video', url: string) => {
    const db = await initDB();
    const tx = db.transaction(STORE_MEDIA, 'readwrite');
    const store = tx.objectStore(STORE_MEDIA);
    store.put({ key: 'background', type, url, source: 'library' });
};

export const loadBackgroundFromDB = async (): Promise<{ type: 'image' | 'video', url: string, file?: File } | null> => {
  const db = await initDB();
  const tx = db.transaction(STORE_MEDIA, 'readonly');
  const store = tx.objectStore(STORE_MEDIA);
  const request = store.get('background');

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const result = request.result;
      if (result) {
        if (result.source === 'local' && result.file) {
            resolve({
                type: result.type,
                file: result.file,
                url: URL.createObjectURL(result.file)
            });
        } else {
            resolve({
                type: result.type,
                url: result.url
            });
        }
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const clearBackgroundFromDB = async () => {
    const db = await initDB();
    const tx = db.transaction(STORE_MEDIA, 'readwrite');
    const store = tx.objectStore(STORE_MEDIA);
    store.delete('background');
};

// --- LocalStorage for Settings ---

const KEY_SETTINGS = 'neon_player_settings';

interface AppSettings {
  volume: number;
  showVisualizer: boolean;
  showDvd: boolean;
  visualizerConfig: VisualizerConfig;
  bgColor: string;
}

export const saveSettings = (settings: AppSettings) => {
  try {
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings to LocalStorage", e);
  }
};

export const loadSettings = (): AppSettings | null => {
  try {
    const data = localStorage.getItem(KEY_SETTINGS);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Failed to load settings", e);
    return null;
  }
};
