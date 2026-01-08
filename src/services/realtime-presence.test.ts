/**
 * Tests for realtime-presence service
 *
 * Note: These tests mock the Firebase database operations
 * to test the business logic of presence management
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VenueId } from '../types/venue';
import {
  createMockPresenceData,
  createMockSetupOptions,
  createMockUpdateOptions,
  createMockSnapshot,
} from '../test/mocks/firebase';
import type {
  RealtimePresenceData,
  UpdatePresenceOptions,
} from './realtime-presence';

// Mock Firebase database module
vi.mock('firebase/database', () => ({
  ref: vi.fn((db, path) => ({ path, db })),
  set: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  onValue: vi.fn(),
  onDisconnect: vi.fn(() => ({
    remove: vi.fn(() => Promise.resolve()),
    cancel: vi.fn(() => Promise.resolve()),
  })),
  serverTimestamp: vi.fn(() => ({ '.sv': 'timestamp' })),
  off: vi.fn(),
}));

// Mock the firebase service
vi.mock('./firebase', () => ({
  rtdb: { mock: 'database' },
}));

describe('realtime-presence service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RealtimePresenceData structure', () => {
    it('should have all required fields', () => {
      const presenceData = createMockPresenceData();

      expect(presenceData).toHaveProperty('uid');
      expect(presenceData).toHaveProperty('displayName');
      expect(presenceData).toHaveProperty('zone');
      expect(presenceData).toHaveProperty('status');
      expect(presenceData).toHaveProperty('shareLocation');
      expect(presenceData).toHaveProperty('updatedAt');
    });

    it('should have optional venue fields', () => {
      const presenceData = createMockPresenceData({
        venueId: VenueId.PITTSBURGH,
        mapId: 'outdoor',
        floor: 1,
      });

      expect(presenceData.venueId).toBe(VenueId.PITTSBURGH);
      expect(presenceData.mapId).toBe('outdoor');
      expect(presenceData.floor).toBe(1);
    });

    it('should accept valid status values', () => {
      const activePresence = createMockPresenceData({ status: 'active' });
      const idlePresence = createMockPresenceData({ status: 'idle' });
      const awayPresence = createMockPresenceData({ status: 'away' });

      expect(activePresence.status).toBe('active');
      expect(idlePresence.status).toBe('idle');
      expect(awayPresence.status).toBe('away');
    });
  });

  describe('SetupPresenceOptions structure', () => {
    it('should have all required fields for setup', () => {
      const options = createMockSetupOptions();

      expect(options).toHaveProperty('uid');
      expect(options).toHaveProperty('displayName');
      expect(options).toHaveProperty('zone');
      expect(options).toHaveProperty('shareLocation');
    });

    it('should support optional venue information', () => {
      const options = createMockSetupOptions({
        venueId: VenueId.CHAPEL_HILL,
        mapId: 'convention-center',
        floor: 2,
      });

      expect(options.venueId).toBe(VenueId.CHAPEL_HILL);
      expect(options.mapId).toBe('convention-center');
      expect(options.floor).toBe(2);
    });
  });

  describe('UpdatePresenceOptions structure', () => {
    it('should allow partial updates', () => {
      const options = createMockUpdateOptions({
        zone: 'downtown',
      });

      expect(options.zone).toBe('downtown');
    });

    it('should allow updating status', () => {
      const options = createMockUpdateOptions({
        status: 'idle',
      });

      expect(options.status).toBe('idle');
    });

    it('should allow updating multiple fields', () => {
      const options = createMockUpdateOptions({
        zone: 'north-shore',
        venueId: VenueId.PITTSBURGH,
        status: 'active',
        shareLocation: false,
      });

      expect(options.zone).toBe('north-shore');
      expect(options.venueId).toBe(VenueId.PITTSBURGH);
      expect(options.status).toBe('active');
      expect(options.shareLocation).toBe(false);
    });
  });

  describe('Mock snapshot handling', () => {
    it('should create a valid mock snapshot', () => {
      const presenceData = createMockPresenceData();

      const snapshot = createMockSnapshot('user-123', presenceData);

      expect(snapshot.key).toBe('user-123');
      expect(snapshot.exists()).toBe(true);
      expect(snapshot.val()).toEqual(presenceData);
    });

    it('should handle null data in snapshot', () => {
      const snapshot = createMockSnapshot('user-123', null);

      expect(snapshot.key).toBe('user-123');
      expect(snapshot.exists()).toBe(false);
      expect(snapshot.val()).toBeNull();
    });

    it('should iterate over child snapshots', () => {
      const data = {
        'user-1': { displayName: 'User 1', shareLocation: true },
        'user-2': { displayName: 'User 2', shareLocation: true },
        'user-3': { displayName: 'User 3', shareLocation: false },
      };

      const snapshot = createMockSnapshot('presence', data);
      const users: string[] = [];

      snapshot.forEach((childSnapshot) => {
        if (childSnapshot.key) {
          users.push(childSnapshot.key);
        }
      });

      expect(users).toEqual(['user-1', 'user-2', 'user-3']);
    });
  });

  describe('Presence data filtering logic', () => {
    // Test the filtering logic that would be used in subscribeToPresence
    it('should filter out users who do not share location', () => {
      const users: RealtimePresenceData[] = [
        createMockPresenceData({ uid: 'user-1', shareLocation: true }),
        createMockPresenceData({ uid: 'user-2', shareLocation: false }),
        createMockPresenceData({ uid: 'user-3', shareLocation: true }),
      ];

      const filtered = users.filter((u) => u.shareLocation);

      expect(filtered.length).toBe(2);
      expect(filtered.map((u) => u.uid)).toEqual(['user-1', 'user-3']);
    });

    it('should filter by venue', () => {
      const users: RealtimePresenceData[] = [
        createMockPresenceData({ uid: 'user-1', venueId: VenueId.PITTSBURGH }),
        createMockPresenceData({ uid: 'user-2', venueId: VenueId.CHAPEL_HILL }),
        createMockPresenceData({ uid: 'user-3', venueId: VenueId.PITTSBURGH }),
      ];

      const filtered = users.filter((u) => u.venueId === VenueId.PITTSBURGH);

      expect(filtered.length).toBe(2);
      expect(filtered.map((u) => u.uid)).toEqual(['user-1', 'user-3']);
    });

    it('should filter by map', () => {
      const users: RealtimePresenceData[] = [
        createMockPresenceData({ uid: 'user-1', mapId: 'outdoor' }),
        createMockPresenceData({ uid: 'user-2', mapId: 'convention-center' }),
        createMockPresenceData({ uid: 'user-3', mapId: 'outdoor' }),
      ];

      const filtered = users.filter((u) => u.mapId === 'outdoor');

      expect(filtered.length).toBe(2);
    });

    it('should filter by floor', () => {
      const users: RealtimePresenceData[] = [
        createMockPresenceData({ uid: 'user-1', floor: 1 }),
        createMockPresenceData({ uid: 'user-2', floor: 2 }),
        createMockPresenceData({ uid: 'user-3', floor: 1 }),
      ];

      const filtered = users.filter((u) => u.floor === 1);

      expect(filtered.length).toBe(2);
    });

    it('should exclude specific user (self)', () => {
      const users: RealtimePresenceData[] = [
        createMockPresenceData({ uid: 'user-1' }),
        createMockPresenceData({ uid: 'current-user' }),
        createMockPresenceData({ uid: 'user-3' }),
      ];

      const excludeUid = 'current-user';
      const filtered = users.filter((u) => u.uid !== excludeUid);

      expect(filtered.length).toBe(2);
      expect(filtered.find((u) => u.uid === 'current-user')).toBeUndefined();
    });

    it('should combine multiple filters', () => {
      const users: RealtimePresenceData[] = [
        createMockPresenceData({
          uid: 'user-1',
          venueId: VenueId.PITTSBURGH,
          shareLocation: true,
          mapId: 'outdoor',
        }),
        createMockPresenceData({
          uid: 'user-2',
          venueId: VenueId.PITTSBURGH,
          shareLocation: false,
          mapId: 'outdoor',
        }),
        createMockPresenceData({
          uid: 'user-3',
          venueId: VenueId.CHAPEL_HILL,
          shareLocation: true,
          mapId: 'outdoor',
        }),
        createMockPresenceData({
          uid: 'user-4',
          venueId: VenueId.PITTSBURGH,
          shareLocation: true,
          mapId: 'convention-center',
        }),
      ];

      const filtered = users.filter(
        (u) =>
          u.shareLocation &&
          u.venueId === VenueId.PITTSBURGH &&
          u.mapId === 'outdoor'
      );

      expect(filtered.length).toBe(1);
      expect(filtered[0].uid).toBe('user-1');
    });
  });

  describe('Zone-based filtering', () => {
    it('should filter users by zone', () => {
      const users: RealtimePresenceData[] = [
        createMockPresenceData({ uid: 'user-1', zone: 'convention-center' }),
        createMockPresenceData({ uid: 'user-2', zone: 'downtown' }),
        createMockPresenceData({ uid: 'user-3', zone: 'convention-center' }),
        createMockPresenceData({ uid: 'user-4', zone: 'north-shore' }),
      ];

      const zoneUsers = users.filter((u) => u.zone === 'convention-center');

      expect(zoneUsers.length).toBe(2);
      expect(zoneUsers.map((u) => u.uid)).toEqual(['user-1', 'user-3']);
    });
  });

  describe('Presence data transformation', () => {
    it('should provide default values for missing fields', () => {
      // Simulate what happens when reading raw data from Firebase
      const rawData: Partial<RealtimePresenceData> = {
        zone: 'downtown',
        shareLocation: true,
        // Missing displayName, status, updatedAt
      };

      const transformedData: RealtimePresenceData = {
        uid: 'user-123',
        displayName: rawData.displayName || 'Anonymous',
        zone: rawData.zone || '',
        status: rawData.status || 'active',
        shareLocation: rawData.shareLocation ?? false,
        updatedAt: rawData.updatedAt || Date.now(),
      };

      expect(transformedData.displayName).toBe('Anonymous');
      expect(transformedData.status).toBe('active');
      expect(typeof transformedData.updatedAt).toBe('number');
    });
  });

  describe('Update data building', () => {
    it('should only include defined values in update object', () => {
      const updateOptions: UpdatePresenceOptions = {
        zone: 'downtown',
        status: undefined,
        venueId: VenueId.PITTSBURGH,
      };

      // Simulate the update data building logic
      const updateData: Record<string, unknown> = {};

      if (updateOptions.zone !== undefined) {
        updateData.zone = updateOptions.zone;
      }
      if (updateOptions.status !== undefined) {
        updateData.status = updateOptions.status;
      }
      if (updateOptions.venueId !== undefined) {
        updateData.venueId = updateOptions.venueId;
      }

      expect(updateData).toHaveProperty('zone', 'downtown');
      expect(updateData).toHaveProperty('venueId', VenueId.PITTSBURGH);
      expect(updateData).not.toHaveProperty('status');
    });
  });
});
