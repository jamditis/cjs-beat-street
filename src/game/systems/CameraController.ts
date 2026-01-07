import Phaser from 'phaser';

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

  constructor(scene: Phaser.Scene, config: CameraConfig) {
    this.scene = scene;
    this.camera = config.camera;
    this.minZoom = config.zoomRange?.min || 0.5;
    this.maxZoom = config.zoomRange?.max || 2;

    // Set world bounds if provided
    if (config.worldBounds) {
      this.camera.setBounds(
        config.worldBounds.x,
        config.worldBounds.y,
        config.worldBounds.width,
        config.worldBounds.height
      );
    }

    // Setup zoom controls
    this.setupZoomControls();

    // Setup deadzone for smoother following
    if (config.deadzone) {
      this.camera.setDeadzone(config.deadzone.width, config.deadzone.height);
    }
  }

  private setupZoomControls(): void {
    if (!this.scene.input.keyboard) return;

    // Plus/Minus keys for zoom
    this.zoomInKey = this.scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.PLUS
    );
    this.zoomOutKey = this.scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.MINUS
    );

    this.zoomInKey.on('down', () => this.zoomIn());
    this.zoomOutKey.on('down', () => this.zoomOut());

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
    // Any per-frame camera updates can go here
    // Currently handled by Phaser's built-in camera follow
  }
}
