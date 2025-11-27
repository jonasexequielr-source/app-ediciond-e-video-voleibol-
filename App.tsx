import React, { useState } from 'react';
import VideoAnalyzer from './components/VideoAnalyzer';
import GeminiPanel from './components/GeminiPanel';
import { GameEvent, VideoMeta } from './types';
import { analyzeFrameStrategy } from './services/geminiService';

export default function App() {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [frameAnalysis, setFrameAnalysis] = useState<string | null>(null);

  const handleVideoLoad = (meta: VideoMeta) => {
    console.log("Video loaded:", meta);
    // Reset analysis when new video loads
    setFrameAnalysis(null);
  };

  const handleFrameAnalysisRequest = async (base64: string) => {
      setFrameAnalysis("Analizando frame con Gemini Vision...");
      const result = await analyzeFrameStrategy(base64);
      setFrameAnalysis(result);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">VolleyMind AI</h1>
              <p className="text-xs text-slate-400">Análisis Táctico Inteligente</p>
            </div>
          </div>
          <div className="flex gap-4">
              <span className="text-xs bg-slate-800 px-3 py-1 rounded-full border border-slate-700 text-slate-400">Gemini 2.5 Powered</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Video Player */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/50 p-1 rounded-2xl border border-slate-800/50 backdrop-blur-sm">
            <VideoAnalyzer 
              onEventsChange={setEvents} 
              onVideoLoad={handleVideoLoad}
              onRequestAnalysis={handleFrameAnalysisRequest}
            />
          </div>
          
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <h2 className="text-lg font-semibold mb-4 text-white">Instrucciones</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-400">
                <div className="flex flex-col gap-2">
                    <strong className="text-slate-200">1. Subir Video</strong>
                    <p>Carga el archivo de tu partido o entrenamiento.</p>
                </div>
                <div className="flex flex-col gap-2">
                    <strong className="text-slate-200">2. Registrar Acciones</strong>
                    <p>Haz clic en la pista donde cae el balón. Selecciona si fue Punto (Verde) o Defensa (Rojo).</p>
                </div>
                <div className="flex flex-col gap-2">
                    <strong className="text-slate-200">3. Análisis IA</strong>
                    <p>Usa el panel lateral para obtener insights de Gemini sobre tu mapa de calor.</p>
                </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Panel & Stats */}
        <div className="lg:col-span-1 h-full min-h-[600px]">
          <GeminiPanel 
            events={events} 
            frameAnalysisResult={frameAnalysis}
          />
        </div>
      </main>
    </div>
  );
}
