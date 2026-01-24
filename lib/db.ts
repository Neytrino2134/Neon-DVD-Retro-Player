
/**
 * Simple IndexedDB wrapper for storing File/Blob objects
 */
const DB_NAME = 'NeonPlayerDB';
const DB_VERSION = 1;
const STORES = {
  TRACKS: 'tracks',
  BACKGROUND: 'background'
};

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.TRACKS)) {
        db.createObjectStore(STORES.TRACKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.BACKGROUND)) {
        db.createObjectStore(STORES.BACKGROUND, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveTrack = async (track: { id: string; name: string; file: File }) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORES.TRACKS, 'readwrite');
    const store = transaction.objectStore(STORES.TRACKS);
    const request = store.put(track);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllTracks = async (): Promise<{ id: string; name: string; file: File }[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.TRACKS, 'readonly');
    const store = transaction.objectStore(STORES.TRACKS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveBackground = async (media: { id: string; type: 'image' | 'video'; file: File }) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORES.BACKGROUND, 'readwrite');
    const store = transaction.objectStore(STORES.BACKGROUND);
    // Clear previous background
    store.clear().onsuccess = () => {
        const request = store.put(media);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    };
  });
};

export const getBackground = async (): Promise<{ id: string; type: 'image' | 'video'; file: File } | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.BACKGROUND, 'readonly');
    const store = transaction.objectStore(STORES.BACKGROUND);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result[0] || null);
    request.onerror = () => reject(request.error);
  });
};

export const clearBackground = async () => {
  const db = await initDB();
  const transaction = db.transaction(STORES.BACKGROUND, 'readwrite');
  transaction.objectStore(STORES.BACKGROUND).clear();
};
