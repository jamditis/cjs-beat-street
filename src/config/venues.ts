/**
 * Venue configuration registry for Beat Street multi-venue support
 * Contains configurations for all CJS conference venues
 */

import {
  VenueConfig,
  VenueId,
  IndoorVenueConfig,
  FloorConfig,
} from '../types/venue';

/**
 * Registry of all venue configurations
 */
export const VENUES: Record<VenueId, VenueConfig> = {
  [VenueId.PITTSBURGH]: {
    id: VenueId.PITTSBURGH,
    name: 'pittsburgh',
    displayName: 'CJS2026 Pittsburgh',
    city: 'Pittsburgh',
    state: 'PA',
    dates: 'June 8-9, 2026',
    timezone: 'America/New_York',
    isDefault: true,
    outdoorMap: {
      id: 'pittsburgh-downtown',
      name: 'Downtown Pittsburgh',
      mapPath: '/assets/maps/pittsburgh/outdoor.json',
      worldBounds: {
        width: 2400,
        height: 1800,
      },
      spawnPoint: {
        x: 1200,
        y: 900,
      },
      districts: [
        {
          id: 'downtown',
          name: 'Downtown',
          color: 0x2a9d8f,
          bounds: {
            x: 0,
            y: 0,
            width: 800,
            height: 900,
          },
        },
        {
          id: 'cultural-district',
          name: 'Cultural District',
          color: 0xe9c46a,
          bounds: {
            x: 800,
            y: 0,
            width: 800,
            height: 900,
          },
        },
        {
          id: 'waterfront',
          name: 'Waterfront',
          color: 0x457b9d,
          bounds: {
            x: 1600,
            y: 0,
            width: 800,
            height: 1800,
          },
        },
      ],
      indoorVenues: [
        {
          id: 'convention-center',
          name: 'convention-center',
          displayName: 'David L. Lawrence Convention Center',
          buildingPosition: {
            x: 400,
            y: 400,
          },
          floors: [
            {
              floor: 1,
              name: 'Ground floor',
              mapPath: '/assets/maps/pittsburgh/convention-center-floor-1.json',
              worldBounds: {
                width: 1600,
                height: 1200,
              },
              spawnPoint: {
                x: 800,
                y: 1100,
              },
              rooms: [
                {
                  id: 'main-hall',
                  name: 'Main Hall',
                  bounds: { x: 400, y: 200, width: 800, height: 600 },
                  color: 0x2a9d8f,
                  type: 'session',
                },
                {
                  id: 'registration',
                  name: 'Registration',
                  bounds: { x: 100, y: 900, width: 400, height: 200 },
                  color: 0xe9c46a,
                  type: 'service',
                },
                {
                  id: 'exhibit-hall-a',
                  name: 'Exhibit Hall A',
                  bounds: { x: 1100, y: 400, width: 400, height: 500 },
                  color: 0x457b9d,
                  type: 'exhibit',
                },
              ],
            },
            {
              floor: 2,
              name: 'Second floor',
              mapPath: '/assets/maps/pittsburgh/convention-center-floor-2.json',
              worldBounds: {
                width: 1600,
                height: 1200,
              },
              spawnPoint: {
                x: 800,
                y: 600,
              },
              rooms: [
                {
                  id: 'breakout-room-a',
                  name: 'Breakout Room A',
                  bounds: { x: 100, y: 100, width: 500, height: 400 },
                  color: 0x2a9d8f,
                  type: 'session',
                },
                {
                  id: 'breakout-room-b',
                  name: 'Breakout Room B',
                  bounds: { x: 700, y: 100, width: 500, height: 400 },
                  color: 0x2a9d8f,
                  type: 'session',
                },
                {
                  id: 'networking-lounge',
                  name: 'Networking Lounge',
                  bounds: { x: 300, y: 600, width: 600, height: 400 },
                  color: 0xe9c46a,
                  type: 'networking',
                },
              ],
            },
            {
              floor: 3,
              name: 'Third floor',
              mapPath: '/assets/maps/pittsburgh/convention-center-floor-3.json',
              worldBounds: {
                width: 1600,
                height: 1200,
              },
              spawnPoint: {
                x: 800,
                y: 600,
              },
              rooms: [
                {
                  id: 'conference-hall',
                  name: 'Conference Hall',
                  bounds: { x: 200, y: 100, width: 1000, height: 600 },
                  color: 0x2a9d8f,
                  type: 'session',
                },
                {
                  id: 'vip-lounge',
                  name: 'VIP Lounge',
                  bounds: { x: 100, y: 800, width: 400, height: 300 },
                  color: 0xe9c46a,
                  type: 'networking',
                },
                {
                  id: 'green-room',
                  name: 'Green Room',
                  bounds: { x: 1100, y: 800, width: 400, height: 300 },
                  color: 0x457b9d,
                  type: 'service',
                },
              ],
            },
          ],
        },
      ],
    },
  },

  [VenueId.CHAPEL_HILL]: {
    id: VenueId.CHAPEL_HILL,
    name: 'chapel-hill',
    displayName: 'CJS Chapel Hill',
    city: 'Chapel Hill',
    state: 'NC',
    dates: 'TBD',
    timezone: 'America/New_York',
    isDefault: false,
    outdoorMap: {
      id: 'chapel-hill-campus',
      name: 'UNC Campus',
      mapPath: '/assets/maps/chapel-hill/outdoor.json',
      worldBounds: {
        width: 2000,
        height: 1600,
      },
      spawnPoint: {
        x: 1000,
        y: 800,
      },
      districts: [],
      indoorVenues: [
        {
          id: 'student-union',
          name: 'student-union',
          displayName: 'Student Union',
          buildingPosition: {
            x: 500,
            y: 400,
          },
          floors: [
            {
              floor: 1,
              name: 'Ground floor',
              mapPath: '/assets/maps/chapel-hill/student-union-floor-1.json',
              worldBounds: {
                width: 1200,
                height: 1000,
              },
              spawnPoint: {
                x: 600,
                y: 900,
              },
              rooms: [
                {
                  id: 'ground-floor-lobby',
                  name: 'Ground Floor',
                  bounds: { x: 0, y: 0, width: 1200, height: 1000 },
                  color: 0x2a9d8f,
                },
              ],
            },
            {
              floor: 2,
              name: 'Event space',
              mapPath: '/assets/maps/chapel-hill/student-union-floor-2.json',
              worldBounds: {
                width: 1200,
                height: 1000,
              },
              spawnPoint: {
                x: 600,
                y: 500,
              },
              rooms: [
                {
                  id: 'event-space',
                  name: 'Event Space',
                  bounds: { x: 100, y: 100, width: 1000, height: 800 },
                  color: 0xe9c46a,
                  type: 'session',
                },
              ],
            },
          ],
        },
      ],
    },
  },

  [VenueId.PHILADELPHIA]: {
    id: VenueId.PHILADELPHIA,
    name: 'philadelphia',
    displayName: 'CJS Philadelphia',
    city: 'Philadelphia',
    state: 'PA',
    dates: 'TBD',
    timezone: 'America/New_York',
    isDefault: false,
    outdoorMap: {
      id: 'philadelphia-center-city',
      name: 'Center City Philadelphia',
      mapPath: '/assets/maps/philadelphia/outdoor.json',
      worldBounds: {
        width: 2200,
        height: 1700,
      },
      spawnPoint: {
        x: 1100,
        y: 850,
      },
      districts: [],
      indoorVenues: [
        {
          id: 'convention-center',
          name: 'convention-center',
          displayName: 'Pennsylvania Convention Center',
          buildingPosition: {
            x: 600,
            y: 500,
          },
          floors: [
            {
              floor: 1,
              name: 'Exhibit hall',
              mapPath: '/assets/maps/philadelphia/convention-center-floor-1.json',
              worldBounds: {
                width: 1800,
                height: 1400,
              },
              spawnPoint: {
                x: 900,
                y: 1300,
              },
              rooms: [
                {
                  id: 'exhibit-hall',
                  name: 'Exhibit Hall',
                  bounds: { x: 100, y: 100, width: 1600, height: 1200 },
                  color: 0x2a9d8f,
                  type: 'exhibit',
                },
              ],
            },
          ],
        },
      ],
    },
  },
};

/**
 * Get venue configuration by ID
 * @param venueId - The venue identifier
 * @returns The venue configuration or null if not found
 */
export function getVenueConfig(venueId: VenueId): VenueConfig | null {
  return VENUES[venueId] ?? null;
}

/**
 * Get the default venue configuration
 * @returns The default venue configuration
 */
export function getDefaultVenue(): VenueConfig {
  const defaultVenue = Object.values(VENUES).find((venue) => venue.isDefault);
  if (!defaultVenue) {
    // Fall back to Pittsburgh if no default is set
    return VENUES[VenueId.PITTSBURGH];
  }
  return defaultVenue;
}

/**
 * Get all venue configurations
 * @returns Array of all venue configurations
 */
export function getAllVenues(): VenueConfig[] {
  return Object.values(VENUES);
}

/**
 * Get indoor venue configuration by venue and indoor venue ID
 * @param venueId - The venue identifier
 * @param indoorVenueId - The indoor venue identifier
 * @returns The indoor venue configuration or null if not found
 */
export function getIndoorVenueConfig(
  venueId: VenueId,
  indoorVenueId: string
): IndoorVenueConfig | null {
  const venue = VENUES[venueId];
  if (!venue) {
    return null;
  }
  return (
    venue.outdoorMap.indoorVenues.find((iv) => iv.id === indoorVenueId) ?? null
  );
}

/**
 * Get floor configuration for a specific indoor venue
 * @param venueId - The venue identifier
 * @param indoorVenueId - The indoor venue identifier
 * @param floor - The floor number
 * @returns The floor configuration or null if not found
 */
export function getFloorConfig(
  venueId: VenueId,
  indoorVenueId: string,
  floor: number
): FloorConfig | null {
  const indoorVenue = getIndoorVenueConfig(venueId, indoorVenueId);
  if (!indoorVenue) {
    return null;
  }
  return indoorVenue.floors.find((f) => f.floor === floor) ?? null;
}
