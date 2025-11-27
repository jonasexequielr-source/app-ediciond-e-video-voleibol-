export enum ActionType {
  POINT = 'POINT',    // Balón tocó suelo (Punto) - Verde
  DEFENSE = 'DEFENSE', // Defendida bien - Rojo
  ERROR = 'ERROR',     // Error no forzado / Out - Negro/Gris
  BLOCK = 'BLOCK'      // Bloqueo - Azul
}

export interface GameEvent {
  id: string;
  x: number; // Porcentaje 0-100 relativo al ancho
  y: number; // Porcentaje 0-100 relativo al alto
  timestamp: number; // Segundos en el video
  type: ActionType;
  note?: string;
}

export interface VideoClip {
  id: string;
  start: number;
  end: number;
  title: string;
}

export interface VideoMeta {
  file: File;
  url: string;
  duration: number;
}

// Gemini Types
export interface AnalysisResult {
  text: string;
}