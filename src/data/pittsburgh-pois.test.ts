/**
 * Tests for pittsburgh-pois data integrity
 *
 * These tests verify that the POI data is well-formed and consistent
 */
import { describe, it, expect } from 'vitest';
import {
  pittsburghPOIs,
  conferenceVenues,
  restaurants,
  attractions,
  coffeeShops,
  infoPOIs,
  socialPOIs,
  PITTSBURGH_ZONES,
  getPOIsByZone,
  getPOIsByType,
  getPOIById,
  PittsburghZone,
} from './pittsburgh-pois';
import { POIType } from '../types/poi';
import { VenueId } from '../types/venue';

describe('Pittsburgh POIs Data Integrity', () => {
  describe('Data structure validation', () => {
    it('should have all required fields for each POI', () => {
      pittsburghPOIs.forEach((poi) => {
        expect(poi.id).toBeDefined();
        expect(typeof poi.id).toBe('string');
        expect(poi.id.length).toBeGreaterThan(0);

        expect(poi.type).toBeDefined();
        expect(Object.values(POIType)).toContain(poi.type);

        expect(poi.name).toBeDefined();
        expect(typeof poi.name).toBe('string');
        expect(poi.name.length).toBeGreaterThan(0);

        expect(poi.position).toBeDefined();
        expect(typeof poi.position.x).toBe('number');
        expect(typeof poi.position.y).toBe('number');
      });
    });

    it('should have unique IDs for all POIs', () => {
      const ids = pittsburghPOIs.map((poi) => poi.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid zone references', () => {
      const validZones = Object.values(PITTSBURGH_ZONES);

      pittsburghPOIs.forEach((poi) => {
        if (poi.position.zone) {
          expect(validZones).toContain(poi.position.zone);
        }
      });
    });

    it('should have valid venueId references', () => {
      pittsburghPOIs.forEach((poi) => {
        if (poi.position.venueId) {
          expect(Object.values(VenueId)).toContain(poi.position.venueId);
        }
      });
    });
  });

  describe('POI categories', () => {
    it('should have conference venues', () => {
      expect(conferenceVenues.length).toBeGreaterThan(0);
      conferenceVenues.forEach((venue) => {
        expect(venue.type).toBe(POIType.LANDMARK);
      });
    });

    it('should have restaurants', () => {
      expect(restaurants.length).toBeGreaterThan(0);
      restaurants.forEach((restaurant) => {
        expect(restaurant.type).toBe(POIType.FOOD);
      });
    });

    it('should have attractions', () => {
      expect(attractions.length).toBeGreaterThan(0);
      attractions.forEach((attraction) => {
        expect(attraction.type).toBe(POIType.LANDMARK);
      });
    });

    it('should have coffee shops', () => {
      expect(coffeeShops.length).toBeGreaterThan(0);
      coffeeShops.forEach((shop) => {
        expect(shop.type).toBe(POIType.FOOD);
      });
    });

    it('should have info POIs', () => {
      expect(infoPOIs.length).toBeGreaterThan(0);
      infoPOIs.forEach((info) => {
        expect(info.type).toBe(POIType.INFO);
      });
    });

    it('should have social POIs', () => {
      expect(socialPOIs.length).toBeGreaterThan(0);
      socialPOIs.forEach((social) => {
        expect(social.type).toBe(POIType.SOCIAL);
      });
    });

    it('should combine all categories into pittsburghPOIs', () => {
      const expectedTotal =
        conferenceVenues.length +
        restaurants.length +
        attractions.length +
        coffeeShops.length +
        infoPOIs.length +
        socialPOIs.length;

      expect(pittsburghPOIs.length).toBe(expectedTotal);
    });
  });

  describe('Zone definitions', () => {
    it('should have all expected zones', () => {
      expect(PITTSBURGH_ZONES.CONVENTION_CENTER).toBe('convention-center');
      expect(PITTSBURGH_ZONES.CULTURAL_DISTRICT).toBe('cultural-district');
      expect(PITTSBURGH_ZONES.STRIP_DISTRICT).toBe('strip-district');
      expect(PITTSBURGH_ZONES.DOWNTOWN).toBe('downtown');
      expect(PITTSBURGH_ZONES.NORTH_SHORE).toBe('north-shore');
      expect(PITTSBURGH_ZONES.POINT_STATE_PARK).toBe('point-state-park');
      expect(PITTSBURGH_ZONES.OAKLAND).toBe('oakland');
    });
  });

  describe('getPOIsByZone()', () => {
    it('should return POIs for convention center zone', () => {
      const pois = getPOIsByZone(PITTSBURGH_ZONES.CONVENTION_CENTER);

      expect(pois.length).toBeGreaterThan(0);
      pois.forEach((poi) => {
        expect(poi.position.zone).toBe(PITTSBURGH_ZONES.CONVENTION_CENTER);
      });
    });

    it('should return POIs for cultural district zone', () => {
      const pois = getPOIsByZone(PITTSBURGH_ZONES.CULTURAL_DISTRICT);

      expect(pois.length).toBeGreaterThan(0);
      pois.forEach((poi) => {
        expect(poi.position.zone).toBe(PITTSBURGH_ZONES.CULTURAL_DISTRICT);
      });
    });

    it('should return POIs for downtown zone', () => {
      const pois = getPOIsByZone(PITTSBURGH_ZONES.DOWNTOWN);

      expect(pois.length).toBeGreaterThan(0);
      pois.forEach((poi) => {
        expect(poi.position.zone).toBe(PITTSBURGH_ZONES.DOWNTOWN);
      });
    });

    it('should return empty array for zone with no POIs', () => {
      // All zones should have POIs, but this tests the function behavior
      const pois = getPOIsByZone('nonexistent-zone' as PittsburghZone);

      expect(pois).toEqual([]);
    });
  });

  describe('getPOIsByType()', () => {
    it('should return all FOOD type POIs', () => {
      const pois = getPOIsByType(POIType.FOOD);

      expect(pois.length).toBeGreaterThan(0);
      pois.forEach((poi) => {
        expect(poi.type).toBe(POIType.FOOD);
      });

      // Should include restaurants and coffee shops
      expect(pois.length).toBe(restaurants.length + coffeeShops.length);
    });

    it('should return all LANDMARK type POIs', () => {
      const pois = getPOIsByType(POIType.LANDMARK);

      expect(pois.length).toBeGreaterThan(0);
      pois.forEach((poi) => {
        expect(poi.type).toBe(POIType.LANDMARK);
      });

      // Should include conference venues and attractions
      expect(pois.length).toBe(conferenceVenues.length + attractions.length);
    });

    it('should return all INFO type POIs', () => {
      const pois = getPOIsByType(POIType.INFO);

      expect(pois.length).toBe(infoPOIs.length);
      pois.forEach((poi) => {
        expect(poi.type).toBe(POIType.INFO);
      });
    });

    it('should return all SOCIAL type POIs', () => {
      const pois = getPOIsByType(POIType.SOCIAL);

      expect(pois.length).toBe(socialPOIs.length);
      pois.forEach((poi) => {
        expect(poi.type).toBe(POIType.SOCIAL);
      });
    });

    it('should return empty array for SESSION type (not used in this data)', () => {
      const pois = getPOIsByType(POIType.SESSION);

      expect(pois).toEqual([]);
    });
  });

  describe('getPOIById()', () => {
    it('should find POI by valid ID', () => {
      const poi = getPOIById('dlcc-main');

      expect(poi).toBeDefined();
      expect(poi?.id).toBe('dlcc-main');
      expect(poi?.name).toBe('David L. Lawrence Convention Center');
    });

    it('should return undefined for invalid ID', () => {
      const poi = getPOIById('nonexistent-poi');

      expect(poi).toBeUndefined();
    });

    it('should find any POI from the full list', () => {
      pittsburghPOIs.forEach((originalPoi) => {
        const foundPoi = getPOIById(originalPoi.id);

        expect(foundPoi).toBeDefined();
        expect(foundPoi?.id).toBe(originalPoi.id);
      });
    });
  });

  describe('Position validation', () => {
    it('should have positive x and y coordinates', () => {
      pittsburghPOIs.forEach((poi) => {
        expect(poi.position.x).toBeGreaterThan(0);
        expect(poi.position.y).toBeGreaterThan(0);
      });
    });

    it('should have reasonable coordinate ranges', () => {
      // Coordinates should be within a reasonable range for the map
      pittsburghPOIs.forEach((poi) => {
        expect(poi.position.x).toBeLessThan(10000);
        expect(poi.position.y).toBeLessThan(10000);
      });
    });
  });

  describe('Metadata validation', () => {
    it('should have valid metadata for FOOD POIs', () => {
      const foodPOIs = getPOIsByType(POIType.FOOD);

      foodPOIs.forEach((poi) => {
        expect(poi.metadata).toBeDefined();
        // Food POIs should have menu type
        if (poi.metadata?.menuType) {
          expect(typeof poi.metadata.menuType).toBe('string');
        }
        // Hours should be strings
        if (poi.metadata?.hours) {
          expect(typeof poi.metadata.hours).toBe('string');
        }
      });
    });

    it('should have valid metadata for LANDMARK POIs', () => {
      const landmarks = getPOIsByType(POIType.LANDMARK);

      landmarks.forEach((poi) => {
        expect(poi.metadata).toBeDefined();
        // Landmarks should have historicalInfo
        if (poi.metadata?.historicalInfo) {
          expect(typeof poi.metadata.historicalInfo).toBe('string');
        }
        // photoOpportunity should be boolean
        if (poi.metadata?.photoOpportunity !== undefined) {
          expect(typeof poi.metadata.photoOpportunity).toBe('boolean');
        }
      });
    });

    it('should have valid metadata for INFO POIs', () => {
      const infos = getPOIsByType(POIType.INFO);

      infos.forEach((poi) => {
        expect(poi.metadata).toBeDefined();
        // Info POIs should have services array
        if (poi.metadata?.services) {
          expect(Array.isArray(poi.metadata.services)).toBe(true);
        }
      });
    });

    it('should have valid metadata for SOCIAL POIs', () => {
      const socials = getPOIsByType(POIType.SOCIAL);

      socials.forEach((poi) => {
        expect(poi.metadata).toBeDefined();
        // Social POIs should have capacity
        if (poi.metadata?.capacity !== undefined) {
          expect(typeof poi.metadata.capacity).toBe('number');
          expect(poi.metadata.capacity).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Key POI presence', () => {
    it('should include David L. Lawrence Convention Center', () => {
      const dlcc = getPOIById('dlcc-main');

      expect(dlcc).toBeDefined();
      expect(dlcc?.name).toContain('David L. Lawrence');
      expect(dlcc?.position.zone).toBe(PITTSBURGH_ZONES.CONVENTION_CENTER);
    });

    it('should include registration desk', () => {
      const registration = getPOIById('registration-desk');

      expect(registration).toBeDefined();
      expect(registration?.type).toBe(POIType.INFO);
    });

    it('should include networking lounge', () => {
      const lounge = getPOIById('networking-lounge');

      expect(lounge).toBeDefined();
      expect(lounge?.type).toBe(POIType.SOCIAL);
    });

    it('should include Point State Park', () => {
      const park = getPOIById('point-state-park');

      expect(park).toBeDefined();
      expect(park?.type).toBe(POIType.LANDMARK);
      expect(park?.position.zone).toBe(PITTSBURGH_ZONES.POINT_STATE_PARK);
    });

    it('should include Andy Warhol Museum', () => {
      const warhol = getPOIById('warhol-museum');

      expect(warhol).toBeDefined();
      expect(warhol?.name).toContain('Warhol');
      expect(warhol?.position.zone).toBe(PITTSBURGH_ZONES.NORTH_SHORE);
    });
  });

  describe('isActive flag', () => {
    it('should have isActive set to true for all POIs', () => {
      pittsburghPOIs.forEach((poi) => {
        expect(poi.isActive).toBe(true);
      });
    });
  });

  describe('Description presence', () => {
    it('should have descriptions for all POIs', () => {
      pittsburghPOIs.forEach((poi) => {
        expect(poi.description).toBeDefined();
        expect(typeof poi.description).toBe('string');
        expect(poi.description!.length).toBeGreaterThan(0);
      });
    });
  });
});
