import React from 'react';
import { GameEvent, ActionType } from '../types';

interface CourtMapProps {
  events: GameEvent[];
}

const CourtMap: React.FC<CourtMapProps> = ({ events }) => {
  // Color helpers (matching HeatmapOverlay logic for consistency)
  const getColor = (type: ActionType) => {
    switch (type) {
      case ActionType.POINT: return '#22c55e'; // Green
      case ActionType.DEFENSE: return '#ef4444'; // Red
      case ActionType.BLOCK: return '#3b82f6'; // Blue
      case ActionType.ERROR: return '#000000'; // Black
      default: return '#ffffff';
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 relative overflow-hidden shadow-inner flex-1 flex items-center justify-center">
        
        {/* Schematic Court Container - Aspect Ratio matching video roughly (16:9) */}
        <div className="relative w-full aspect-video bg-blue-500 rounded shadow-lg overflow-hidden border-2 border-white">
            
            {/* Court Pattern - Abstract Representation */}
            {/* Orange inner court area (generic representation) */}
            <div className="absolute inset-4 bg-orange-400/90 border-2 border-white opacity-80"></div>
            
            {/* Net Line (Center assumption) */}
            <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-white/50 -translate-x-1/2 shadow-sm"></div>
            
            {/* Attack Lines (approximate 33% and 66%) */}
            <div className="absolute top-0 bottom-0 left-[33%] w-0.5 bg-white/30 border-l border-dashed border-white/50"></div>
            <div className="absolute top-0 bottom-0 left-[66%] w-0.5 bg-white/30 border-l border-dashed border-white/50"></div>

            {/* Events Layer */}
            {events.map((event) => (
                <div
                key={event.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                style={{
                    left: `${event.x}%`,
                    top: `${event.y}%`,
                }}
                title={`${event.type} at ${Math.floor(event.timestamp)}s`}
                >
                    {/* Ripple/Glow effect for the map */}
                    <div 
                        className="absolute -inset-2 rounded-full opacity-30 animate-pulse"
                        style={{ backgroundColor: getColor(event.type) }}
                    ></div>
                    
                    {/* Point Dot */}
                    <div
                        className="relative w-3 h-3 rounded-full border border-white shadow-sm transition-transform group-hover:scale-150"
                        style={{ backgroundColor: getColor(event.type) }}
                    ></div>
                </div>
            ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-slate-300">
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500 border border-white/20"></span> Punto
        </div>
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 border border-white/20"></span> Defensa
        </div>
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 border border-white/20"></span> Bloqueo
        </div>
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-black border border-white/20"></span> Error
        </div>
      </div>
    </div>
  );
};

export default CourtMap;