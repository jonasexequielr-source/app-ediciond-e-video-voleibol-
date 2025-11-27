import React, { useRef, useState, useEffect, useCallback } from 'react';
import { GameEvent, ActionType, VideoMeta, VideoClip } from '../types';
import HeatmapOverlay from './HeatmapOverlay';
import { v4 as uuidv4 } from 'uuid'; 

interface VideoAnalyzerProps {
  onEventsChange: (events: GameEvent[]) => void;
  onVideoLoad: (meta: VideoMeta) => void;
  onRequestAnalysis: (frameBase64: string) => void;
}

const VideoAnalyzer: React.FC<VideoAnalyzerProps> = ({ onEventsChange, onVideoLoad, onRequestAnalysis }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  // Editing State
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [clipStart, setClipStart] = useState<number | null>(null);
  const [clipEnd, setClipEnd] = useState<number | null>(null);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [summaryMode, setSummaryMode] = useState(false);

  // Pending event state (when user clicks but hasn't selected type yet)
  const [pendingClick, setPendingClick] = useState<{x: number, y: number} | null>(null);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setEvents([]); // Reset events for new video
      setClips([]); // Reset clips
      setClipStart(null);
      setClipEnd(null);
      setSummaryMode(false);
      onEventsChange([]);
      onVideoLoad({ file, url, duration: 0 }); // Duration updated onLoadedMetadata
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);

      // Loop logic for SINGLE active clip
      if (activeClipId && !summaryMode) {
        const clip = clips.find(c => c.id === activeClipId);
        if (clip && (time >= clip.end || time < clip.start)) {
          videoRef.current.currentTime = clip.start;
          if (videoRef.current.paused) videoRef.current.play();
        }
      }

      // Logic for SUMMARY MODE (Playing only clips, skipping "deleted" parts)
      if (summaryMode && clips.length > 0) {
          const sortedClips = [...clips].sort((a, b) => a.start - b.start);
          
          // Check if we are currently INSIDE a valid clip
          // We use a small buffer (0.1s) to avoid infinite seeking if start is exactly time
          const insideClip = sortedClips.some(c => time >= c.start && time < c.end);
          
          if (!insideClip) {
               // We are in "dead air". Find the next clip to jump to.
               const nextClip = sortedClips.find(c => c.start > time);
               
               if (nextClip) {
                   // Jump to next clip
                   videoRef.current.currentTime = nextClip.start;
               } else {
                   // No more clips ahead. Stop.
                   videoRef.current.pause();
                   setIsPlaying(false);
                   setSummaryMode(false);
               }
          }
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const seek = (seconds: number) => {
      if (videoRef.current) {
          videoRef.current.currentTime = Math.min(Math.max(videoRef.current.currentTime + seconds, 0), duration);
      }
  };

  const changePlaybackRate = (rate: number) => {
      if (videoRef.current) {
          videoRef.current.playbackRate = rate;
          setPlaybackRate(rate);
      }
  };

  // Editing Functions
  const markIn = () => {
      if(videoRef.current) setClipStart(videoRef.current.currentTime);
  };

  const markOut = () => {
      if(videoRef.current) setClipEnd(videoRef.current.currentTime);
  };

  const addClip = () => {
      if (clipStart !== null && clipEnd !== null && clipEnd > clipStart) {
          const newClip: VideoClip = {
              id: Date.now().toString(),
              start: clipStart,
              end: clipEnd,
              title: `Clip ${clips.length + 1}`
          };
          setClips([...clips, newClip]);
          setClipStart(null);
          setClipEnd(null);
      }
  };

  const deleteClip = (id: string) => {
      const newClips = clips.filter(c => c.id !== id);
      setClips(newClips);
      if (activeClipId === id) {
          setActiveClipId(null);
          if (videoRef.current) videoRef.current.pause();
          setIsPlaying(false);
      }
      if (newClips.length === 0) setSummaryMode(false);
  };

  const playClip = (clip: VideoClip) => {
      if (videoRef.current) {
          setSummaryMode(false); // Disable summary mode when selecting specific clip
          setActiveClipId(clip.id);
          videoRef.current.currentTime = clip.start;
          videoRef.current.play();
          setIsPlaying(true);
      }
  };

  const exitClipMode = () => {
      setActiveClipId(null);
  };

  const toggleSummaryMode = () => {
      const newMode = !summaryMode;
      setSummaryMode(newMode);
      setActiveClipId(null); // Disable single clip mode
      
      if (newMode && clips.length > 0 && videoRef.current) {
          // If we are before the first clip, jump to it
          const sorted = [...clips].sort((a, b) => a.start - b.start);
          if (videoRef.current.currentTime < sorted[0].start || videoRef.current.currentTime > sorted[sorted.length-1].end) {
               videoRef.current.currentTime = sorted[0].start;
          }
          videoRef.current.play();
          setIsPlaying(true);
      }
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !videoRef.current) return;
    
    // Don't register click if clicking on the popup buttons
    if ((e.target as HTMLElement).closest('.event-popup')) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Pause video to log event
    videoRef.current.pause();
    setIsPlaying(false);

    setPendingClick({ x, y });
  };

  const confirmEvent = (type: ActionType) => {
    if (!pendingClick || !videoRef.current) return;

    const newEvent: GameEvent = {
      id: Date.now().toString(),
      x: pendingClick.x,
      y: pendingClick.y,
      timestamp: videoRef.current.currentTime,
      type: type
    };

    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);
    onEventsChange(updatedEvents);
    setPendingClick(null);
  };

  const captureFrame = () => {
      if(!videoRef.current) return;
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if(ctx) {
          ctx.drawImage(videoRef.current, 0, 0);
          // Get base64 without prefix for Gemini
          const data = canvas.toDataURL('image/jpeg').split(',')[1];
          onRequestAnalysis(data);
      }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700">
        <div className="flex items-center gap-4">
          <input 
            type="file" 
            accept="video/*" 
            onChange={handleFileChange}
            className="hidden"
            id="video-upload"
          />
          <label 
            htmlFor="video-upload" 
            className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Subir Video
          </label>
          
          <button 
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors border ${showHeatmap ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'}`}
          >
            {showHeatmap ? 'Ocultar Mapa' : 'Ver Mapa Calor'}
          </button>
        </div>

        {videoSrc && (
            <button 
                onClick={captureFrame}
                className="text-sm bg-purple-600/20 text-purple-300 hover:bg-purple-600/40 px-3 py-1.5 rounded border border-purple-500/30 flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Analizar Frame (Gemini)
            </button>
        )}
      </div>

      {/* Main Video Area */}
      <div 
        ref={containerRef}
        className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800 group cursor-crosshair select-none"
        onClick={handleContainerClick}
      >
        {!videoSrc && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>Selecciona un video de voleibol para comenzar</p>
          </div>
        )}

        {videoSrc && (
          <>
            <video
              ref={videoRef}
              src={videoSrc}
              className="w-full h-full object-contain"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onClick={(e) => {
                  e.stopPropagation();
                  handleContainerClick(e as any);
              }}
            />
            
            <HeatmapOverlay events={events} visible={showHeatmap} />

            {/* Play/Pause Overlay Button (Centered when paused) */}
            {!isPlaying && !pendingClick && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/40 p-4 rounded-full backdrop-blur-sm pointer-events-auto cursor-pointer hover:bg-black/60 transition" onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                </div>
              </div>
            )}

            {/* Active Clip / Summary Mode Overlay */}
            {(activeClipId || summaryMode) && (
                <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto">
                    {summaryMode && (
                        <div className="bg-green-600/90 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse shadow-lg flex items-center gap-2">
                            <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                            <span>MODO RESUMEN (Skipping...)</span>
                            <button onClick={(e) => { e.stopPropagation(); toggleSummaryMode(); }} className="hover:text-green-200 ml-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                    )}
                    {activeClipId && !summaryMode && (
                        <div className="bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse shadow-lg flex items-center gap-2">
                            <span>CLIP: {clips.find(c => c.id === activeClipId)?.title}</span>
                            <button onClick={(e) => { e.stopPropagation(); exitClipMode(); }} className="hover:text-red-200">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Event Type Selector Popup */}
            {pendingClick && (
              <div 
                className="absolute z-50 event-popup flex flex-col gap-2 p-2 bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-600 shadow-2xl animate-in fade-in zoom-in duration-200"
                style={{
                  left: `${pendingClick.x}%`,
                  top: `${pendingClick.y}%`,
                  transform: 'translate(-50%, 10px)'
                }}
              >
                <div className="text-xs text-slate-400 font-semibold text-center mb-1">Registrar Acción</div>
                <button 
                  onClick={(e) => { e.stopPropagation(); confirmEvent(ActionType.POINT); }}
                  className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded flex items-center justify-between gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-white"></span> Punto (Suelo)
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); confirmEvent(ActionType.DEFENSE); }}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded flex items-center justify-between gap-2"
                >
                   <span className="w-2 h-2 rounded-full bg-white"></span> Defensa OK
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); confirmEvent(ActionType.BLOCK); }}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded flex items-center justify-between gap-2"
                >
                   <span className="w-2 h-2 rounded-full bg-white"></span> Bloqueo
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); confirmEvent(ActionType.ERROR); }}
                  className="bg-slate-600 hover:bg-slate-500 text-white text-xs px-3 py-1.5 rounded flex items-center justify-between gap-2"
                >
                   <span className="w-2 h-2 rounded-full bg-white"></span> Error / Out
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setPendingClick(null); }}
                  className="mt-1 text-xs text-slate-400 hover:text-white text-center"
                >
                  Cancelar
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Advanced Controls Dashboard */}
      {videoSrc && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col gap-4">
            
            {/* Timeline & Scrubber */}
            <div className="flex flex-col gap-1 relative">
                {/* Clips Visualization on Timeline */}
                <div className="absolute top-0 left-0 right-0 h-2 rounded-lg overflow-hidden pointer-events-none">
                    {clips.map(clip => {
                        const startPct = (clip.start / duration) * 100;
                        const widthPct = ((clip.end - clip.start) / duration) * 100;
                        return (
                            <div 
                                key={clip.id}
                                className="absolute top-0 bottom-0 bg-green-500/50"
                                style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                            />
                        );
                    })}
                </div>

                <input 
                    type="range" 
                    min="0" 
                    max={duration || 100} 
                    value={currentTime}
                    onChange={(e) => {
                        const time = parseFloat(e.target.value);
                        if(videoRef.current) videoRef.current.currentTime = time;
                        setCurrentTime(time);
                    }}
                    className="w-full accent-blue-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer z-10 bg-transparent"
                />
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Playback Controls */}
                <div className="flex items-center gap-2">
                    <button onClick={() => seek(-5)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg" title="-5s">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" /></svg>
                    </button>
                    <button onClick={() => seek(-1)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg" title="-1s">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" /></svg>
                    </button>
                    
                    <button onClick={togglePlay} className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg">
                        {isPlaying ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                        )}
                    </button>
                    
                    <button onClick={() => seek(1)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg" title="+1s">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" /></svg>
                    </button>
                    <button onClick={() => seek(5)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg" title="+5s">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z" /></svg>
                    </button>
                </div>

                {/* Speed Controls */}
                <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                    {[0.5, 1, 2].map(rate => (
                        <button 
                            key={rate}
                            onClick={() => changePlaybackRate(rate)}
                            className={`px-3 py-1 text-xs font-medium rounded ${playbackRate === rate ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            {rate}x
                        </button>
                    ))}
                </div>

                {/* Editing Tools (Cut/Paste) */}
                <div className="flex items-center gap-2 pl-4 border-l border-slate-700">
                    <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mr-2 hidden md:inline">Edición</span>
                    <button 
                        onClick={markIn} 
                        className={`px-3 py-1.5 rounded flex items-center gap-1 text-xs border ${clipStart !== null ? 'bg-amber-600/20 text-amber-400 border-amber-600/50' : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'}`}
                        title="Marcar Inicio (Cut In)"
                    >
                        <span>[</span> IN
                    </button>
                    <button 
                        onClick={markOut}
                        className={`px-3 py-1.5 rounded flex items-center gap-1 text-xs border ${clipEnd !== null ? 'bg-amber-600/20 text-amber-400 border-amber-600/50' : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'}`}
                        title="Marcar Fin (Cut Out)"
                    >
                        OUT <span>]</span>
                    </button>
                    <button 
                        onClick={addClip}
                        disabled={clipStart === null || clipEnd === null}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs rounded border border-amber-500 flex items-center gap-2"
                        title="Guardar Clip (Paste to List)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        Guardar
                    </button>
                    
                    <div className="w-px h-6 bg-slate-700 mx-2"></div>
                    
                    <button
                        onClick={toggleSummaryMode}
                        disabled={clips.length === 0}
                        className={`px-3 py-1.5 rounded text-xs flex items-center gap-2 border transition-all ${summaryMode ? 'bg-green-600 text-white border-green-500 shadow-green-900/50 shadow-lg' : 'bg-slate-800 text-green-400 border-slate-600 hover:border-green-500 disabled:opacity-30 disabled:hover:border-slate-600'}`}
                        title="Reproducir solo los clips (Eliminar partes innecesarias)"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                         {summaryMode ? 'Viendo Resumen' : 'Ver Resumen'}
                    </button>
                </div>
            </div>

            {/* Clips List (Visual Playlist) */}
            {clips.length > 0 && (
                <div className="mt-2 border-t border-slate-700 pt-4">
                    <h3 className="text-xs font-semibold text-slate-400 mb-2 uppercase flex justify-between">
                        <span>Clips Guardados</span>
                        <span className="text-[10px] normal-case font-normal text-slate-500">Haz clic para ver individualmente</span>
                    </h3>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {clips.map(clip => (
                            <div 
                                key={clip.id}
                                className={`flex-shrink-0 w-36 p-2 rounded border transition-all relative group ${activeClipId === clip.id ? 'bg-blue-900/30 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}
                            >
                                <div onClick={() => playClip(clip)} className="cursor-pointer">
                                    <div className="text-xs font-medium text-white truncate pr-6">{clip.title}</div>
                                    <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                                        <span>{formatTime(clip.start)}</span>
                                        <span>{formatTime(clip.end)}</span>
                                    </div>
                                    <div className="mt-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{ width: '100%' }}></div>
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); deleteClip(clip.id); }}
                                    className="absolute top-1 right-1 p-1 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                                    title="Eliminar Clip"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default VideoAnalyzer;