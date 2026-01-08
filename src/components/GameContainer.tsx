import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { gameConfig } from '../game/config';

// Module-level singleton to survive React Strict Mode double-mounting
let gameInstance: Phaser.Game | null = null;
let instanceCount = 0;

export function GameContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Prevent double initialization in Strict Mode
    if (mountedRef.current) {
      return;
    }
    mountedRef.current = true;
    instanceCount++;

    if (!gameInstance && containerRef.current) {
      try {
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) {
          console.warn('[GameContainer] Container has no dimensions, waiting for layout...');
          const rafId = requestAnimationFrame(() => {
            if (containerRef.current) {
              try {
                gameInstance = new Phaser.Game({
                  ...gameConfig,
                  scale: {
                    ...gameConfig.scale,
                    width: containerRef.current.clientWidth || window.innerWidth || 800,
                    height: containerRef.current.clientHeight || window.innerHeight || 600,
                  },
                });

                if (import.meta.env.DEV) {
                  (window as unknown as { __phaserGame: Phaser.Game }).__phaserGame = gameInstance;
                }
              } catch (e) {
                console.error('[GameContainer] Failed to initialize Phaser:', e);
                setError(e instanceof Error ? e.message : 'Failed to initialize game');
              }
            }
          });

          return () => cancelAnimationFrame(rafId);
        }

        gameInstance = new Phaser.Game({
          ...gameConfig,
          scale: {
            ...gameConfig.scale,
            width: rect.width || window.innerWidth || 800,
            height: rect.height || window.innerHeight || 600,
          },
        });

        if (import.meta.env.DEV) {
          (window as unknown as { __phaserGame: Phaser.Game }).__phaserGame = gameInstance;
        }
      } catch (e) {
        console.error('[GameContainer] Failed to initialize Phaser:', e);
        setError(e instanceof Error ? e.message : 'Failed to initialize game');
      }
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

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-cream">
        <div className="text-center p-8">
          <p className="text-red-600 font-medium mb-2">Failed to initialize game</p>
          <p className="text-ink/60 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} id="game-container" className="w-full h-full" />;
}
