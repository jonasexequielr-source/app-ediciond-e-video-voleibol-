import React from 'react';
import { GameEvent, ActionType } from '../types';

interface HeatmapOverlayProps {
  events: GameEvent[];
  visible: boolean;
}

const HeatmapOverlay: React.FC<HeatmapOverlayProps> = ({ events, visible }) => {
  if (!visible) return null;

  // Function to determine color based on action type
  const getColor = (type: ActionType) => {
    switch (type) {
      case ActionType.POINT: return 'rgba(34, 197, 94, 0.6)'; // Green-500 with opacity
      case ActionType.DEFENSE: return 'rgba(239, 68, 68, 0.6)'; // Red-500 with opacity
      case ActionType.BLOCK: return 'rgba(59, 130, 246, 0.6)'; // Blue-500 with opacity
      case ActionType.ERROR: return 'rgba(0, 0, 0, 0.5)'; // Black with opacity
      default: return 'rgba(255, 255, 255, 0.5)';
    }
  };

  const getGlowColor = (type: ActionType) => {
    switch (type) {
        case ActionType.POINT: return 'rgba(34, 197, 94, 0.3)';
        case ActionType.DEFENSE: return 'rgba(239, 68, 68, 0.3)';
        case ActionType.BLOCK: return 'rgba(59, 130, 246, 0.3)';
        default: return 'rgba(0,0,0,0.2)';
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
      {events.map((event) => (
        <div
          key={event.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-500 ease-in-out"
          style={{
            left: `${event.x}%`,
            top: `${event.y}%`,
          }}
        >
            {/* Heatmap blur effect */}
            <div 
                className="absolute rounded-full filter blur-xl"
                style={{
                    width: '60px',
                    height: '60px',
                    backgroundColor: getGlowColor(event.type),
                }}
            />
            {/* Actual point marker */}
            <div
                className="relative w-4 h-4 rounded-full border border-white/50 shadow-sm"
                style={{
                    backgroundColor: getColor(event.type),
                }}
            />
        </div>
      ))}
    </div>
  );
};

export default HeatmapOverlay;
