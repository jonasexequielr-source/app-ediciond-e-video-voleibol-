import React, { useState } from 'react';
import { GameEvent } from '../types';
import { analyzeGameStats, generateDrillVideo } from '../services/geminiService';
import CourtMap from './CourtMap';

interface GeminiPanelProps {
  events: GameEvent[];
  frameAnalysisResult: string | null;
}

const GeminiPanel: React.FC<GeminiPanelProps> = ({ events, frameAnalysisResult }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'map' | 'veo'>('stats');
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [veoPrompt, setVeoPrompt] = useState('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  const handleAnalyzeStats = async () => {
    if (events.length === 0) {
        setAnalysis("Registra algunas acciones en el video primero (clic en la pista).");
        return;
    }
    setLoading(true);
    const result = await analyzeGameStats(events);
    setAnalysis(result);
    setLoading(false);
  };

  const handleGenerateVideo = async () => {
      if(!veoPrompt) return;
      setLoading(true);
      setGeneratedVideoUrl(null);
      try {
          const url = await generateDrillVideo(veoPrompt);
          setGeneratedVideoUrl(url);
      } catch (e) {
          setAnalysis("Error generando video. Verifica la consola.");
      }
      setLoading(false);
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col h-full overflow-hidden shadow-xl">
        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-900/50">
            <button 
                onClick={() => setActiveTab('stats')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'stats' ? 'bg-slate-800 text-white border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
                Coach AI
            </button>
            <button 
                onClick={() => setActiveTab('map')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'map' ? 'bg-slate-800 text-white border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
                Mapa 2D
            </button>
            <button 
                onClick={() => setActiveTab('veo')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'veo' ? 'bg-slate-800 text-white border-b-2 border-purple-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
                Veo Studio
            </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto bg-slate-800">
            {activeTab === 'stats' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Frame Analysis Section (if exists) */}
                    {frameAnalysisResult && (
                        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 shadow-lg">
                            <h4 className="text-purple-300 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                Análisis Visual de Frame
                            </h4>
                            <p className="text-sm text-slate-300 leading-relaxed italic">{frameAnalysisResult}</p>
                        </div>
                    )}

                    {/* Stats Analysis Section */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-slate-100 font-semibold">Análisis de Rendimiento</h3>
                            <span className="text-[10px] bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20">Gemini 2.5 Flash</span>
                        </div>
                        
                        {analysis ? (
                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-600 mb-4 text-sm text-slate-200 whitespace-pre-line shadow-inner">
                                {analysis}
                            </div>
                        ) : (
                             <p className="text-xs text-slate-400 mb-4 bg-slate-700/30 p-3 rounded-lg border border-slate-700/50">
                                1. Marca acciones en el video.<br/>
                                2. Presiona "Analizar" para obtener consejos tácticos del Coach AI.
                            </p>
                        )}

                        <button
                            onClick={handleAnalyzeStats}
                            disabled={loading}
                            className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${loading ? 'bg-slate-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/25'}`}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Procesando Tácticas...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                    Analizar Datos Tácticos
                                </>
                            )}
                        </button>
                    </div>

                    {/* Event List */}
                    <div>
                        <h3 className="text-slate-100 font-semibold mb-2 mt-6 text-sm uppercase tracking-wide text-slate-400">Log de Eventos</h3>
                        <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {events.length === 0 && <div className="text-xs text-slate-500 text-center py-4 italic border border-dashed border-slate-700 rounded">No hay eventos registrados</div>}
                            {[...events].reverse().map(e => (
                                <div key={e.id} className="text-xs bg-slate-700/40 hover:bg-slate-700/60 transition-colors p-2 rounded flex justify-between items-center border border-slate-700/50">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${
                                            e.type === 'POINT' ? 'bg-green-500 shadow-green-500/50' : 
                                            e.type === 'DEFENSE' ? 'bg-red-500 shadow-red-500/50' : 
                                            e.type === 'BLOCK' ? 'bg-blue-500 shadow-blue-500/50' : 'bg-gray-500'
                                        } shadow-sm`}></div>
                                        <span className={`font-medium ${
                                            e.type === 'POINT' ? 'text-green-300' : 
                                            e.type === 'DEFENSE' ? 'text-red-300' : 
                                            e.type === 'BLOCK' ? 'text-blue-300' : 'text-slate-400'
                                        }`}>{e.type}</span>
                                    </div>
                                    <span className="font-mono text-slate-500 text-[10px]">{Math.floor(e.timestamp)}s</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'map' && (
                <div className="h-full flex flex-col animate-in fade-in zoom-in duration-300">
                     <h3 className="text-slate-100 font-semibold mb-4">Mapa Táctico 2D</h3>
                     <p className="text-xs text-slate-400 mb-4">
                        Visualización esquemática de los eventos registrados sin el video de fondo.
                     </p>
                     <div className="flex-1 min-h-[300px]">
                        <CourtMap events={events} />
                     </div>
                </div>
            )}

            {activeTab === 'veo' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-gradient-to-br from-indigo-900 to-violet-900 p-5 rounded-lg border border-indigo-500/30 shadow-lg">
                        <div className="flex items-center gap-2 mb-2">
                             <span className="p-1.5 bg-white/10 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                             </span>
                             <h3 className="text-white font-bold text-lg">Veo 3 Studio</h3>
                        </div>
                        <p className="text-xs text-indigo-200/80 leading-relaxed">
                            Genera videos sintéticos de jugadas o ejercicios técnicos utilizando la potencia de Veo 3.1.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm text-slate-300 font-medium flex justify-between">
                            <span>Prompt del Ejercicio</span>
                            <span className="text-xs text-slate-500 font-normal">Sea detallado</span>
                        </label>
                        <textarea
                            value={veoPrompt}
                            onChange={(e) => setVeoPrompt(e.target.value)}
                            placeholder="Describe la jugada: Un rematador atacando por zona 4 con bloqueo doble..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none h-32 resize-none placeholder-slate-600 transition-all focus:border-transparent"
                        />
                    </div>

                    <button
                        onClick={handleGenerateVideo}
                        disabled={loading || !veoPrompt}
                        className={`w-full py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${loading || !veoPrompt ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30 hover:shadow-purple-900/50'}`}
                    >
                         {loading ? (
                             <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Generando Media...
                             </>
                         ) : 'Generar Video'}
                    </button>

                    {generatedVideoUrl && (
                        <div className="mt-6 animate-in fade-in duration-500 bg-slate-900/50 p-2 rounded-lg border border-slate-700">
                            <div className="flex items-center justify-between mb-2 px-1">
                                <p className="text-xs text-green-400 font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                    Video Completado
                                </p>
                                <a href={generatedVideoUrl} target="_blank" rel="noreferrer" className="text-[10px] text-slate-400 hover:text-white underline">Descargar</a>
                            </div>
                            <video 
                                src={generatedVideoUrl} 
                                controls 
                                autoPlay 
                                loop 
                                className="w-full rounded-lg border border-slate-800 shadow-xl bg-black"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export default GeminiPanel;