import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Navigation, MapPin, Clock } from 'lucide-react';
import { eventBus } from '../lib/EventBus';

interface NavigationState {
  isNavigating: boolean;
  targetName?: string;
  distance: number | null;
  compass: string | null;
  hasArrived: boolean;
}

export function NavigationOverlay() {
  const [navState, setNavState] = useState<NavigationState>({
    isNavigating: false,
    distance: null,
    compass: null,
    hasArrived: false,
  });

  useEffect(() => {
    // Navigation started
    const unsubStart = eventBus.on('navigation-started', (data: unknown) => {
      const navData = data as { target: { name?: string }; distance: number | null };
      setNavState({
        isNavigating: true,
        targetName: navData.target.name,
        distance: navData.distance,
        compass: null,
        hasArrived: false,
      });
    });

    // Navigation update
    const unsubUpdate = eventBus.on('navigation-update', (data: unknown) => {
      const navData = data as { distance: number; compass: string };
      setNavState((prev) => ({
        ...prev,
        distance: navData.distance,
        compass: navData.compass,
      }));
    });

    // Navigation arrived
    const unsubArrived = eventBus.on('navigation-arrived', () => {
      setNavState((prev) => ({
        ...prev,
        hasArrived: true,
      }));
    });

    // Navigation cancelled
    const unsubCancel = eventBus.on('navigation-cancelled', () => {
      setNavState({
        isNavigating: false,
        distance: null,
        compass: null,
        hasArrived: false,
      });
    });

    return () => {
      unsubStart();
      unsubUpdate();
      unsubArrived();
      unsubCancel();
    };
  }, []);

  const handleCancel = () => {
    eventBus.emit('cancel-navigation');
  };

  const formatDistance = (distance: number | null): string => {
    if (distance === null) return '...';
    return distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`;
  };

  const getETA = (distance: number | null): string => {
    if (distance === null) return '...';
    // Assume walking speed of ~5 km/h = 83 m/min
    const minutes = Math.ceil(distance / 83);
    if (minutes < 1) return '< 1 min';
    return `${minutes} min`;
  };

  const getCompassRotation = (compass: string | null): number => {
    if (!compass) return 0;
    const rotations: Record<string, number> = {
      N: 0,
      NE: 45,
      E: 90,
      SE: 135,
      S: 180,
      SW: 225,
      W: 270,
      NW: 315,
    };
    return rotations[compass] || 0;
  };

  return (
    <AnimatePresence>
      {navState.isNavigating && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-40"
        >
          <div className="bg-paper shadow-lg rounded-xl p-4 min-w-[320px] border border-cream">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                  <Navigation className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-ink/60 uppercase tracking-wide">
                    {navState.hasArrived ? 'Arrived' : 'Navigating to'}
                  </div>
                  <div className="text-sm font-semibold text-ink">
                    {navState.targetName || 'Destination'}
                  </div>
                </div>
              </div>
              <button
                onClick={handleCancel}
                className="p-1.5 rounded-full hover:bg-cream transition-colors"
                aria-label="Cancel navigation"
              >
                <X className="w-4 h-4 text-ink/70" />
              </button>
            </div>

            {/* Arrival Message */}
            {navState.hasArrived && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-teal-600/10 text-teal-600 rounded-lg p-3 mb-3 text-center font-semibold"
              >
                You have arrived!
              </motion.div>
            )}

            {/* Navigation Info */}
            {!navState.hasArrived && (
              <div className="grid grid-cols-2 gap-3">
                {/* Distance */}
                <div className="bg-cream rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-600" />
                    <div className="text-xs font-semibold text-ink/60">Distance</div>
                  </div>
                  <div className="text-xl font-bold text-ink">
                    {formatDistance(navState.distance)}
                  </div>
                </div>

                {/* ETA */}
                <div className="bg-cream rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                    <div className="text-xs font-semibold text-ink/60">ETA</div>
                  </div>
                  <div className="text-xl font-bold text-ink">
                    {getETA(navState.distance)}
                  </div>
                </div>
              </div>
            )}

            {/* Compass Direction */}
            {!navState.hasArrived && navState.compass && (
              <div className="mt-3 flex items-center justify-center gap-3 bg-cream rounded-lg p-3">
                <div className="text-sm font-semibold text-ink/80">Direction:</div>
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: getCompassRotation(navState.compass) }}
                    transition={{ type: 'spring', damping: 15, stiffness: 150 }}
                    className="w-6 h-6"
                  >
                    <Navigation className="w-full h-full text-teal-600" />
                  </motion.div>
                  <div className="text-lg font-bold text-ink">
                    {navState.compass}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
