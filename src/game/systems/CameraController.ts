import Phaser from 'phaser';
import { eventBus } from '../../lib/EventBus';

export interface CameraConfig {
  camera: Phaser.Cameras.Scene2D.Camera;
  worldBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  zoomRange?: {
    min: number;
    max: number;
  };
  deadzone?: {
    width: number;
    height: number;
  };
}

export class CameraController {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private scene: Phaser.Scene;
  private currentZoom = 1;
  private readonly minZoom: number;
  private readonly maxZoom: number;
  private zoomSpeed = 0.1;

  private zoomInKey: Phaser.Input.Keyboard.Key | null = null;
  private zoomOutKey: Phaser.Input.Keyboard.Key | null = null;
  private zoomInKeyMain: Phaser.Input.Keyboard.Key | null = null;
  private zoomOutKeyMain: Phaser.Input.Keyboard.Key | null = null;

  // Pinch-to-zoom state
  private isPinching = false;
  private pinchStartDistance = 0;
  private pinchStartZoom = 1;
  private readonly pinchDeadZone = 10;
  private readonly joystickZone = { x: 0, y: 0, width: 200, height: 200 };
  private isDestroyed = false;
  private readonly doubleTapZoomAmount = 0.5;
  private eventUnsubscribers: Array<() => void> = [];

  constructor(scene: Phaser.Scene, config: CameraConfig) {
    this.scene = scene;
    this.camera = config.camera;
    this.minZoom = config.zoomRange?.min || 0.5;
    this.maxZoom = config.zoomRange?.max || 2;

    if (config.worldBounds) {
      this.camera.setBounds(
        config.worldBounds.x,
        config.worldBounds.y,
        config.worldBounds.width,
        config.worldBounds.height
      );
    }

    this.setupZoomControls();
    this.setupPinchZoom();
    this.setupDoubleTapZoom();

    if (config.deadzone) {
      this.camera.setDeadzone(config.deadzone.width, config.deadzone.height);
    }
  }

  private setupDoubleTapZoom(): void {
    const unsubscribe = eventBus.on('double-tap-zoom', (data: unknown) => {
      const { x, y, direction } = data as { x: number; y: number; direction: 'in' | 'out' };
      const worldPoint = this.camera.getWorldPoint(x, y);

      if (direction === 'in') {
        this.zoomToPoint(worldPoint.x, worldPoint.y, this.currentZoom + this.doubleTapZoomAmount);
      } else {
        this.zoomToPoint(worldPoint.x, worldPoint.y, this.currentZoom - this.doubleTapZoomAmount);
      }
    });

    this.eventUnsubscribers.push(unsubscribe);
  }

  zoomToPoint(worldX: number, worldY: number, targetZoom: number): void {
    const newZoom = Phaser.Math.Clamp(targetZoom, this.minZoom, this.maxZoom);

    this.scene.tweens.add({
      targets: this,
      currentZoom: newZoom,
      duration: 200,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        this.camera.setZoom(this.currentZoom);
      },
    });

    this.camera.pan(worldX, worldY, 200, 'Sine.easeOut');
  }

  private setupZoomControls(): void {
    if (!this.scene.input.keyboard) return;

    // Numpad Plus/Minus keys for zoom
    this.zoomInKey = this.scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.PLUS
    );
    this.zoomOutKey = this.scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.MINUS
    );

    // Main keyboard = (code 187) and - (code 189) keys for zoom
    // Using raw keycodes since Phaser doesn't have named constants for these
    this.zoomInKeyMain = this.scene.input.keyboard.addKey(187); // = key (same as + on US keyboard)
    this.zoomOutKeyMain = this.scene.input.keyboard.addKey(189); // - key on main keyboard

    this.zoomInKey.on('down', () => this.zoomIn());
    this.zoomOutKey.on('down', () => this.zoomOut());
    this.zoomInKeyMain.on('down', () => this.zoomIn());
    this.zoomOutKeyMain.on('down', () => this.zoomOut());

    // Mouse wheel zoom
    this.scene.input.on('wheel', (
      _pointer: Phaser.Input.Pointer,
      _gameObjects: Phaser.GameObjects.GameObject[],
      _deltaX: number,
      deltaY: number
    ) => {
      if (deltaY > 0) {
        this.zoomOut();
      } else if (deltaY < 0) {
        this.zoomIn();
      }
    });
  }

  private setupPinchZoom(): void {
    this.updateJoystickZone();

    this.scene.input.on('pointerdown', this.onPointerDown, this);
    this.scene.input.on('pointermove', this.onPointerMove, this);
    this.scene.input.on('pointerup', this.onPointerUp, this);
    this.scene.input.on('pointercancel', this.onPointerUp, this);

    this.scene.scale.on('resize', this.updateJoystickZone, this);
  }

  private updateJoystickZone(): void {
    const gameHeight = this.scene.scale.height || window.innerHeight || 600;

    this.joystickZone.x = 0;
    this.joystickZone.y = Math.max(0, gameHeight - 200);
    this.joystickZone.width = 200;
    this.joystickZone.height = 200;
  }

  private isInJoystickZone(x: number, y: number): boolean {
    return (
      x >= this.joystickZone.x &&
      x <= this.joystickZone.x + this.joystickZone.width &&
      y >= this.joystickZone.y &&
      y <= this.joystickZone.y + this.joystickZone.height
    );
  }

  private getActivePointers(): Phaser.Input.Pointer[] {
    const pointers: Phaser.Input.Pointer[] = [];
    const input = this.scene.input;

    if (input.pointer1?.isDown) pointers.push(input.pointer1);
    if (input.pointer2?.isDown) pointers.push(input.pointer2);
    if (input.pointer3?.isDown) pointers.push(input.pointer3);
    if (input.pointer4?.isDown) pointers.push(input.pointer4);

    return pointers;
  }

  private getDistanceBetweenPointers(p1: Phaser.Input.Pointer, p2: Phaser.Input.Pointer): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private onPointerDown = (): void => {
    const pointers = this.getActivePointers();

    if (pointers.length === 2) {
      const pointer1InJoystick = this.isInJoystickZone(pointers[0].x, pointers[0].y);
      const pointer2InJoystick = this.isInJoystickZone(pointers[1].x, pointers[1].y);

      if (pointer1InJoystick || pointer2InJoystick) {
        return;
      }

      this.isPinching = true;
      this.pinchStartDistance = this.getDistanceBetweenPointers(pointers[0], pointers[1]);
      this.pinchStartZoom = this.currentZoom;
    }
  };

  private onPointerMove = (): void => {
    if (!this.isPinching) return;

    const pointers = this.getActivePointers();

    if (pointers.length !== 2) {
      this.isPinching = false;
      return;
    }

    const currentDistance = this.getDistanceBetweenPointers(pointers[0], pointers[1]);
    const distanceDelta = currentDistance - this.pinchStartDistance;

    if (Math.abs(distanceDelta) < this.pinchDeadZone) {
      return;
    }

    const zoomRatio = currentDistance / this.pinchStartDistance;
    const newZoom = this.pinchStartZoom * zoomRatio;

    this.setZoom(newZoom);
  };

  private onPointerUp = (): void => {
    const pointers = this.getActivePointers();

    if (pointers.length < 2) {
      this.isPinching = false;
    }
  };

  followTarget(
    target: Phaser.GameObjects.GameObject,
    lerp: number = 0.1,
    offsetX: number = 0,
    offsetY: number = 0
  ): void {
    this.camera.startFollow(target, true, lerp, lerp, offsetX, offsetY);
  }

  stopFollow(): void {
    this.camera.stopFollow();
  }

  zoomIn(): void {
    this.setZoom(this.currentZoom + this.zoomSpeed);
  }

  zoomOut(): void {
    this.setZoom(this.currentZoom - this.zoomSpeed);
  }

  setZoom(zoom: number): void {
    this.currentZoom = Phaser.Math.Clamp(zoom, this.minZoom, this.maxZoom);
    this.camera.setZoom(this.currentZoom);
  }

  getZoom(): number {
    return this.currentZoom;
  }

  panTo(x: number, y: number, duration: number = 1000): void {
    this.camera.pan(x, y, duration, 'Sine.easeInOut');
  }

  shake(duration: number = 100, intensity: number = 0.005): void {
    this.camera.shake(duration, intensity);
  }

  flash(duration: number = 250, red: number = 255, green: number = 255, blue: number = 255): void {
    this.camera.flash(duration, red, green, blue);
  }

  fadeIn(duration: number = 1000): void {
    this.camera.fadeIn(duration);
  }

  fadeOut(duration: number = 1000): void {
    this.camera.fadeOut(duration);
  }

  setBounds(x: number, y: number, width: number, height: number): void {
    this.camera.setBounds(x, y, width, height);
  }

  setDeadzone(width: number, height: number): void {
    this.camera.setDeadzone(width, height);
  }

  update(): void {
  }

  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    if (this.zoomInKey) {
      this.zoomInKey.off('down');
      this.zoomInKey = null;
    }
    if (this.zoomOutKey) {
      this.zoomOutKey.off('down');
      this.zoomOutKey = null;
    }
    if (this.zoomInKeyMain) {
      this.zoomInKeyMain.off('down');
      this.zoomInKeyMain = null;
    }
    if (this.zoomOutKeyMain) {
      this.zoomOutKeyMain.off('down');
      this.zoomOutKeyMain = null;
    }

    this.scene.input.off('pointerdown', this.onPointerDown, this);
    this.scene.input.off('pointermove', this.onPointerMove, this);
    this.scene.input.off('pointerup', this.onPointerUp, this);
    this.scene.input.off('pointercancel', this.onPointerUp, this);
    this.scene.input.off('wheel');
    this.scene.scale.off('resize', this.updateJoystickZone, this);

    this.eventUnsubscribers.forEach((unsub) => unsub());
    this.eventUnsubscribers = [];
  }
}
