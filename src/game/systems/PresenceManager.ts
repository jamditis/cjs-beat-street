import Phaser from 'phaser';
import { AttendeeMarker, AttendeeMarkerConfig } from '../entities/AttendeeMarker';
import { eventBus, UserPresence } from '../../lib/EventBus';

export interface PresenceManagerConfig {
  scene: Phaser.Scene;
  maxVisibleMarkers?: number;
  clusterDistance?: number;
  enabled?: boolean;
}

interface ClusterGroup {
  x: number;
  y: number;
  attendees: UserPresence[];
}

export class PresenceManager {
  private scene: Phaser.Scene;
  private markers: Map<string, AttendeeMarker> = new Map();
  private currentZone = '';
  private enabled: boolean;
  private maxVisibleMarkers: number;
  private clusterDistance: number;

  // Clustering
  private clusterLabels: Map<string, Phaser.GameObjects.Text> = new Map();

  // Performance settings
  private updateInterval = 1000; // Update every second
  private lastUpdate = 0;

  // Event listener cleanup functions
  private eventUnsubscribers: (() => void)[] = [];

  constructor(config: PresenceManagerConfig) {
    this.scene = config.scene;
    this.enabled = config.enabled ?? true;
    this.maxVisibleMarkers = config.maxVisibleMarkers ?? 50;
    this.clusterDistance = config.clusterDistance ?? 80;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for presence updates from EventBus
    this.eventUnsubscribers.push(
      eventBus.on('presence-update', (data: unknown) => {
        const presenceData = data as { users: UserPresence[] };
        this.updateMarkers(presenceData.users);
      })
    );

    // Listen for zone changes
    this.eventUnsubscribers.push(
      eventBus.on('player-moved', (data: unknown) => {
        const moveData = data as { zone: string };
        if (moveData.zone !== this.currentZone) {
          this.currentZone = moveData.zone;
          this.updateMarkerVisibility();
        }
      })
    );

    // Listen for attendee selection requests
    this.eventUnsubscribers.push(
      eventBus.on('focus-attendee', (data: unknown) => {
        const focusData = data as { uid: string };
        this.focusOnAttendee(focusData.uid);
      })
    );

    // Listen for show/hide requests
    this.eventUnsubscribers.push(
      eventBus.on('toggle-attendee-markers', (data: unknown) => {
        const toggleData = data as { visible: boolean };
        this.setVisible(toggleData.visible);
      })
    );
  }

  private updateMarkers(users: UserPresence[]): void {
    if (!this.enabled) return;

    // Remove markers for users no longer present
    const currentUIDs = new Set(users.map((u) => u.uid));
    for (const [uid, _marker] of this.markers.entries()) {
      if (!currentUIDs.has(uid)) {
        this.removeMarker(uid);
      }
    }

    // Limit visible markers for performance
    const visibleUsers = users.slice(0, this.maxVisibleMarkers);

    // Update or create markers for current users
    for (const user of visibleUsers) {
      const marker = this.markers.get(user.uid);
      if (marker) {
        // Update existing marker
        marker.updateStatus(user.status);
        // Position will be updated based on zone logic
      } else {
        // Create new marker
        this.createMarker(user);
      }
    }

    // Update clustering
    this.updateClusters(visibleUsers);
  }

  private createMarker(user: UserPresence): void {
    // Calculate position based on user data
    // In a real implementation, this would map zone to actual coordinates
    const position = this.calculatePositionForUser(user);

    const config: AttendeeMarkerConfig = {
      scene: this.scene,
      x: position.x,
      y: position.y,
      uid: user.uid,
      displayName: user.displayName,
      status: user.status,
      onClick: (uid: string) => this.handleMarkerClick(uid),
    };

    const marker = new AttendeeMarker(config);
    this.markers.set(user.uid, marker);
  }

  private removeMarker(uid: string): void {
    const marker = this.markers.get(uid);
    if (marker) {
      marker.destroy();
      this.markers.delete(uid);
    }
  }

  private calculatePositionForUser(user: UserPresence): { x: number; y: number } {
    // This is a placeholder implementation
    // In a real app, you'd map zone names to actual coordinates
    // or get position data from the presence service

    // For now, distribute users semi-randomly within zone
    const baseX = this.scene.cameras.main.centerX;
    const baseY = this.scene.cameras.main.centerY;

    // Use uid hash for deterministic but varied positioning
    const hash = this.hashString(user.uid);
    const angle = (hash % 360) * (Math.PI / 180);
    const distance = 100 + (hash % 200);

    return {
      x: baseX + Math.cos(angle) * distance,
      y: baseY + Math.sin(angle) * distance,
    };
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private updateClusters(users: UserPresence[]): void {
    // Clear old cluster labels
    for (const label of this.clusterLabels.values()) {
      label.destroy();
    }
    this.clusterLabels.clear();

    if (!this.enabled || users.length === 0) return;

    // Find clusters of nearby attendees
    const clusters = this.findClusters(users);

    // Create cluster labels for groups of 3+
    for (const cluster of clusters) {
      if (cluster.attendees.length >= 3) {
        this.createClusterLabel(cluster);

        // Hide individual markers in the cluster
        for (const attendee of cluster.attendees) {
          const marker = this.markers.get(attendee.uid);
          if (marker) {
            marker.setVisible(false);
          }
        }
      }
    }
  }

  private findClusters(users: UserPresence[]): ClusterGroup[] {
    const clusters: ClusterGroup[] = [];
    const processed = new Set<string>();

    for (const user of users) {
      if (processed.has(user.uid)) continue;

      const marker = this.markers.get(user.uid);
      if (!marker) continue;

      const pos = marker.getPosition();
      const cluster: ClusterGroup = {
        x: pos.x,
        y: pos.y,
        attendees: [user],
      };

      // Find nearby markers
      for (const otherUser of users) {
        if (otherUser.uid === user.uid || processed.has(otherUser.uid)) continue;

        const otherMarker = this.markers.get(otherUser.uid);
        if (!otherMarker) continue;

        const otherPos = otherMarker.getPosition();
        const distance = Phaser.Math.Distance.Between(
          pos.x,
          pos.y,
          otherPos.x,
          otherPos.y
        );

        if (distance < this.clusterDistance) {
          cluster.attendees.push(otherUser);
          processed.add(otherUser.uid);
        }
      }

      if (cluster.attendees.length > 1) {
        // Calculate cluster center
        const centerX =
          cluster.attendees.reduce((sum, a) => {
            const m = this.markers.get(a.uid);
            return sum + (m?.getPosition().x || 0);
          }, 0) / cluster.attendees.length;

        const centerY =
          cluster.attendees.reduce((sum, a) => {
            const m = this.markers.get(a.uid);
            return sum + (m?.getPosition().y || 0);
          }, 0) / cluster.attendees.length;

        cluster.x = centerX;
        cluster.y = centerY;
        clusters.push(cluster);
      }

      processed.add(user.uid);
    }

    return clusters;
  }

  private createClusterLabel(cluster: ClusterGroup): void {
    const count = cluster.attendees.length;
    const text = this.scene.add.text(cluster.x, cluster.y, `+${count}`, {
      font: 'bold 16px Source Sans 3',
      color: '#ffffff',
      backgroundColor: '#2a9d8f',
      padding: { x: 8, y: 4 },
    });

    text.setOrigin(0.5);
    text.setDepth(51);
    text.setInteractive({ useHandCursor: true });

    // Click to expand cluster
    text.on('pointerdown', () => {
      this.expandCluster(cluster);
    });

    const clusterId = cluster.attendees.map((a) => a.uid).join('-');
    this.clusterLabels.set(clusterId, text);
  }

  private expandCluster(cluster: ClusterGroup): void {
    // Show all markers in the cluster
    for (const attendee of cluster.attendees) {
      const marker = this.markers.get(attendee.uid);
      if (marker) {
        marker.setVisible(true);
      }
    }

    // Remove cluster label
    const clusterId = cluster.attendees.map((a) => a.uid).join('-');
    const label = this.clusterLabels.get(clusterId);
    if (label) {
      label.destroy();
      this.clusterLabels.delete(clusterId);
    }

    // Emit event for React to show list
    eventBus.emit('cluster-expanded', { attendees: cluster.attendees });
  }

  private handleMarkerClick(uid: string): void {
    // Emit event for React to show attendee card
    eventBus.emit('attendee-selected', { uid });
  }

  private updateMarkerVisibility(): void {
    // In a real implementation, hide markers not in current zone
    // For now, all markers remain visible
    for (const marker of this.markers.values()) {
      marker.setVisible(this.enabled);
    }
  }

  public update(time: number): void {
    if (!this.enabled) return;

    // Throttle updates for performance
    if (time - this.lastUpdate < this.updateInterval) return;
    this.lastUpdate = time;

    // Update all markers
    for (const marker of this.markers.values()) {
      marker.update();
    }
  }

  public showAttendees(): void {
    this.enabled = true;
    for (const marker of this.markers.values()) {
      marker.setVisible(true);
    }
  }

  public hideAttendees(): void {
    this.enabled = false;
    for (const marker of this.markers.values()) {
      marker.setVisible(false);
    }
    // Also hide cluster labels
    for (const label of this.clusterLabels.values()) {
      label.setVisible(false);
    }
  }

  public setVisible(visible: boolean): void {
    if (visible) {
      this.showAttendees();
    } else {
      this.hideAttendees();
    }
  }

  public focusOnAttendee(uid: string): void {
    const marker = this.markers.get(uid);
    if (!marker) return;

    const pos = marker.getPosition();

    // Animate camera to marker position
    this.scene.cameras.main.pan(pos.x, pos.y, 1000, 'Power2');

    // Highlight the marker
    marker.setNameLabelVisible(true);
    this.scene.time.delayedCall(3000, () => {
      marker.setNameLabelVisible(false);
    });

    // Emit event so React knows we focused
    eventBus.emit('attendee-focused', { uid });
  }

  public destroy(): void {
    // Unsubscribe from all EventBus events
    for (const unsubscribe of this.eventUnsubscribers) {
      unsubscribe();
    }
    this.eventUnsubscribers = [];

    // Clean up all markers
    for (const marker of this.markers.values()) {
      marker.destroy();
    }
    this.markers.clear();

    // Clean up cluster labels
    for (const label of this.clusterLabels.values()) {
      label.destroy();
    }
    this.clusterLabels.clear();
  }

  public getMarkerCount(): number {
    return this.markers.size;
  }

  public hasMarker(uid: string): boolean {
    return this.markers.has(uid);
  }
}
