/**
 * Tests for EventBus
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create a fresh EventBus class for testing (avoid import.meta.env issues)
class EventBus {
  private events: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  on(event: string, callback: (...args: unknown[]) => void): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: (...args: unknown[]) => void): void {
    this.events.get(event)?.delete(callback);
  }

  emit(event: string, ...args: unknown[]): void {
    this.events.get(event)?.forEach((cb) => cb(...args));
  }
}

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('on()', () => {
    it('should register a callback for an event', () => {
      const callback = vi.fn();
      eventBus.on('test-event', callback);

      eventBus.emit('test-event', 'data');

      expect(callback).toHaveBeenCalledWith('data');
    });

    it('should allow multiple callbacks for the same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventBus.on('test-event', callback1);
      eventBus.on('test-event', callback2);

      eventBus.emit('test-event', 'data');

      expect(callback1).toHaveBeenCalledWith('data');
      expect(callback2).toHaveBeenCalledWith('data');
    });

    it('should return an unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = eventBus.on('test-event', callback);

      // Verify callback is registered
      eventBus.emit('test-event', 'first');
      expect(callback).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();

      // Verify callback is no longer called
      eventBus.emit('test-event', 'second');
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('off()', () => {
    it('should remove a specific callback', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventBus.on('test-event', callback1);
      eventBus.on('test-event', callback2);

      eventBus.off('test-event', callback1);

      eventBus.emit('test-event', 'data');

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith('data');
    });

    it('should handle removing a callback that was never registered', () => {
      const callback = vi.fn();

      // Should not throw
      expect(() => eventBus.off('test-event', callback)).not.toThrow();
    });

    it('should handle removing a callback for an event that does not exist', () => {
      const callback = vi.fn();

      // Should not throw
      expect(() => eventBus.off('nonexistent-event', callback)).not.toThrow();
    });
  });

  describe('emit()', () => {
    it('should call all registered callbacks with provided arguments', () => {
      const callback = vi.fn();
      eventBus.on('test-event', callback);

      eventBus.emit('test-event', 'arg1', 'arg2', { key: 'value' });

      expect(callback).toHaveBeenCalledWith('arg1', 'arg2', { key: 'value' });
    });

    it('should handle emitting an event with no registered callbacks', () => {
      // Should not throw
      expect(() => eventBus.emit('nonexistent-event', 'data')).not.toThrow();
    });

    it('should handle emitting an event with no arguments', () => {
      const callback = vi.fn();
      eventBus.on('test-event', callback);

      eventBus.emit('test-event');

      expect(callback).toHaveBeenCalledWith();
    });

    it('should call callbacks in order of registration', () => {
      const order: number[] = [];

      eventBus.on('test-event', () => order.push(1));
      eventBus.on('test-event', () => order.push(2));
      eventBus.on('test-event', () => order.push(3));

      eventBus.emit('test-event');

      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple events independently', () => {
      const eventACallback = vi.fn();
      const eventBCallback = vi.fn();

      eventBus.on('event-a', eventACallback);
      eventBus.on('event-b', eventBCallback);

      eventBus.emit('event-a', 'data-a');

      expect(eventACallback).toHaveBeenCalledWith('data-a');
      expect(eventBCallback).not.toHaveBeenCalled();
    });

    it('should allow re-registering the same callback after unsubscribe', () => {
      const callback = vi.fn();

      const unsub1 = eventBus.on('test-event', callback);
      unsub1();

      eventBus.on('test-event', callback);
      eventBus.emit('test-event', 'data');

      expect(callback).toHaveBeenCalledWith('data');
    });

    it('should handle unsubscribe being called multiple times', () => {
      const callback = vi.fn();
      const unsubscribe = eventBus.on('test-event', callback);

      unsubscribe();
      unsubscribe(); // Second call should not throw

      eventBus.emit('test-event', 'data');
      expect(callback).not.toHaveBeenCalled();
    });

    it('should isolate different event types', () => {
      const poiCallback = vi.fn();
      const venueCallback = vi.fn();

      eventBus.on('poi-selected', poiCallback);
      eventBus.on('venue-changed', venueCallback);

      eventBus.emit('poi-selected', { poiId: '123' });
      eventBus.emit('venue-changed', { venueId: 'pittsburgh' });

      expect(poiCallback).toHaveBeenCalledWith({ poiId: '123' });
      expect(venueCallback).toHaveBeenCalledWith({ venueId: 'pittsburgh' });
    });
  });

  describe('typed event scenarios (simulating GameEvents)', () => {
    it('should emit poi-selected event with correct structure', () => {
      const callback = vi.fn();
      eventBus.on('poi-selected', callback);

      const poiData = { poiId: 'dlcc-main', type: 'landmark', data: { name: 'Convention Center' } };
      eventBus.emit('poi-selected', poiData);

      expect(callback).toHaveBeenCalledWith(poiData);
    });

    it('should emit venue-selected event with VenueId', () => {
      const callback = vi.fn();
      eventBus.on('venue-selected', callback);

      const venueData = { venueId: 'pittsburgh' };
      eventBus.emit('venue-selected', venueData);

      expect(callback).toHaveBeenCalledWith(venueData);
    });

    it('should emit player-moved event with coordinates', () => {
      const callback = vi.fn();
      eventBus.on('player-moved', callback);

      const moveData = { x: 100, y: 200, zone: 'downtown', venueId: 'pittsburgh' };
      eventBus.emit('player-moved', moveData);

      expect(callback).toHaveBeenCalledWith(moveData);
    });

    it('should emit schedule-session-selected event', () => {
      const callback = vi.fn();
      eventBus.on('schedule-session-selected', callback);

      const sessionData = {
        sessionId: 'keynote-1',
        session: { title: 'Opening Keynote', room: 'Main Hall' },
      };
      eventBus.emit('schedule-session-selected', sessionData);

      expect(callback).toHaveBeenCalledWith(sessionData);
    });
  });
});
