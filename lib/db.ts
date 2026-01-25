
/**
 * Simple IndexedDB wrapper for storing File/Blob objects
 */
const DB_NAME = 'NeonPlayerDB';
const DB_VERSION = 2; // Incremented version for schema change
const STORES = {
  TRACKS: 'tracks',
  BACKGROUND: 'background',
  SFX: 'sfx'
};

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (_e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.TRACKS)) {
        db.createObjectStore(STORES.TRACKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.BACKGROUND)) {
        db.createObjectStore(STORES.BACKGROUND, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.SFX)) {
        db.createObjectStore(STORES.SFX, { keyPath: 'id' });
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

export const clearTracks = async () => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORES.TRACKS, 'readwrite');
    const store = transaction.objectStore(STORES.TRACKS);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// --- BACKGROUND FUNCTIONS ---

export const saveBackground = async (media: { id: string; type: 'image' | 'video'; file: File }) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORES.BACKGROUND, 'readwrite');
    const store = transaction.objectStore(STORES.BACKGROUND);
    // Note: We no longer clear here to allow multiple uploads
    const request = store.put(media);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteBackground = async (id: string) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORES.BACKGROUND, 'readwrite');
    const store = transaction.objectStore(STORES.BACKGROUND);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllBackgrounds = async (): Promise<{ id: string; type: 'image' | 'video'; file: File }[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.BACKGROUND, 'readonly');
    const store = transaction.objectStore(STORES.BACKGROUND);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const clearBackgrounds = async () => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORES.BACKGROUND, 'readwrite');
    const store = transaction.objectStore(STORES.BACKGROUND);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// --- SFX FUNCTIONS ---

export const saveSFX = async (sfx: { id: string; blob: Blob }) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORES.SFX, 'readwrite');
    const store = transaction.objectStore(STORES.SFX);
    const request = store.put(sfx);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllSFX = async (): Promise<{ id: string; blob: Blob }[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SFX, 'readonly');
    const store = transaction.objectStore(STORES.SFX);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};
