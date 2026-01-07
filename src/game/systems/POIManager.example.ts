/**
 * POI Manager Usage Examples
 *
 * This file demonstrates how to use the POI management system in your Phaser scenes.
 */

import Phaser from 'phaser';
import { POIManager } from './POIManager';
import { POIType, POIData, SessionPOI, SponsorPOI } from '../../types/poi';
import { eventBus } from '../../lib/EventBus';

/**
 * Example 1: Basic POI Manager Setup in a Scene
 */
export class ExampleScene extends Phaser.Scene {
  private poiManager!: POIManager;

  create(): void {
    // Initialize POI Manager
    this.poiManager = new POIManager({
      scene: this,
      showLabels: true,
      showDistances: true, // Show distance indicators
    });

    // Register some basic POIs
    this.createSamplePOIs();

    // Listen for navigation events
    this.setupNavigationHandling();
  }

  private createSamplePOIs(): void {
    // Example 1: Simple session POI
    const sessionData: SessionPOI = {
      id: 'keynote-main',
      type: POIType.SESSION,
      name: 'Opening Keynote',
      description: 'Join us for an exciting opening keynote about the future of JavaScript',
      position: { x: 400, y: 300, floor: 1 },
      floor: 1,
      metadata: {
        startTime: '9:00 AM',
        endTime: '10:30 AM',
        speaker: 'Jane Developer',
        room: 'Main Hall',
        track: 'General',
        capacity: 500,
        attendeeCount: 342,
      },
      isActive: true,
      isPulsing: true, // Make it pulse to draw attention
    };

    this.poiManager.registerPOI(sessionData);

    // Example 2: Sponsor booth POI
    const sponsorData: SponsorPOI = {
      id: 'sponsor-techcorp',
      type: POIType.SPONSOR,
      name: 'TechCorp Booth',
      description: 'Learn about the latest tools from TechCorp',
      position: { x: 800, y: 400, floor: 1 },
      floor: 1,
      metadata: {
        company: 'TechCorp Inc.',
        logoUrl: '/assets/sponsors/techcorp-logo.png',
        booth: 'A-12',
        category: 'Platinum',
        website: 'https://techcorp.example.com',
      },
      isActive: true,
    };

    this.poiManager.registerPOI(sponsorData);

    // Example 3: Multiple POIs at once
    const foodPOIs: POIData[] = [
      {
        id: 'coffee-station-1',
        type: POIType.FOOD,
        name: 'Coffee Station',
        position: { x: 200, y: 500 },
        metadata: {
          menuType: 'Coffee & Pastries',
          hours: '8:00 AM - 5:00 PM',
          dietaryOptions: ['Vegan', 'Gluten-free'],
        },
      },
      {
        id: 'lunch-area',
        type: POIType.FOOD,
        name: 'Lunch Area',
        position: { x: 600, y: 500 },
        metadata: {
          menuType: 'Full Meal Service',
          hours: '12:00 PM - 2:00 PM',
          capacity: 200,
        },
      },
    ];

    this.poiManager.registerMultiplePOIs(foodPOIs);
  }

  private setupNavigationHandling(): void {
    eventBus.on('navigate-to-poi', (data: unknown) => {
      const navData = data as { poiId: string; position: { x: number; y: number } };

      // Handle navigation (e.g., move camera, create path)
      console.log(`Navigating to POI: ${navData.poiId}`);

      // Example: Smooth camera pan to POI
      this.cameras.main.pan(
        navData.position.x,
        navData.position.y,
        1000,
        'Power2'
      );
    });
  }

  shutdown(): void {
    // Clean up POI manager
    this.poiManager.destroy();
  }
}

/**
 * Example 2: Querying and Filtering POIs
 */
export function demonstrateQuerying(poiManager: POIManager): void {
  // Get all session POIs
  const sessions = poiManager.getPOIsByType(POIType.SESSION);
  console.log(`Found ${sessions.length} session POIs`);

  // Get all POIs on floor 2
  const floor2POIs = poiManager.getPOIsByFloor(2);
  console.log(`Floor 2 has ${floor2POIs.length} POIs`);

  // Find POIs near player position
  const nearbyPOIs = poiManager.getPOIsNearPosition(400, 300, 150);
  console.log(`Found ${nearbyPOIs.length} nearby POIs`);

  // Advanced filtering
  const activeSessions = poiManager.findPOIs({
    type: POIType.SESSION,
    floor: 1,
    isActive: true,
  });
  console.log(`Found ${activeSessions.length} active sessions on floor 1`);

  // Find closest POI to a position
  const closest = poiManager.getClosestPOI(400, 300, {
    type: [POIType.FOOD, POIType.INFO],
  });

  if (closest) {
    console.log(`Closest food/info POI: ${closest.data.name}`);
  }

  // Get POI statistics
  const stats = poiManager.getStats();
  console.log('POI Stats:', stats);
}

/**
 * Example 3: Dynamic POI Management
 */
export function demonstrateDynamicManagement(poiManager: POIManager): void {
  // Highlight all sponsor booths
  poiManager.highlightPOIsByType(POIType.SPONSOR);

  // Highlight specific POI
  poiManager.highlightPOI('keynote-main');

  // Set POI as inactive (e.g., session ended)
  poiManager.setActive('keynote-main', false);

  // Enable/disable distance indicators
  poiManager.setShowDistances(true);

  // Change proximity radius for proximity events
  poiManager.setProximityRadius(200);

  // Remove a POI
  poiManager.unregisterPOI('old-session-id');

  // Clear all POIs (e.g., when changing floors)
  poiManager.clearAll();
}

/**
 * Example 4: Loading POIs from Tiled Map
 */
export function loadPOIsFromTiled(scene: Phaser.Scene, manager: POIManager): void {
  // Assuming you have a Tiled map loaded
  const map = scene.make.tilemap({ key: 'convention-center-map' });

  // Get the POI object layer
  const poiLayer = map.getObjectLayer('POIs');

  if (poiLayer) {
    // Automatically load all POIs from the Tiled layer
    manager.loadFromTiledObjectLayer(poiLayer);
    console.log('POIs loaded from Tiled map');
  }
}

/**
 * Example 5: Listening to POI Events in React Components
 *
 * Use this pattern in your React components:
 */
/*
import { usePOI } from '../hooks/usePOI';

function MyComponent() {
  const {
    selectedPOI,
    hoveredPOI,
    nearbyPOIs,
    selectPOI,
    clearSelection,
    getPOIsByType,
    stats
  } = usePOI();

  // Use selectedPOI to display details
  // Use nearbyPOIs to show proximity list
  // Use getPOIsByType to filter POIs

  return (
    <div>
      {selectedPOI && (
        <div>Selected: {selectedPOI.name}</div>
      )}
      <div>Total POIs: {stats.total}</div>
      <div>Sessions: {stats.byType.session || 0}</div>
    </div>
  );
}
*/

/**
 * Example 6: Custom POI Interactions
 */
export function demonstrateCustomInteractions(): void {
  // Listen for POI hover events
  eventBus.on('poi-hover-start', (data: unknown) => {
    const event = data as { poiId: string };
    console.log(`Hovering over: ${event.poiId}`);

    // Show tooltip or preview
  });

  // Listen for proximity events
  eventBus.on('poi-proximity', (data: unknown) => {
    const event = data as { poiId: string; distance: number };

    if (event.distance < 50) {
      console.log(`Very close to ${event.poiId}!`);
      // Trigger auto-highlight or notification
    }
  });

  // Listen for all POI interactions
  eventBus.on('poi-interaction', (data: unknown) => {
    const event = data as {
      poiId: string;
      timestamp: number;
      interactionType: string;
    };

    // Track analytics, update visit count, etc.
    console.log(`POI interaction: ${event.poiId} (${event.interactionType})`);
  });
}
