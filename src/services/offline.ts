import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'beat-street';
const DB_VERSION = 2;

// Cache TTL in milliseconds (1 hour)
const CACHE_TTL_MS = 60 * 60 * 1000;

export interface CachedPOI {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  floor?: number;
  building?: string;
  metadata?: unknown;
}

interface CacheMetadata {
  key: string;
  timestamp: number;
}

interface BeatStreetDB {
  'offline-data': {
    key: string;
    value: unknown;
  };
  'cached-pois': {
    key: string;
    value: CachedPOI;
  };
  'cache-metadata': {
    key: string;
    value: CacheMetadata;
  };
}

let dbInstance: IDBPDatabase<BeatStreetDB> | null = null;

async function getDB(): Promise<IDBPDatabase<BeatStreetDB> | null> {
  if (dbInstance) return dbInstance;

  try {
    dbInstance = await openDB<BeatStreetDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains('offline-data')) {
          db.createObjectStore('offline-data');
        }
        if (!db.objectStoreNames.contains('cached-pois')) {
          db.createObjectStore('cached-pois', { keyPath: 'id' });
        }
        // Added in version 2
        if (oldVersion < 2 && !db.objectStoreNames.contains('cache-metadata')) {
          db.createObjectStore('cache-metadata', { keyPath: 'key' });
        }
      },
    });

    return dbInstance;
  } catch (error) {
    console.error('[offline] Failed to open IndexedDB:', error);
    return null;
  }
}

export async function cacheData(key: string, data: unknown): Promise<boolean> {
  try {
    const db = await getDB();
    if (!db) return false;

    await db.put('offline-data', data, key);
    await db.put('cache-metadata', { key, timestamp: Date.now() });
    return true;
  } catch (error) {
    console.error('[offline] Failed to cache data:', error);
    return false;
  }
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    if (!db) return null;

    const data = await db.get('offline-data', key);
    return (data as T) ?? null;
  } catch (error) {
    console.error('[offline] Failed to get cached data:', error);
    return null;
  }
}

export async function cachePOIs(pois: CachedPOI[]): Promise<boolean> {
  try {
    const db = await getDB();
    if (!db) return false;

    const tx = db.transaction(['cached-pois', 'cache-metadata'], 'readwrite');
    const poiStore = tx.objectStore('cached-pois');
    const metaStore = tx.objectStore('cache-metadata');

    // Clear existing POIs and add new ones
    await poiStore.clear();
    for (const poi of pois) {
      await poiStore.put(poi);
    }

    // Update metadata timestamp
    await metaStore.put({ key: 'pois', timestamp: Date.now() });

    await tx.done;
    return true;
  } catch (error) {
    console.error('[offline] Failed to cache POIs:', error);
    return false;
  }
}

export async function getCachedPOIs(): Promise<CachedPOI[]> {
  try {
    const db = await getDB();
    if (!db) return [];

    return await db.getAll('cached-pois');
  } catch (error) {
    console.error('[offline] Failed to get cached POIs:', error);
    return [];
  }
}

/**
 * Check if the POI cache is stale (older than TTL)
 */
export async function isPOICacheStale(): Promise<boolean> {
  try {
    const db = await getDB();
    if (!db) return true;

    const metadata = await db.get('cache-metadata', 'pois');
    if (!metadata) return true;

    const age = Date.now() - metadata.timestamp;
    return age > CACHE_TTL_MS;
  } catch (error) {
    console.error('[offline] Failed to check cache staleness:', error);
    return true;
  }
}

/**
 * Get the timestamp of the last POI cache update
 */
export async function getPOICacheTimestamp(): Promise<number | null> {
  try {
    const db = await getDB();
    if (!db) return null;

    const metadata = await db.get('cache-metadata', 'pois');
    return metadata?.timestamp ?? null;
  } catch (error) {
    console.error('[offline] Failed to get cache timestamp:', error);
    return null;
  }
}

/**
 * Clear all stale cache entries
 */
export async function clearStaleCache(): Promise<boolean> {
  try {
    const db = await getDB();
    if (!db) return false;

    const metadata = await db.getAll('cache-metadata');
    const now = Date.now();

    for (const entry of metadata) {
      if (now - entry.timestamp > CACHE_TTL_MS) {
        // Clear the associated data
        if (entry.key === 'pois') {
          await db.clear('cached-pois');
        } else {
          await db.delete('offline-data', entry.key);
        }
        await db.delete('cache-metadata', entry.key);
      }
    }

    return true;
  } catch (error) {
    console.error('[offline] Failed to clear stale cache:', error);
    return false;
  }
}

export async function clearCache(): Promise<boolean> {
  try {
    const db = await getDB();
    if (!db) return false;

    await db.clear('offline-data');
    await db.clear('cached-pois');
    await db.clear('cache-metadata');
    return true;
  } catch (error) {
    console.error('[offline] Failed to clear cache:', error);
    return false;
  }
}
