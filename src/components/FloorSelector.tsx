import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { eventBus } from '../lib/EventBus';

interface BuildingInfo {
  building: string;
  floors: number[];
  currentFloor: number;
}

export function FloorSelector() {
  const [buildingInfo, setBuildingInfo] = useState<BuildingInfo | null>(null);
  const [currentFloor, setCurrentFloor] = useState(1);

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

  const handleFloorChange = (floor: number) => {
    setCurrentFloor(floor);
    eventBus.emit('switch-floor', floor);
  };

  const goUp = () => {
    if (buildingInfo && currentFloor < Math.max(...buildingInfo.floors)) {
      handleFloorChange(currentFloor + 1);
    }
  };

  const goDown = () => {
    if (buildingInfo && currentFloor > Math.min(...buildingInfo.floors)) {
      handleFloorChange(currentFloor - 1);
    }
  };

  return (
    <AnimatePresence>
      {buildingInfo && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="fixed left-4 top-1/2 -translate-y-1/2 bg-paper rounded-xl shadow-lg p-3 z-40"
        >
          <button
            onClick={goUp}
            disabled={currentFloor >= Math.max(...buildingInfo.floors)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-cream disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronUp className="w-6 h-6 text-ink" />
          </button>

          <div className="py-2 space-y-1">
            {[...buildingInfo.floors].reverse().map((floor) => (
              <button
                key={floor}
                onClick={() => handleFloorChange(floor)}
                className={`w-10 h-10 rounded-lg font-semibold transition-colors ${
                  floor === currentFloor
                    ? 'bg-teal-600 text-white'
                    : 'bg-cream text-ink hover:bg-teal-600/20'
                }`}
              >
                {floor}
              </button>
            ))}
          </div>

          <button
            onClick={goDown}
            disabled={currentFloor <= Math.min(...buildingInfo.floors)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-cream disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronDown className="w-6 h-6 text-ink" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
