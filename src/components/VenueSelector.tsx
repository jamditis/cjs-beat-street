import { useState, useEffect, useCallback, useRef, KeyboardEvent } from 'react';
import { MapPin, Check } from 'lucide-react';
import { VenueId, VenueConfig } from '../types/venue';
import { getAllVenues, getVenueConfig } from '../config/venues';

const VENUE_STORAGE_KEY = 'beat-street-venue-preference';

interface VenueSelectorProps {
  currentVenue?: VenueId;
  onSelectVenue: (venueId: VenueId) => void;
  showRememberChoice?: boolean;
  compact?: boolean;
}

export function VenueSelector({
  currentVenue,
  onSelectVenue,
  showRememberChoice = false,
  compact = false,
}: VenueSelectorProps) {
  const venues = getAllVenues();
  const [rememberChoice, setRememberChoice] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check for saved preference on mount
  useEffect(() => {
    const savedPreference = localStorage.getItem(VENUE_STORAGE_KEY);
    if (savedPreference) {
      setRememberChoice(true);
    }
  }, []);

  const handleVenueSelect = useCallback(
    (venueId: VenueId) => {
      if (rememberChoice) {
        localStorage.setItem(VENUE_STORAGE_KEY, venueId);
      }
      onSelectVenue(venueId);
    },
    [rememberChoice, onSelectVenue]
  );

  const handleRememberChange = useCallback(
    (checked: boolean) => {
      setRememberChoice(checked);
      if (!checked) {
        localStorage.removeItem(VENUE_STORAGE_KEY);
      } else if (currentVenue) {
        localStorage.setItem(VENUE_STORAGE_KEY, currentVenue);
      }
    },
    [currentVenue]
  );

  // Keyboard navigation for the venue grid
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const { key } = event;

      if (key === 'ArrowRight' || key === 'ArrowDown') {
        event.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % venues.length);
      } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
        event.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + venues.length) % venues.length);
      } else if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < venues.length) {
          handleVenueSelect(venues[focusedIndex].id);
        }
      } else if (key === 'Home') {
        event.preventDefault();
        setFocusedIndex(0);
      } else if (key === 'End') {
        event.preventDefault();
        setFocusedIndex(venues.length - 1);
      }
    },
    [venues, focusedIndex, handleVenueSelect]
  );

  // Focus management
  useEffect(() => {
    if (focusedIndex >= 0 && containerRef.current) {
      const cards = containerRef.current.querySelectorAll('[role="radio"]');
      if (cards[focusedIndex]) {
        (cards[focusedIndex] as HTMLElement).focus();
      }
    }
  }, [focusedIndex]);

  return (
    <div className="w-full">
      {/* Venue grid */}
      <div
        ref={containerRef}
        role="radiogroup"
        aria-label="Select venue"
        onKeyDown={handleKeyDown}
        className={`grid gap-4 ${
          compact
            ? 'grid-cols-1'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        {venues.map((venue, index) => (
          <VenueCard
            key={venue.id}
            venue={venue}
            isSelected={currentVenue === venue.id}
            isFocused={focusedIndex === index}
            compact={compact}
            onSelect={() => handleVenueSelect(venue.id)}
            onFocus={() => setFocusedIndex(index)}
          />
        ))}
      </div>

      {/* Remember choice checkbox */}
      {showRememberChoice && (
        <div className="mt-6 flex items-center gap-3">
          <input
            type="checkbox"
            id="remember-venue"
            checked={rememberChoice}
            onChange={(e) => handleRememberChange(e.target.checked)}
            className="w-5 h-5 rounded border-2 border-ink/30 text-teal-600 focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 cursor-pointer"
          />
          <label
            htmlFor="remember-venue"
            className="text-ink cursor-pointer select-none"
          >
            Remember my choice
          </label>
        </div>
      )}
    </div>
  );
}

interface VenueCardProps {
  venue: VenueConfig;
  isSelected: boolean;
  isFocused: boolean;
  compact: boolean;
  onSelect: () => void;
  onFocus: () => void;
}

function VenueCard({
  venue,
  isSelected,
  isFocused,
  compact,
  onSelect,
  onFocus,
}: VenueCardProps) {
  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={isFocused ? 0 : -1}
      onClick={onSelect}
      onFocus={onFocus}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`
        relative bg-paper rounded-xl cursor-pointer transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2
        hover:scale-[1.02] hover:shadow-lg
        ${compact ? 'p-4' : 'p-6'}
        ${
          isSelected
            ? 'border-2 border-teal-600 shadow-lg'
            : 'border-2 border-transparent shadow-md hover:border-ink/20'
        }
      `}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Venue content */}
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${compact ? 'mt-0.5' : 'mt-1'}`}>
          <MapPin
            className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} ${
              isSelected ? 'text-teal-600' : 'text-ink/40'
            }`}
          />
        </div>

        <div className="flex-1 min-w-0">
          {/* Venue name */}
          <h3
            className={`font-display text-ink ${
              compact ? 'text-lg' : 'text-xl'
            } ${isSelected ? 'text-teal-600' : ''}`}
          >
            {venue.displayName}
          </h3>

          {/* Location */}
          <p className="text-ink/60 mt-1">
            {venue.city}, {venue.state}
          </p>

          {/* Dates */}
          <p
            className={`font-semibold mt-2 ${
              isSelected ? 'text-teal-600' : 'text-ink/80'
            }`}
          >
            {venue.dates}
          </p>

          {/* Default badge */}
          {venue.isDefault && (
            <span className="inline-block mt-3 px-2 py-0.5 bg-teal-600/10 text-teal-600 text-xs font-semibold rounded-full">
              Default venue
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Get the display name for a venue ID
 */
export function getVenueDisplayName(venueId: VenueId): string {
  const venue = getVenueConfig(venueId);
  return venue?.displayName ?? venueId;
}

/**
 * Get saved venue preference from localStorage
 */
export function getSavedVenuePreference(): VenueId | null {
  const saved = localStorage.getItem(VENUE_STORAGE_KEY);
  if (saved && Object.values(VenueId).includes(saved as VenueId)) {
    return saved as VenueId;
  }
  return null;
}

/**
 * Clear saved venue preference from localStorage
 */
export function clearSavedVenuePreference(): void {
  localStorage.removeItem(VENUE_STORAGE_KEY);
}
