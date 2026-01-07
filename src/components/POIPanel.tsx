import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Calendar, Building2 } from 'lucide-react';
import { eventBus } from '../lib/EventBus';

interface POIData {
  poiId: string;
  type: string;
  data: {
    name: string;
    floor?: number;
    description?: string;
    time?: string;
  };
}

export function POIPanel() {
  const [selectedPOI, setSelectedPOI] = useState<POIData | null>(null);

  useEffect(() => {
    const unsubscribe = eventBus.on('poi-selected', (poi: unknown) => {
      setSelectedPOI(poi as POIData);
    });

    return unsubscribe;
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'session':
        return <Calendar className="w-5 h-5" />;
      case 'sponsor':
        return <Building2 className="w-5 h-5" />;
      default:
        return <MapPin className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'session':
        return 'Session';
      case 'sponsor':
        return 'Sponsor Booth';
      case 'food':
        return 'Food & Drinks';
      case 'landmark':
        return 'Landmark';
      default:
        return 'Point of Interest';
    }
  };

  return (
    <AnimatePresence>
      {selectedPOI && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-80 bg-paper shadow-xl z-50 p-6"
        >
          <button
            onClick={() => setSelectedPOI(null)}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-cream transition-colors"
          >
            <X className="w-5 h-5 text-ink" />
          </button>

          <div className="flex items-center gap-2 text-teal-600 mb-2">
            {getTypeIcon(selectedPOI.type)}
            <span className="text-sm font-semibold uppercase tracking-wide">
              {getTypeLabel(selectedPOI.type)}
            </span>
          </div>

          <h2 className="font-display text-2xl text-ink mb-4">
            {selectedPOI.data.name}
          </h2>

          {selectedPOI.data.floor && (
            <p className="text-ink/70 text-sm mb-4">
              Floor {selectedPOI.data.floor}
            </p>
          )}

          {selectedPOI.data.description && (
            <p className="text-ink/80 mb-6">{selectedPOI.data.description}</p>
          )}

          {selectedPOI.data.time && (
            <div className="flex items-center gap-2 text-ink/70 mb-4">
              <Calendar className="w-4 h-4" />
              <span>{selectedPOI.data.time}</span>
            </div>
          )}

          <button className="w-full py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors">
            Get Directions
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
