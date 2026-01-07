import { useState, useEffect, useCallback, useMemo } from 'react';
import { eventBus } from '../lib/EventBus';
import { POIData, POIType, POIInteraction } from '../types/poi';

interface POIState {
  selectedPOI: POIData | null;
  hoveredPOI: POIData | null;
  nearbyPOIs: POIData[];
  allPOIs: POIData[];
  interactions: POIInteraction[];
}

export function usePOI() {
  const [state, setState] = useState<POIState>({
    selectedPOI: null,
    hoveredPOI: null,
    nearbyPOIs: [],
    allPOIs: [],
    interactions: [],
  });

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
  const updatePOIList = useCallback((pois: POIData[]) => {
    setState((prev) => ({
      ...prev,
      allPOIs: pois,
    }));
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
