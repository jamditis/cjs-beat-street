import { VenueId } from '../types/venue';

type EventCallback = (...args: unknown[]) => void;

class EventBus {
  private events: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback): void {
    this.events.get(event)?.delete(callback);
  }

  emit(event: string, ...args: unknown[]): void {
    this.events.get(event)?.forEach((cb) => cb(...args));
  }
}

export const eventBus = new EventBus();

// Expose for development testing (Playwright)
if (import.meta.env.DEV) {
  (window as unknown as { __eventBus: EventBus }).__eventBus = eventBus;
}

// Event type definitions for type safety
export interface GameEvents {
  'poi-selected': { poiId: string; type: string; data: unknown };
  'poi-hover-start': { poiId: string; poiData: unknown; timestamp: number };
  'poi-hover-end': { poiId: string; poiData: unknown; timestamp: number };
  'poi-proximity': { poiId: string; poiData: unknown; distance: number; timestamp: number };
  'poi-interaction': { poiId: string; poiData: unknown; timestamp: number; interactionType: string };
  'poi-panel-close': Record<string, never>;
  'navigate-to-poi': { poiId: string; position: { x: number; y: number } };
  'venue-selected': { venueId: VenueId };
  'venue-changed': { venueId: VenueId };
  'floor-changed': { floor: number; venueId: VenueId; indoorVenueId: string };
  'entered-building': {
    building?: string;
    venueId: VenueId;
    indoorVenueId?: string;
    floors?: number[];
    floor?: number;
    currentFloor?: number;
    displayName?: string;
    totalFloors?: number;
  };
  'exited-building': { venueId: VenueId };
  'switch-floor': number;
  'player-moved': { x: number; y: number; zone: string; venueId?: VenueId };
  'presence-update': { users: UserPresence[] };
  'attendee-selected': { uid: string };
  'send-wave': { toUid: string; fromUid?: string; timestamp?: number };
  'focus-attendee': { uid: string };
  'attendee-focused': { uid: string };
  'toggle-attendee-markers': { visible: boolean };
  'cluster-expanded': { attendees: UserPresence[] };
  'action-button-pressed': Record<string, never>;
  'menu-button-pressed': Record<string, never>;
}

export interface UserPresence {
  uid: string;
  displayName: string;
  zone: string;
  status: 'active' | 'idle' | 'away';
}
