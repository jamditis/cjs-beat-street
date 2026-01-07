import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { eventBus } from '../lib/EventBus';
import { POIData, POIType, POIInteraction } from '../types/poi';
import {
  cachePOIs,
  getCachedPOIs,
  isPOICacheStale,
  CachedPOI,
} from '../services/offline';

interface POIState {
  selectedPOI: POIData | null;
  hoveredPOI: POIData | null;
  nearbyPOIs: POIData[];
  allPOIs: POIData[];
  interactions: POIInteraction[];
  isFromCache: boolean;
  cacheStatus: 'loading' | 'fresh' | 'stale' | 'error';
}

/**
 * Convert POIData to CachedPOI format for storage
 */
function toCachedPOI(poi: POIData): CachedPOI {
  return {
    id: poi.id,
    type: poi.type,
    name: poi.name,
    position: { x: poi.position.x, y: poi.position.y },
    floor: poi.floor,
    metadata: poi.metadata,
  };
}

/**
 * Convert CachedPOI back to POIData format
 */
function fromCachedPOI(cached: CachedPOI): POIData {
  return {
    id: cached.id,
    type: cached.type as POIType,
    name: cached.name,
    position: {
      x: cached.position.x,
      y: cached.position.y,
      floor: cached.floor,
    },
    floor: cached.floor,
    metadata: cached.metadata as Record<string, unknown>,
    isActive: true,
  };
}

export function usePOI() {
  const [state, setState] = useState<POIState>({
    selectedPOI: null,
    hoveredPOI: null,
    nearbyPOIs: [],
    allPOIs: [],
    interactions: [],
    isFromCache: false,
    cacheStatus: 'loading',
  });

  const hasLoadedCache = useRef(false);

  // Load cached POIs on mount (offline-first approach)
  useEffect(() => {
    if (hasLoadedCache.current) return;
    hasLoadedCache.current = true;

    async function loadFromCache() {
      try {
        const isStale = await isPOICacheStale();
        const cachedPOIs = await getCachedPOIs();

        if (cachedPOIs.length > 0) {
          const pois = cachedPOIs.map(fromCachedPOI);
          setState((prev) => ({
            ...prev,
            allPOIs: pois,
            isFromCache: true,
            cacheStatus: isStale ? 'stale' : 'fresh',
          }));
        } else {
          setState((prev) => ({
            ...prev,
            cacheStatus: 'stale',
          }));
        }
      } catch (error) {
        console.error('[usePOI] Failed to load from cache:', error);
        setState((prev) => ({
          ...prev,
          cacheStatus: 'error',
        }));
      }
    }

    loadFromCache();
  }, []);

  // Listen for POI selection events
  useEffect(() => {
    const unsubSelect = eventBus.on('poi-selected', (data: unknown) => {
      const event = data as { poiId: string; type: string; data: POIData };
      setState((prev) => ({
        ...prev,
        selectedPOI: event.data,
      }));
    });

    return unsubSelect;
  }, []);

  // Listen for POI hover events
  useEffect(() => {
    const unsubHoverStart = eventBus.on('poi-hover-start', (data: unknown) => {
      const interaction = data as POIInteraction;
      setState((prev) => ({
        ...prev,
        hoveredPOI: interaction.poiData,
      }));
    });

    const unsubHoverEnd = eventBus.on('poi-hover-end', () => {
      setState((prev) => ({
        ...prev,
        hoveredPOI: null,
      }));
    });

    return () => {
      unsubHoverStart();
      unsubHoverEnd();
    };
  }, []);

  // Listen for POI proximity events
  useEffect(() => {
    const unsubProximity = eventBus.on('poi-proximity', (data: unknown) => {
      const event = data as { poiId: string; poiData: POIData; distance: number };

      setState((prev) => {
        // Check if POI is already in nearby list
        const exists = prev.nearbyPOIs.some((poi) => poi.id === event.poiData.id);

        if (!exists) {
          return {
            ...prev,
            nearbyPOIs: [...prev.nearbyPOIs, event.poiData],
          };
        }

        return prev;
      });
    });

    return unsubProximity;
  }, []);

  // Listen for POI interactions
  useEffect(() => {
    const unsubInteraction = eventBus.on('poi-interaction', (data: unknown) => {
      const interaction = data as POIInteraction;

      setState((prev) => ({
        ...prev,
        interactions: [...prev.interactions.slice(-19), interaction], // Keep last 20 interactions
      }));
    });

    return unsubInteraction;
  }, []);

  // Select a POI programmatically
  const selectPOI = useCallback((poi: POIData | null) => {
    setState((prev) => ({
      ...prev,
      selectedPOI: poi,
    }));

    if (poi) {
      eventBus.emit('poi-selected', {
        poiId: poi.id,
        type: poi.type,
        data: poi,
      });
    }
  }, []);

  // Clear POI selection
  const clearSelection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedPOI: null,
    }));
  }, []);

  // Get POIs by type
  const getPOIsByType = useCallback(
    (type: POIType | POIType[]): POIData[] => {
      const types = Array.isArray(type) ? type : [type];
      return state.allPOIs.filter((poi) => types.includes(poi.type));
    },
    [state.allPOIs]
  );

  // Get POIs by floor
  const getPOIsByFloor = useCallback(
    (floor: number): POIData[] => {
      return state.allPOIs.filter((poi) => poi.floor === floor);
    },
    [state.allPOIs]
  );

  // Get POIs by zone
  const getPOIsByZone = useCallback(
    (zone: string): POIData[] => {
      return state.allPOIs.filter((poi) => poi.position.zone === zone);
    },
    [state.allPOIs]
  );

  // Update the full POI list (typically called by game logic)
  // Also caches POIs for offline use
  const updatePOIList = useCallback((pois: POIData[], fromNetwork = false) => {
    setState((prev) => ({
      ...prev,
      allPOIs: pois,
      isFromCache: !fromNetwork,
      cacheStatus: fromNetwork ? 'fresh' : prev.cacheStatus,
    }));

    // Cache POIs in the background when loaded from network
    if (fromNetwork && pois.length > 0) {
      const cachedPOIs = pois.map(toCachedPOI);
      cachePOIs(cachedPOIs).catch((error) => {
        console.error('[usePOI] Failed to cache POIs:', error);
      });
    }
  }, []);

  // Clear nearby POIs
  const clearNearbyPOIs = useCallback(() => {
    setState((prev) => ({
      ...prev,
      nearbyPOIs: [],
    }));
  }, []);

  // Get POI statistics
  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    let activeCount = 0;

    state.allPOIs.forEach((poi) => {
      byType[poi.type] = (byType[poi.type] || 0) + 1;
      if (poi.isActive !== false) {
        activeCount++;
      }
    });

    return {
      total: state.allPOIs.length,
      byType,
      active: activeCount,
      nearby: state.nearbyPOIs.length,
      recentInteractions: state.interactions.length,
    };
  }, [state.allPOIs, state.nearbyPOIs, state.interactions]);

  // Check if a POI is selected
  const isPOISelected = useCallback(
    (poiId: string): boolean => {
      return state.selectedPOI?.id === poiId;
    },
    [state.selectedPOI]
  );

  // Check if a POI is hovered
  const isPOIHovered = useCallback(
    (poiId: string): boolean => {
      return state.hoveredPOI?.id === poiId;
    },
    [state.hoveredPOI]
  );

  // Get recent interactions for a specific POI
  const getPOIInteractions = useCallback(
    (poiId: string): POIInteraction[] => {
      return state.interactions.filter((interaction) => interaction.poiId === poiId);
    },
    [state.interactions]
  );

  return {
    // State
    selectedPOI: state.selectedPOI,
    hoveredPOI: state.hoveredPOI,
    nearbyPOIs: state.nearbyPOIs,
    allPOIs: state.allPOIs,
    interactions: state.interactions,
    stats,

    // Cache status
    isFromCache: state.isFromCache,
    cacheStatus: state.cacheStatus,

    // Actions
    selectPOI,
    clearSelection,
    updatePOIList,
    clearNearbyPOIs,

    // Queries
    getPOIsByType,
    getPOIsByFloor,
    getPOIsByZone,
    isPOISelected,
    isPOIHovered,
    getPOIInteractions,
  };
}

// Hook for listening to specific POI events
export function usePOIEvent(
  eventName: 'poi-selected' | 'poi-hover-start' | 'poi-hover-end' | 'poi-proximity' | 'poi-interaction',
  callback: (data: unknown) => void
): void {
  useEffect(() => {
    const unsubscribe = eventBus.on(eventName, callback);
    return unsubscribe;
  }, [eventName, callback]);
}
