import Phaser from 'phaser';
import { eventBus } from '../../lib/EventBus';

export interface NavigationTarget {
  poiId: string;
  position: { x: number; y: number };
  name?: string;
}

export interface NavigationManagerConfig {
  scene: Phaser.Scene;
  arrivalThreshold?: number; // Distance in pixels to consider "arrived"
}

export class NavigationManager {
  private scene: Phaser.Scene;
  private currentTarget: NavigationTarget | null = null;
  private playerPosition: { x: number; y: number } | null = null;
  private arrivalThreshold: number;
  private updateTimer?: Phaser.Time.TimerEvent;
  private hasArrived = false;

  constructor(config: NavigationManagerConfig) {
    this.scene = config.scene;
    this.arrivalThreshold = config.arrivalThreshold || 50; // 50 pixels default

    // Listen for navigation requests
    this.setupNavigationListener();

    // Listen for player movement
    this.setupPlayerTracking();

    // Setup periodic distance updates
    this.setupDistanceUpdates();
  }

  /**
   * Start navigating to a position
   */
  public navigateTo(x: number, y: number, poiId?: string, name?: string): void {
    this.currentTarget = {
      poiId: poiId || 'unknown',
      position: { x, y },
      name,
    };
    this.hasArrived = false;

    // Emit navigation started event
    eventBus.emit('navigation-started', {
      target: this.currentTarget,
      distance: this.getDistanceToTarget(),
    });
  }

  /**
   * Cancel current navigation
   */
  public cancelNavigation(): void {
    if (this.currentTarget) {
      eventBus.emit('navigation-cancelled', {
        target: this.currentTarget,
      });
      this.currentTarget = null;
      this.hasArrived = false;
    }
  }

  /**
   * Get distance to current target
   */
  public getDistanceToTarget(): number | null {
    if (!this.currentTarget || !this.playerPosition) {
      return null;
    }

    return Phaser.Math.Distance.Between(
      this.playerPosition.x,
      this.playerPosition.y,
      this.currentTarget.position.x,
      this.currentTarget.position.y
    );
  }

  /**
   * Get direction to target (angle in radians)
   */
  public getDirectionToTarget(): number | null {
    if (!this.currentTarget || !this.playerPosition) {
      return null;
    }

    return Phaser.Math.Angle.Between(
      this.playerPosition.x,
      this.playerPosition.y,
      this.currentTarget.position.x,
      this.currentTarget.position.y
    );
  }

  /**
   * Get compass direction as string (N, NE, E, SE, S, SW, W, NW)
   */
  public getCompassDirection(): string | null {
    const angle = this.getDirectionToTarget();
    if (angle === null) return null;

    // Convert radians to degrees (0-360)
    let degrees = Phaser.Math.RadToDeg(angle);
    if (degrees < 0) degrees += 360;

    // Convert to compass direction
    const directions = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  }

  /**
   * Check if currently navigating
   */
  public isNavigating(): boolean {
    return this.currentTarget !== null;
  }

  /**
   * Get current navigation target
   */
  public getCurrentTarget(): NavigationTarget | null {
    return this.currentTarget;
  }

  /**
   * Get current player position
   */
  public getPlayerPosition(): { x: number; y: number } | null {
    return this.playerPosition;
  }

  /**
   * Set arrival threshold distance
   */
  public setArrivalThreshold(threshold: number): void {
    this.arrivalThreshold = threshold;
  }

  /**
   * Listen for navigation events from EventBus
   */
  private setupNavigationListener(): void {
    const unsubscribe = eventBus.on('navigate-to-poi', (data: unknown) => {
      const navData = data as { poiId: string; position: { x: number; y: number }; name?: string };
      this.navigateTo(navData.position.x, navData.position.y, navData.poiId, navData.name);
    });

    // Cleanup on scene shutdown
    this.scene.events.once('shutdown', () => {
      unsubscribe();
    });

    // Listen for cancel navigation events
    const unsubCancel = eventBus.on('cancel-navigation', () => {
      this.cancelNavigation();
    });

    this.scene.events.once('shutdown', () => {
      unsubCancel();
    });
  }

  /**
   * Track player position from movement events
   */
  private setupPlayerTracking(): void {
    const unsubscribe = eventBus.on('player-moved', (data: unknown) => {
      const moveData = data as { x: number; y: number; zone: string };
      this.playerPosition = { x: moveData.x, y: moveData.y };
    });

    this.scene.events.once('shutdown', () => {
      unsubscribe();
    });
  }

  /**
   * Periodically update distance and check for arrival
   */
  private setupDistanceUpdates(): void {
    this.updateTimer = this.scene.time.addEvent({
      delay: 100, // Update every 100ms
      callback: () => this.updateNavigation(),
      loop: true,
    });
  }

  /**
   * Update navigation state and emit events
   */
  private updateNavigation(): void {
    if (!this.currentTarget || !this.playerPosition) {
      return;
    }

    const distance = this.getDistanceToTarget();
    const direction = this.getDirectionToTarget();
    const compass = this.getCompassDirection();

    if (distance === null || direction === null) {
      return;
    }

    // Emit navigation update event
    eventBus.emit('navigation-update', {
      target: this.currentTarget,
      distance,
      direction,
      compass,
      playerPosition: this.playerPosition,
    });

    // Check for arrival
    if (!this.hasArrived && distance <= this.arrivalThreshold) {
      this.hasArrived = true;
      eventBus.emit('navigation-arrived', {
        target: this.currentTarget,
      });

      // Auto-cancel navigation after arrival
      setTimeout(() => {
        this.cancelNavigation();
      }, 2000); // Give 2 seconds to show "arrived" message
    }
  }

  /**
   * Cleanup and destroy the manager
   */
  public destroy(): void {
    if (this.updateTimer) {
      this.updateTimer.destroy();
    }
    this.currentTarget = null;
    this.playerPosition = null;
  }
}
