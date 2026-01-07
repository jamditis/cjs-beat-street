import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from '../game/config';

// Module-level singleton to survive React Strict Mode double-mounting
let gameInstance: Phaser.Game | null = null;
let instanceCount = 0;

export function GameContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization in Strict Mode
    if (mountedRef.current) {
      return;
    }
    mountedRef.current = true;
    instanceCount++;

    // Only create game if no instance exists and container is ready
    if (!gameInstance && containerRef.current) {
      gameInstance = new Phaser.Game(gameConfig);
    }

    return () => {
      instanceCount--;

      // Only destroy when all instances are unmounted (handles Strict Mode)
      // Use setTimeout to allow Strict Mode's immediate remount to cancel destruction
      const currentCount = instanceCount;
      setTimeout(() => {
        if (currentCount === instanceCount && instanceCount === 0 && gameInstance) {
          gameInstance.destroy(true);
          gameInstance = null;
        }
      }, 0);

      mountedRef.current = false;
    };
  }, []);

  return <div ref={containerRef} id="game-container" className="w-full h-full" />;
}
