import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MapPin,
  Calendar,
  Building2,
  Coffee,
  Users,
  Info,
  Star,
  Navigation,
  Clock,
  User
} from 'lucide-react';
import { eventBus } from '../lib/EventBus';
import { POIType, POIData as POIDataType, SessionPOI, SponsorPOI, FoodPOI } from '../types/poi';

interface POIEventData {
  poiId: string;
  type: string;
  data: POIDataType;
}

export function POIPanel() {
  const [selectedPOI, setSelectedPOI] = useState<POIEventData | null>(null);

  const handleClose = useCallback(() => {
    setSelectedPOI(null);
  }, []);

  useEffect(() => {
    const unsubscribeSelect = eventBus.on('poi-selected', (poi: unknown) => {
      setSelectedPOI(poi as POIEventData);
    });

    const unsubscribeClose = eventBus.on('poi-panel-close', () => {
      setSelectedPOI(null);
    });

    return () => {
      unsubscribeSelect();
      unsubscribeClose();
    };
  }, []);

  // Handle Escape key to close panel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedPOI) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPOI, handleClose]);

  const handleNavigate = () => {
    if (selectedPOI) {
      // Emit navigation event for the game to handle
      eventBus.emit('navigate-to-poi', {
        poiId: selectedPOI.poiId,
        position: selectedPOI.data.position,
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case POIType.SESSION:
        return <Calendar className="w-5 h-5" />;
      case POIType.SPONSOR:
        return <Building2 className="w-5 h-5" />;
      case POIType.FOOD:
        return <Coffee className="w-5 h-5" />;
      case POIType.SOCIAL:
        return <Users className="w-5 h-5" />;
      case POIType.INFO:
        return <Info className="w-5 h-5" />;
      case POIType.LANDMARK:
        return <Star className="w-5 h-5" />;
      default:
        return <MapPin className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case POIType.SESSION:
        return 'Session';
      case POIType.SPONSOR:
        return 'Sponsor Booth';
      case POIType.FOOD:
        return 'Food & Drinks';
      case POIType.SOCIAL:
        return 'Social Area';
      case POIType.INFO:
        return 'Information';
      case POIType.LANDMARK:
        return 'Landmark';
      default:
        return 'Point of Interest';
    }
  };

  const renderSessionDetails = (poi: SessionPOI) => (
    <div className="space-y-3">
      {poi.metadata.startTime && poi.metadata.endTime && (
        <div className="flex items-start gap-2 text-ink/80">
          <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <div className="font-semibold">
              {poi.metadata.startTime} - {poi.metadata.endTime}
            </div>
          </div>
        </div>
      )}
      {poi.metadata.speaker && (
        <div className="flex items-start gap-2 text-ink/80">
          <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">Speaker: </span>
            {poi.metadata.speaker}
          </div>
        </div>
      )}
      {poi.metadata.room && (
        <div className="flex items-start gap-2 text-ink/80">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">Room: </span>
            {poi.metadata.room}
          </div>
        </div>
      )}
      {poi.metadata.track && (
        <div className="inline-block px-3 py-1 bg-teal-600/10 text-teal-600 rounded-full text-xs font-semibold">
          {poi.metadata.track}
        </div>
      )}
      {poi.metadata.capacity && (
        <div className="text-xs text-ink/60">
          Capacity: {poi.metadata.attendeeCount || 0}/{poi.metadata.capacity}
        </div>
      )}
    </div>
  );

  const renderSponsorDetails = (poi: SponsorPOI) => (
    <div className="space-y-3">
      {poi.metadata.company && (
        <div className="text-sm font-semibold text-ink/90">
          {poi.metadata.company}
        </div>
      )}
      {poi.metadata.logoUrl && (
        <div className="w-full h-24 bg-cream rounded-lg flex items-center justify-center">
          <img
            src={poi.metadata.logoUrl}
            alt={poi.metadata.company}
            className="max-w-full max-h-full object-contain p-2"
          />
        </div>
      )}
      {!poi.metadata.logoUrl && (
        <div className="w-full h-24 bg-cream rounded-lg flex items-center justify-center">
          <Building2 className="w-12 h-12 text-ink/20" />
        </div>
      )}
      {poi.metadata.booth && (
        <div className="text-sm text-ink/70">
          <span className="font-semibold">Booth: </span>
          {poi.metadata.booth}
        </div>
      )}
      {poi.metadata.category && (
        <div className="inline-block px-3 py-1 bg-cream text-ink/70 rounded-full text-xs font-semibold">
          {poi.metadata.category}
        </div>
      )}
      {poi.metadata.website && (
        <a
          href={poi.metadata.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-teal-600 hover:underline"
        >
          Visit Website →
        </a>
      )}
    </div>
  );

  const renderFoodDetails = (poi: FoodPOI) => (
    <div className="space-y-3">
      {poi.metadata.menuType && (
        <div className="text-sm text-ink/80">
          <span className="font-semibold">Menu: </span>
          {poi.metadata.menuType}
        </div>
      )}
      {poi.metadata.hours && (
        <div className="flex items-start gap-2 text-ink/80">
          <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">Hours: </span>
            {poi.metadata.hours}
          </div>
        </div>
      )}
      {poi.metadata.dietaryOptions && poi.metadata.dietaryOptions.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-ink/70">Dietary Options:</div>
          <div className="flex flex-wrap gap-1">
            {poi.metadata.dietaryOptions.map((option) => (
              <span
                key={option}
                className="px-2 py-1 bg-cream text-ink/70 rounded text-xs"
              >
                {option}
              </span>
            ))}
          </div>
        </div>
      )}
      {poi.metadata.capacity && (
        <div className="text-xs text-ink/60">
          Seating capacity: {poi.metadata.capacity}
        </div>
      )}
    </div>
  );

  const renderTypeSpecificContent = () => {
    if (!selectedPOI) return null;

    const poi = selectedPOI.data;

    switch (poi.type) {
      case POIType.SESSION:
        return renderSessionDetails(poi as SessionPOI);
      case POIType.SPONSOR:
        return renderSponsorDetails(poi as SponsorPOI);
      case POIType.FOOD:
        return renderFoodDetails(poi as FoodPOI);
      default:
        return null;
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
          className="fixed right-0 top-0 h-full w-full sm:w-80 max-w-[calc(100vw-2rem)] bg-paper shadow-xl z-50 p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="poi-panel-title"
        >
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-cream transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600"
            aria-label="Close panel"
          >
            <X className="w-5 h-5 text-ink" />
          </button>

          <div className="flex items-center gap-2 text-teal-600 mb-2">
            {getTypeIcon(selectedPOI.type)}
            <span className="text-sm font-semibold uppercase tracking-wide">
              {getTypeLabel(selectedPOI.type)}
            </span>
          </div>

          <h2 id="poi-panel-title" className="font-display text-2xl text-ink mb-2">
            {selectedPOI.data.name}
          </h2>

          {selectedPOI.data.floor !== undefined && (
            <div className="flex items-center gap-2 text-ink/70 text-sm mb-4">
              <Building2 className="w-4 h-4" />
              <span>Floor {selectedPOI.data.floor}</span>
            </div>
          )}

          {selectedPOI.data.description && (
            <p className="text-ink/80 mb-6 leading-relaxed">
              {selectedPOI.data.description}
            </p>
          )}

          <div className="mb-6">
            {renderTypeSpecificContent()}
          </div>

          <button
            onClick={handleNavigate}
            className="w-full py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
          >
            <Navigation className="w-4 h-4" />
            Navigate Here
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
