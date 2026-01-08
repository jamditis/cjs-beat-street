import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { eventBus } from '../lib/EventBus';
import { VisuallyHidden } from './VisuallyHidden';

interface BuildingInfo {
  building: string;
  floors: number[];
  currentFloor: number;
}

export function FloorSelector() {
  const [buildingInfo, setBuildingInfo] = useState<BuildingInfo | null>(null);
  const [currentFloor, setCurrentFloor] = useState(1);
  const floorGroupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubEnter = eventBus.on('entered-building', (info: unknown) => {
      const buildingData = info as BuildingInfo;
      setBuildingInfo(buildingData);
      setCurrentFloor(buildingData.currentFloor);
    });

    const unsubExit = eventBus.on('exited-building', () => {
      setBuildingInfo(null);
    });

    const unsubFloorChanged = eventBus.on('floor-changed', (data: unknown) => {
      const floorData = data as { floor: number };
      setCurrentFloor(floorData.floor);
    });

    return () => {
      unsubEnter();
      unsubExit();
      unsubFloorChanged();
    };
  }, []);

  const handleFloorChange = useCallback((floor: number) => {
    setCurrentFloor(floor);
    eventBus.emit('switch-floor', floor);
  }, []);

  const goUp = useCallback(() => {
    if (buildingInfo && currentFloor < Math.max(...buildingInfo.floors)) {
      handleFloorChange(currentFloor + 1);
    }
  }, [buildingInfo, currentFloor, handleFloorChange]);

  const goDown = useCallback(() => {
    if (buildingInfo && currentFloor > Math.min(...buildingInfo.floors)) {
      handleFloorChange(currentFloor - 1);
    }
  }, [buildingInfo, currentFloor, handleFloorChange]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!buildingInfo) return;

    const floors = [...buildingInfo.floors].sort((a, b) => b - a); // Descending order
    const currentIndex = floors.indexOf(currentFloor);

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        if (currentIndex > 0) {
          handleFloorChange(floors[currentIndex - 1]);
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (currentIndex < floors.length - 1) {
          handleFloorChange(floors[currentIndex + 1]);
        }
        break;
      case 'Home':
        event.preventDefault();
        handleFloorChange(floors[0]); // Top floor
        break;
      case 'End':
        event.preventDefault();
        handleFloorChange(floors[floors.length - 1]); // Bottom floor
        break;
    }
  }, [buildingInfo, currentFloor, handleFloorChange]);

  if (!buildingInfo) {
    return null;
  }

  const minFloor = Math.min(...buildingInfo.floors);
  const maxFloor = Math.max(...buildingInfo.floors);
  const canGoUp = currentFloor < maxFloor;
  const canGoDown = currentFloor > minFloor;

  return (
    <AnimatePresence>
      {buildingInfo && (
        <motion.nav
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="fixed left-4 top-1/2 -translate-y-1/2 bg-paper rounded-xl shadow-lg p-3 z-40"
          aria-label={`Floor navigation for ${buildingInfo.building}`}
          role="navigation"
        >
          <VisuallyHidden>
            <span aria-live="polite" aria-atomic="true">
              Currently on floor {currentFloor} of {buildingInfo.building}
            </span>
          </VisuallyHidden>

          <button
            onClick={goUp}
            disabled={!canGoUp}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-cream disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
            aria-label={canGoUp ? `Go up to floor ${currentFloor + 1}` : 'At top floor'}
          >
            <ChevronUp className="w-6 h-6 text-ink" aria-hidden="true" />
          </button>

          <div
            ref={floorGroupRef}
            className="py-2 space-y-1"
            role="radiogroup"
            aria-label="Select floor"
            onKeyDown={handleKeyDown}
          >
            {[...buildingInfo.floors].reverse().map((floor) => {
              const isSelected = floor === currentFloor;
              return (
                <button
                  key={floor}
                  onClick={() => handleFloorChange(floor)}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  className={`w-10 h-10 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 ${
                    isSelected
                      ? 'bg-teal-600 text-white'
                      : 'bg-cream text-ink hover:bg-teal-600/20'
                  }`}
                  aria-label={`Floor ${floor}${isSelected ? ', current floor' : ''}`}
                >
                  {floor}
                </button>
              );
            })}
          </div>

          <button
            onClick={goDown}
            disabled={!canGoDown}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-cream disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
            aria-label={canGoDown ? `Go down to floor ${currentFloor - 1}` : 'At bottom floor'}
          >
            <ChevronDown className="w-6 h-6 text-ink" aria-hidden="true" />
          </button>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
