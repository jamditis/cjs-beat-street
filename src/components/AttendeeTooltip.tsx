import { useEffect, useState } from 'react';
import { eventBus } from '../lib/EventBus';

interface AttendeeTooltipData {
  uid: string;
  displayName: string;
  organization?: string;
  status: string;
  zone?: string;
  lastActive?: string;
}

export function AttendeeTooltip() {
  const [tooltip, setTooltip] = useState<AttendeeTooltipData | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleHover = (data: unknown) => {
      const hoverData = data as {
        uid: string;
        displayName?: string;
        organization?: string;
        status?: string;
        hovered: boolean;
      };

      if (hoverData.hovered && hoverData.displayName) {
        setTooltip({
          uid: hoverData.uid,
          displayName: hoverData.displayName,
          organization: hoverData.organization,
          status: hoverData.status || 'active',
        });
      } else {
        setTooltip(null);
      }
    };

    const unsubscribe = eventBus.on('attendee-hovered', handleHover);
    return unsubscribe;
  }, []);

  // Update tooltip position based on mouse
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX + 15, y: e.clientY + 15 });
    };

    if (tooltip) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [tooltip]);

  if (!tooltip) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'idle':
        return 'bg-yellow-500';
      case 'away':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="bg-paper rounded-lg shadow-lg border-2 border-teal-600 p-3 min-w-[200px] max-w-[300px]">
        {/* Header with name and status */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-ink text-sm truncate">
              {tooltip.displayName}
            </h3>
            {tooltip.organization && (
              <p className="text-xs text-ink/70 truncate">{tooltip.organization}</p>
            )}
          </div>
          <div
            className={`flex-shrink-0 w-2 h-2 rounded-full ${getStatusColor(tooltip.status)}`}
            title={getStatusText(tooltip.status)}
          />
        </div>

        {/* Status text */}
        <div className="text-xs text-ink/60">
          <span className="font-medium">{getStatusText(tooltip.status)}</span>
          {tooltip.zone && <span className="ml-2">in {tooltip.zone}</span>}
        </div>

        {/* Hint */}
        <div className="mt-2 pt-2 border-t border-teal-600/20">
          <p className="text-xs text-teal-600 font-medium">Click to view profile</p>
        </div>
      </div>
    </div>
  );
}
