/**
 * Firebase mock factories for testing
 */
import { vi } from 'vitest';
import type { RealtimePresenceData, SetupPresenceOptions, UpdatePresenceOptions } from '../../services/realtime-presence';
import { VenueId } from '../../types/venue';

// Mock DataSnapshot
export interface MockDataSnapshot {
  key: string | null;
  val: () => unknown;
  exists: () => boolean;
  forEach: (callback: (child: MockDataSnapshot) => void) => void;
}

export function createMockSnapshot(
  key: string | null,
  data: unknown
): MockDataSnapshot {
  return {
    key,
    val: () => data,
    exists: () => data !== null && data !== undefined,
    forEach: (callback: (child: MockDataSnapshot) => void) => {
      if (data && typeof data === 'object') {
        Object.entries(data as Record<string, unknown>).forEach(([childKey, childData]) => {
          callback(createMockSnapshot(childKey, childData));
        });
      }
    },
  };
}

// Mock presence data factory
export function createMockPresenceData(
  overrides: Partial<RealtimePresenceData> = {}
): RealtimePresenceData {
  return {
    uid: 'test-user-123',
    displayName: 'Test User',
    zone: 'convention-center',
    venueId: VenueId.PITTSBURGH,
    mapId: 'outdoor',
    floor: undefined,
    status: 'active',
    shareLocation: true,
    updatedAt: Date.now(),
    ...overrides,
  };
}

// Mock setup options factory
export function createMockSetupOptions(
  overrides: Partial<SetupPresenceOptions> = {}
): SetupPresenceOptions {
  return {
    uid: 'test-user-123',
    displayName: 'Test User',
    zone: 'convention-center',
    venueId: VenueId.PITTSBURGH,
    shareLocation: true,
    ...overrides,
  };
}

// Mock update options factory
export function createMockUpdateOptions(
  overrides: Partial<UpdatePresenceOptions> = {}
): UpdatePresenceOptions {
  return {
    zone: 'downtown',
    status: 'active',
    ...overrides,
  };
}

// Firebase database mock
export function createFirebaseDatabaseMock() {
  const listeners = new Map<string, Set<(snapshot: MockDataSnapshot) => void>>();
  const disconnectHandlers = new Map<string, () => Promise<void>>();
  let mockData: Record<string, unknown> = {};

  const ref = vi.fn((db: unknown, path: string) => ({ path, db }));

  const set = vi.fn(async (reference: { path: string }, data: unknown) => {
    mockData[reference.path] = data;
  });

  const update = vi.fn(async (reference: { path: string }, data: unknown) => {
    const existing = mockData[reference.path] || {};
    mockData[reference.path] = { ...existing as object, ...data as object };
  });

  const remove = vi.fn(async (reference: { path: string }) => {
    delete mockData[reference.path];
  });

  const onValue = vi.fn((reference: { path: string }, callback: (snapshot: MockDataSnapshot) => void) => {
    if (!listeners.has(reference.path)) {
      listeners.set(reference.path, new Set());
    }
    listeners.get(reference.path)!.add(callback);
    // Immediately call with current data
    callback(createMockSnapshot(reference.path.split('/').pop() || null, mockData[reference.path]));
  });

  const off = vi.fn((reference: { path: string }, _eventType: string, callback: (snapshot: MockDataSnapshot) => void) => {
    listeners.get(reference.path)?.delete(callback);
  });

  const onDisconnect = vi.fn((reference: { path: string }) => ({
    remove: vi.fn(async () => {
      disconnectHandlers.set(reference.path, async () => {
        delete mockData[reference.path];
      });
    }),
    cancel: vi.fn(async () => {
      disconnectHandlers.delete(reference.path);
    }),
  }));

  const serverTimestamp = vi.fn(() => ({ '.sv': 'timestamp' }));

  // Helper to trigger listeners
  const triggerListener = (path: string, data: unknown) => {
    mockData[path] = data;
    const pathListeners = listeners.get(path);
    if (pathListeners) {
      const snapshot = createMockSnapshot(path.split('/').pop() || null, data);
      pathListeners.forEach((cb) => cb(snapshot));
    }
  };

  // Helper to simulate disconnect
  const simulateDisconnect = async (path: string) => {
    const handler = disconnectHandlers.get(path);
    if (handler) {
      await handler();
    }
  };

  // Helper to set mock data
  const setMockData = (data: Record<string, unknown>) => {
    mockData = data;
  };

  // Helper to get mock data
  const getMockData = () => mockData;

  return {
    ref,
    set,
    update,
    remove,
    onValue,
    off,
    onDisconnect,
    serverTimestamp,
    // Test helpers
    triggerListener,
    simulateDisconnect,
    setMockData,
    getMockData,
    listeners,
  };
}

// Export a pre-created mock for convenience
export const firebaseMock = createFirebaseDatabaseMock();
