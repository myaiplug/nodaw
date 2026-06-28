
import React, { useEffect, useRef, useState } from 'react';

interface WaveformProps {
  samples: number[];
  progress?: number; // 0 to 1
  selectionStart?: number; // 0 to 1
  selectionEnd?: number; // 0 to 1
  height?: number;
  interactive?: boolean;
  zoom?: number; // 1 to 10
  isPlaying?: boolean;
  isLooping?: boolean;
  onTogglePlay?: (startTime?: number, loop?: boolean, loopEnd?: number) => void;
  onToggleLoop?: (loop: boolean) => void;
  onProgressChange?: (progress: number) => void;
  onSelectionChange?: (start: number, end: number) => void;
  onZoomChange?: (zoom: number) => void;
  onSeek?: (ratio: number) => void;
  onDownloadSelection?: () => void;
  showPlayButton?: boolean;
  allowZoom?: boolean;
}

const Waveform: React.FC<WaveformProps> = ({ 
  samples, 
  progress = 0, 
  selectionStart = -1, 
  selectionEnd = -1,
  height = 240,
  interactive = true,
  zoom = 1,
  isPlaying = false,
  isLooping = false,
  onTogglePlay,
  onToggleLoop,
  onProgressChange,
  onSelectionChange,
  onZoomChange,
  onSeek,
  onDownloadSelection,
  showPlayButton = true,
  allowZoom = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'selection' | 'handle-start' | 'handle-end' | 'playhead' | null>(null);
  const [isHoveringHandle, setIsHoveringHandle] = useState<'start' | 'end' | 'playhead' | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  // Constants for interaction zones - Minimized to reduce white area
  const TOP_STRIP_HEIGHT = 10; 

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      ctx.clearRect(0, 0, rect.width, height);
      
      const barWidth = (rect.width * zoom) / samples.length;
      const centerY = (height + TOP_STRIP_HEIGHT) / 2;
      const waveAreaHeight = height - TOP_STRIP_HEIGHT;

      // Draw Seek Zone Background
      ctx.fillStyle = 'rgba(0,0,0,0.015)';
      ctx.fillRect(0, 0, rect.width, TOP_STRIP_HEIGHT);

      // Draw Waveform Bars - Use 1.1x multiplier to make them "taller" visually
      samples.forEach((sample, i) => {
        const x = i * barWidth;
        // Boosted sample height for a fuller visual appearance
        const barHeight = Math.min(waveAreaHeight, sample * waveAreaHeight * 1.15);
        const barProgress = i / samples.length;

        const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
        const isPast = barProgress <= progress && progress > 0;
        
        if (isPast) {
          gradient.addColorStop(0, '#06B6D4');
          gradient.addColorStop(1, '#A855F7');
        } else {
          gradient.addColorStop(0, '#F1F5F9');
          gradient.addColorStop(1, '#E2E8F0');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x + 0.5, centerY - barHeight / 2, Math.max(0.5, barWidth - 1), barHeight, 1);
        ctx.fill();
      });

      // Selection Overlay
      if (selectionStart !== -1 && selectionEnd !== -1 && selectionStart !== selectionEnd) {
        const startX = selectionStart * rect.width;
        const endX = selectionEnd * rect.width;
        
        ctx.fillStyle = 'rgba(168, 85, 247, 0.05)';
        ctx.fillRect(startX, TOP_STRIP_HEIGHT, endX - startX, waveAreaHeight);
        
        const handleGradient = ctx.createLinearGradient(0, 0, 0, height);
        handleGradient.addColorStop(0, '#06B6D4');
        handleGradient.addColorStop(1, '#A855F7');
        ctx.fillStyle = handleGradient;

        ctx.fillRect(startX - 1, TOP_STRIP_HEIGHT, 2, waveAreaHeight);
        ctx.fillRect(endX - 1, TOP_STRIP_HEIGHT, 2, waveAreaHeight);

        const drawHandleDot = (x: number, active: boolean) => {
          ctx.beginPath();
          ctx.arc(x, centerY, active ? 8 : 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        };

        drawHandleDot(startX, isHoveringHandle === 'start' || isDragging === 'handle-start');
        drawHandleDot(endX, isHoveringHandle === 'end' || isDragging === 'handle-end');
      }

      // Playhead Line
      if (progress >= 0) {
        const playX = progress * rect.width;
        
        ctx.strokeStyle = '#A855F7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playX, 0);
        ctx.lineTo(playX, height);
        ctx.stroke();

        ctx.fillStyle = '#A855F7';
        ctx.beginPath();
        ctx.moveTo(playX - 4, 0);
        ctx.lineTo(playX + 4, 0);
        ctx.lineTo(playX, 6);
        ctx.closePath();
        ctx.fill();
      }

      if (hoverX !== null && !isDragging) {
        ctx.strokeStyle = 'rgba(0,0,0,0.02)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hoverX, 0);
        ctx.lineTo(hoverX, height);
        ctx.stroke();
      }
    };

    draw();
  }, [samples, progress, selectionStart, selectionEnd, height, zoom, isHoveringHandle, isDragging, isPlaying, hoverX]);

  const getPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { ratio: 0, y: 0 };
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return {
      ratio: Math.max(0, Math.min(1, x / rect.width)),
      y
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!interactive) return;
    const { ratio, y } = getPos(e);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const threshold = 15 / rect.width;

    if (y < TOP_STRIP_HEIGHT) {
      setIsDragging('playhead');
      onSeek?.(ratio);
      return;
    }

    if (selectionStart !== -1 && Math.abs(ratio - selectionStart) < threshold) {
      setIsDragging('handle-start');
    } else if (selectionEnd !== -1 && Math.abs(ratio - selectionEnd) < threshold) {
      setIsDragging('handle-end');
    } else {
      setIsDragging('selection');
      onSelectionChange?.(ratio, ratio);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { ratio, y } = getPos(e);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const threshold = 15 / rect.width;
    
    setHoverX(e.clientX - rect.left);

    if (!isDragging) {
      if (y < TOP_STRIP_HEIGHT) {
        setIsHoveringHandle('playhead');
      } else if (selectionStart !== -1 && Math.abs(ratio - selectionStart) < threshold) {
        setIsHoveringHandle('start');
      } else if (selectionEnd !== -1 && Math.abs(ratio - selectionEnd) < threshold) {
        setIsHoveringHandle('end');
      } else {
        setIsHoveringHandle(null);
      }
    }

    if (!interactive || !isDragging) return;

    if (isDragging === 'playhead') {
      onSeek?.(ratio);
    } else if (isDragging === 'selection') {
      const start = Math.min(selectionStart < 0 ? ratio : selectionStart, ratio);
      const end = Math.max(selectionStart < 0 ? ratio : selectionStart, ratio);
      onSelectionChange?.(start, end);
    } else if (isDragging === 'handle-start') {
      const newStart = Math.min(ratio, selectionEnd - 0.001);
      onSelectionChange?.(newStart, selectionEnd);
    } else if (isDragging === 'handle-end') {
      const newEnd = Math.max(ratio, selectionStart + 0.001);
      onSelectionChange?.(selectionStart, newEnd);
    }
  };

  const handleMouseUp = () => setIsDragging(null);

  const selectionWidth = selectionEnd - selectionStart;
  const isSelectionActive = selectionStart !== -1 && selectionEnd !== -1 && selectionWidth > 0.002;

  return (
    <div 
      ref={containerRef} 
      className="relative w-full group overflow-visible select-none" 
      style={{ minHeight: `${height}px` }}
    >
      {showPlayButton && onTogglePlay && (
        <button 
          onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
          className="absolute left-1 top-0 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-100 transition-all hover:scale-110 active:scale-95 group/btn z-40"
        >
          {isPlaying ? (
            <svg className="w-2 h-2" viewBox="0 0 24 24">
              <rect x="8" y="6" width="2" height="12" fill="#A855F7" rx="0.5"/>
              <rect x="14" y="6" width="2" height="12" fill="#A855F7" rx="0.5"/>
            </svg>
          ) : (
            <svg className="w-2 h-2 translate-x-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" fill="#06B6D4"/>
            </svg>
          )}
        </button>
      )}

      <canvas 
        ref={canvasRef} 
        className={`w-full transition-opacity duration-300 ${isHoveringHandle || isDragging ? 'cursor-ew-resize' : 'cursor-crosshair'}`}
        style={{ height: `${height}px` }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setIsHoveringHandle(null); setHoverX(null); }}
      />
      
      {allowZoom && onZoomChange && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col space-y-1 z-40 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onZoomChange(Math.min(zoom + 1, 10))}
            className="w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-50 hover:bg-slate-50 active:scale-90 transition-all text-slate-500"
          >
            <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button 
            onClick={() => onZoomChange(Math.max(zoom - 1, 1))}
            className="w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-50 hover:bg-slate-50 active:scale-90 transition-all text-slate-500"
          >
            <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
            </svg>
          </button>
        </div>
      )}

      {isSelectionActive && onTogglePlay && (
        <div 
          className="absolute top-[-22px] left-0 pointer-events-none w-full h-0 z-50"
          style={{ transform: `translateX(${selectionStart * 100}%)`, width: `${selectionWidth * 100}%` }}
        >
          <div className="flex justify-center w-full relative">
            <div className="pointer-events-auto flex items-center bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-slate-100 p-0.5 space-x-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onTogglePlay(selectionStart, isLooping, selectionEnd);
                }}
                className={`flex items-center space-x-1 px-1 py-0.5 rounded transition-all ${isPlaying ? 'bg-purple-50 text-purple-600' : 'bg-slate-900 text-white hover:bg-black'}`}
              >
                <div className="w-1.5 h-1.5 flex items-center justify-center">
                  {isPlaying ? (
                    <svg className="w-1.5 h-1.5 fill-current" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="0.5"/></svg>
                  ) : (
                    <svg className="w-1.5 h-1.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  )}
                </div>
                <span className="text-[5px] font-black uppercase tracking-[0.1em] whitespace-nowrap">
                  {isPlaying ? 'Stop' : 'Region'}
                </span>
              </button>
              
              <div className="w-px h-2 bg-slate-100 mx-0.5"></div>

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLoop?.(!isLooping);
                }}
                className={`w-3.5 h-3.5 flex items-center justify-center rounded transition-all ${isLooping ? 'bg-cyan-50 text-cyan-600' : 'bg-transparent text-slate-400 hover:bg-slate-50'}`}
                title="Toggle Loop"
              >
                <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadSelection?.();
                }}
                className={`w-3.5 h-3.5 flex items-center justify-center rounded transition-all bg-transparent text-slate-400 hover:bg-slate-50 hover:text-cyan-600`}
                title="Download Selection"
              >
                <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Waveform;
