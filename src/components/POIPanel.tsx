import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
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
  User,
  ChevronDown,
  Radio
} from 'lucide-react';
import { eventBus } from '../lib/EventBus';
import { POIType, POIData as POIDataType, SessionPOI, SponsorPOI, FoodPOI } from '../types/poi';
import { POIPanelSkeleton } from './Skeleton';
import { triggerHaptic } from '../hooks/useHaptic';
import { useSchedule } from '../hooks/useSchedule';
import { SchedulePanel } from './SchedulePanel';
import {
  trackPOIView,
  trackPOIClose,
  trackNavigationRequest,
  trackSponsorBoothVisit,
} from '../services/analytics';

interface POIEventData {
  poiId: string;
  type: string;
  data: POIDataType;
}

// Swipe threshold for dismissing the panel
const SWIPE_THRESHOLD = 100;
const VELOCITY_THRESHOLD = 500;

export function POIPanel() {
  const [selectedPOI, setSelectedPOI] = useState<POIEventData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleRoom, setScheduleRoom] = useState<string | undefined>(undefined);
  const [scheduleVenueName, setScheduleVenueName] = useState<string | undefined>(undefined);
  const panelRef = useRef<HTMLDivElement>(null);
  const viewStartTimeRef = useRef<number | null>(null);

  // Get schedule data for showing session counts
  const { getSessionsByRoom } = useSchedule();

  // Swipe-to-dismiss state
  const dragY = useMotionValue(0);
  const dragOpacity = useTransform(dragY, [0, 200], [1, 0.5]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(hasTouch || isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleClose = useCallback(() => {
    triggerHaptic('tap');

    // Track POI close with duration
    if (selectedPOI && viewStartTimeRef.current) {
      const duration = Date.now() - viewStartTimeRef.current;
      trackPOIClose(selectedPOI.poiId, {
        poiType: selectedPOI.type,
        poiName: selectedPOI.data.name,
        duration,
        venueId: selectedPOI.data.venueId,
        zone: selectedPOI.data.position?.zone,
      });
      viewStartTimeRef.current = null;
    }

    setSelectedPOI(null);
    dragY.set(0);
  }, [dragY, selectedPOI]);

  // Handle opening schedule panel
  const handleOpenSchedule = useCallback((room?: string, venueName?: string) => {
    triggerHaptic('tap');
    setScheduleRoom(room);
    setScheduleVenueName(venueName);
    setShowSchedule(true);
  }, []);

  const handleCloseSchedule = useCallback(() => {
    setShowSchedule(false);
    setScheduleRoom(undefined);
    setScheduleVenueName(undefined);
  }, []);

  // Get session info for a room
  const getScheduleInfo = useCallback((room?: string) => {
    if (!room) return null;
    const sessions = getSessionsByRoom(room);
    const liveCount = sessions.filter(s => s.status === 'live').length;
    const upcomingCount = sessions.filter(s => s.status === 'upcoming').length;
    return {
      total: sessions.length,
      live: liveCount,
      upcoming: upcomingCount,
    };
  }, [getSessionsByRoom]);

  // Handle swipe-to-dismiss
  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const shouldDismiss =
        info.offset.y > SWIPE_THRESHOLD || info.velocity.y > VELOCITY_THRESHOLD;

      if (shouldDismiss) {
        triggerHaptic('tap');

        // Track POI close with duration
        if (selectedPOI && viewStartTimeRef.current) {
          const duration = Date.now() - viewStartTimeRef.current;
          trackPOIClose(selectedPOI.poiId, {
            poiType: selectedPOI.type,
            poiName: selectedPOI.data.name,
            duration,
            venueId: selectedPOI.data.venueId,
            zone: selectedPOI.data.position?.zone,
          });
          viewStartTimeRef.current = null;
        }

        setSelectedPOI(null);
      }

      dragY.set(0);
    },
    [dragY, selectedPOI]
  );

  useEffect(() => {
    const unsubscribeSelect = eventBus.on('poi-selected', (poi: unknown) => {
      setIsLoading(true);
      triggerHaptic('selection');

      // Simulate loading for demonstration (in production, this would be actual data fetching)
      setTimeout(() => {
        const poiData = poi as POIEventData;
        setSelectedPOI(poiData);
        setIsLoading(false);

        // Track POI view
        viewStartTimeRef.current = Date.now();
        trackPOIView({
          poiId: poiData.poiId,
          poiType: poiData.type,
          poiName: poiData.data.name,
          venueId: poiData.data.venueId,
          zone: poiData.data.position?.zone,
          floor: poiData.data.floor,
        });

        // Track sponsor booth visit specifically
        if (poiData.type === POIType.SPONSOR) {
          const sponsorData = poiData.data as SponsorPOI;
          trackSponsorBoothVisit({
            sponsorId: poiData.poiId,
            sponsorName: sponsorData.metadata?.company || poiData.data.name,
            boothId: sponsorData.metadata?.booth,
            actions: ['view'],
          });
        }
      }, 200);
    });

    const unsubscribeClose = eventBus.on('poi-panel-close', () => {
      setSelectedPOI(null);
    });

    const unsubscribeSchedule = eventBus.on('open-schedule-panel', (data: unknown) => {
      const { room, venueName } = data as { room?: string; venueName?: string };
      handleOpenSchedule(room, venueName);
    });

    return () => {
      unsubscribeSelect();
      unsubscribeClose();
      unsubscribeSchedule();
    };
  }, [handleOpenSchedule]);

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

  // Focus trap for accessibility
  useEffect(() => {
    if (selectedPOI && panelRef.current) {
      const focusableElements = panelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      firstElement?.focus();
    }
  }, [selectedPOI]);

  const handleNavigate = () => {
    if (selectedPOI) {
      triggerHaptic('success');

      // Track navigation request
      trackNavigationRequest(selectedPOI.poiId, selectedPOI.data.name, {
        poiType: selectedPOI.type,
        venueId: selectedPOI.data.venueId,
        zone: selectedPOI.data.position?.zone,
      });

      // Emit navigation event for the game to handle
      eventBus.emit('navigate-to-poi', {
        poiId: selectedPOI.poiId,
        position: selectedPOI.data.position,
      });
    }
  };

  const getTypeIcon = (type: string) => {
    const iconClass = 'w-5 h-5';
    switch (type) {
      case POIType.SESSION:
        return <Calendar className={iconClass} />;
      case POIType.SPONSOR:
        return <Building2 className={iconClass} />;
      case POIType.FOOD:
        return <Coffee className={iconClass} />;
      case POIType.SOCIAL:
        return <Users className={iconClass} />;
      case POIType.INFO:
        return <Info className={iconClass} />;
      case POIType.LANDMARK:
        return <Star className={iconClass} />;
      default:
        return <MapPin className={iconClass} />;
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
          className="text-sm text-teal-600 hover:underline inline-block py-1"
        >
          Visit Website
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

  // Render schedule info section for venues with sessions
  const renderScheduleInfo = () => {
    if (!selectedPOI) return null;

    // Check if this POI is a session room or a venue that has sessions
    const poi = selectedPOI.data;
    const room = (poi.metadata as Record<string, unknown>)?.room as string | undefined;
    const poiName = poi.name;

    // Try to get sessions for this room or venue name
    const scheduleInfo = getScheduleInfo(room || poiName);
    if (!scheduleInfo || scheduleInfo.total === 0) return null;

    return (
      <div className="bg-cream/50 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-medium text-ink">Schedule</span>
          </div>
          {scheduleInfo.live > 0 && (
            <div className="flex items-center gap-1 text-xs font-semibold text-teal-600">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>{scheduleInfo.live} Live</span>
            </div>
          )}
        </div>
        <p className="text-xs text-ink/60 mt-1">
          {scheduleInfo.total} session{scheduleInfo.total !== 1 ? 's' : ''} at this location
          {scheduleInfo.upcoming > 0 && ` (${scheduleInfo.upcoming} upcoming)`}
        </p>
        <button
          onClick={() => handleOpenSchedule(room || poiName, poiName)}
          className="mt-2 w-full py-2 bg-paper hover:bg-white border border-ink/10 rounded-lg text-sm font-medium text-ink transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
        >
          <Calendar className="w-4 h-4" />
          View Schedule
        </button>
      </div>
    );
  };

  // Mobile bottom sheet variant
  const mobilePanel = (
    <motion.div
      ref={panelRef}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.5 }}
      onDragEnd={handleDragEnd}
      style={{ y: dragY, opacity: dragOpacity }}
      className="fixed bottom-0 left-0 right-0 bg-paper rounded-t-2xl shadow-2xl z-50 max-h-[85vh] overflow-hidden touch-pan-y"
      role="dialog"
      aria-modal="true"
      aria-labelledby="poi-panel-title"
    >
      {/* Drag handle */}
      <div className="flex justify-center py-3 cursor-grab active:cursor-grabbing">
        <div className="w-12 h-1.5 bg-ink/20 rounded-full" />
      </div>

      {/* Swipe hint on first open */}
      <div className="flex justify-center -mt-1 mb-2">
        <ChevronDown className="w-4 h-4 text-ink/30 animate-bounce" />
      </div>

      {isLoading ? (
        <POIPanelSkeleton />
      ) : (
        <div className="px-6 pb-8 overflow-y-auto max-h-[70vh]">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-4 w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-cream transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600 touch-manipulation"
            aria-label="Close panel"
            style={{ touchAction: 'manipulation' }}
          >
            <X className="w-5 h-5 text-ink" />
          </button>

          {selectedPOI && (
            <>
              <div className="flex items-center gap-2 text-teal-600 mb-2">
                {getTypeIcon(selectedPOI.type)}
                <span className="text-sm font-semibold uppercase tracking-wide">
                  {getTypeLabel(selectedPOI.type)}
                </span>
              </div>

              <h2 id="poi-panel-title" className="font-display text-2xl text-ink mb-2 pr-8">
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

              <div className="mb-4">
                {renderTypeSpecificContent()}
              </div>

              {/* Schedule info section */}
              {renderScheduleInfo()}

              <button
                onClick={handleNavigate}
                className="w-full py-4 min-h-[48px] bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 active:bg-teal-800 transition-colors flex items-center justify-center gap-2 touch-manipulation"
                style={{ touchAction: 'manipulation' }}
              >
                <Navigation className="w-5 h-5" />
                Navigate Here
              </button>
            </>
          )}
        </div>
      )}
    </motion.div>
  );

  // Desktop side panel variant
  const desktopPanel = (
    <motion.div
      ref={panelRef}
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 h-full w-80 max-w-[calc(100vw-2rem)] bg-paper shadow-xl z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="poi-panel-title"
    >
      {isLoading ? (
        <POIPanelSkeleton />
      ) : (
        <div className="p-6 h-full overflow-y-auto">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-cream transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600"
            aria-label="Close panel"
          >
            <X className="w-5 h-5 text-ink" />
          </button>

          {selectedPOI && (
            <>
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

              <div className="mb-4">
                {renderTypeSpecificContent()}
              </div>

              {/* Schedule info section */}
              {renderScheduleInfo()}

              <button
                onClick={handleNavigate}
                className="w-full py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                Navigate Here
              </button>
            </>
          )}
        </div>
      )}
    </motion.div>
  );

  return (
    <>
      <AnimatePresence>
        {(selectedPOI || isLoading) && (isMobile ? mobilePanel : desktopPanel)}
      </AnimatePresence>

      {/* Schedule Panel */}
      <SchedulePanel
        isOpen={showSchedule}
        onClose={handleCloseSchedule}
        room={scheduleRoom}
        venueName={scheduleVenueName}
      />
    </>
  );
}
