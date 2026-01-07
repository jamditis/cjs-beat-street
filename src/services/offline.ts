import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'beat-street';
const DB_VERSION = 1;

interface BeatStreetDB {
  'offline-data': {
    key: string;
    value: unknown;
  };
  'cached-pois': {
    key: string;
    value: {
      id: string;
      type: string;
      name: string;
      position: { x: number; y: number };
      floor?: number;
      building?: string;
      metadata?: unknown;
    };
  };
}

let dbInstance: IDBPDatabase<BeatStreetDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<BeatStreetDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<BeatStreetDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('offline-data')) {
        db.createObjectStore('offline-data');
      }
      if (!db.objectStoreNames.contains('cached-pois')) {
        db.createObjectStore('cached-pois', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
}

export async function cacheData(key: string, data: unknown): Promise<void> {
  const db = await getDB();
  await db.put('offline-data', data, key);
}

export async function getCachedData<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get('offline-data', key) as Promise<T | undefined>;
}

export async function cachePOIs(
  pois: BeatStreetDB['cached-pois']['value'][]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('cached-pois', 'readwrite');
  await Promise.all([...pois.map((poi) => tx.store.put(poi)), tx.done]);
}

export async function getCachedPOIs(): Promise<
  BeatStreetDB['cached-pois']['value'][]
> {
  const db = await getDB();
  return db.getAll('cached-pois');
}

export async function clearCache(): Promise<void> {
  const db = await getDB();
  await db.clear('offline-data');
  await db.clear('cached-pois');
}
