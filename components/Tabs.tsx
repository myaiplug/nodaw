
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MOCK_SAMPLES, WORKFLOWS } from '../constants';
import Waveform from './Waveform';
import { EffectWorkflow, AudioTrack } from '../types';

interface TabProps {
  buffer: AudioBuffer | null;
  bufferA?: AudioBuffer | null;
  bufferB?: AudioBuffer | null;
  isPlaying: boolean;
  isMuted?: boolean;
  togglePlayback: (startTime?: number, loop?: boolean, loopEndRatio?: number) => void;
  playbackParams?: { start: number, loop: boolean, end: number };
  onFileLoaded?: (file: File) => void;
  onUpdateBuffer?: (newBuffer: AudioBuffer) => void;
  onUpdateBufferB?: (newBuffer: AudioBuffer) => void;
  onSetBufferA?: (buffer: AudioBuffer) => void;
  onSetBufferB?: (buffer: AudioBuffer) => void;
  onUpload?: () => void;
  onPreviewEffectsChange?: (ids: string[]) => void;
  previewEffectIds?: string[];
  effectParams?: Record<string, Record<string, number>>;
  setEffectParams?: React.Dispatch<React.SetStateAction<Record<string, Record<string, number>>>>;
  onApplyEffects?: (effectIds: string[]) => Promise<void>;
  onUndo?: () => void;
  canUndo?: boolean;
  onToggleMute?: () => void;
  ctx?: AudioContext | null;
}

const WorkflowIcon: React.FC<{ name: string; className?: string }> = ({ name, className = "w-6 h-6" }) => {
  const icons: Record<string, React.ReactNode> = {
    vocal: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></>,
    sparkles: <><path d="m12 3 1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></>,
    radio: <><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/></>,
    user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    waves: <><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></>,
    mic: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></>,
    volume: <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></>,
    tape: <><rect width="20" height="16" x="2" y="4" rx="2"/><circle cx="8" cy="10" r="2"/><circle cx="16" cy="10" r="2"/><path d="m6 14 4 4"/><path d="m18 14-4 4"/></>,
    guitar: <><path d="M10 14a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-2a3 3 0 0 1 3-3h5Z"/><path d="M12 14v-4"/><path d="M18 6V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v2"/><path d="M15 14v-8"/></>,
    keys: <><rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 4v10"/><path d="M10 4v10"/><path d="M14 4v10"/><path d="M18 4v10"/><path d="M2 14h20"/></>,
    drum: <><ellipse cx="12" cy="6" rx="9" ry="3"/><path d="M3 6v12a9 3 0 0 0 18 0V6"/><path d="M12 9V6"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></>,
    cloud: <><path d="M17.5 19c.4 0 .8 0 1.2-.1A6.5 6.5 0 0 0 20 6.5a1 1 0 0 0-1-1 1 1 0 0 0-1 .1A6.5 6.5 0 0 0 5 6.5a6.5 6.5 0 0 0 1.5 12.4l1.2.1h9.8Z"/></>,
    width: <><path d="m18 8 4 4-4 4"/><path d="M2 12h20"/><path d="m6 8-4 4 4 4"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    mono: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></>,
    brain: <><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54Z"/></>,
    scissors: <><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" x2="8.12" y1="4" y2="15.88"/><line x1="14.47" x2="20" y1="14.48" y2="20"/><line x1="8.12" x2="12" y1="8.12" y2="12"/></>,
    barchart: <><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></>,
    headphones: <><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></>,
    film: <><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M17 3v18"/><path d="M3 7h4"/><path d="M3 12h4"/><path d="M3 17h4"/><path d="M17 7h4"/><path d="M17 12h4"/><path d="M17 17h4"/></>,
    diamond: <><path d="M6 3h12l4 6-10 12L2 9z"/><path d="M11 3 8 9l4 12 4-12-3-6"/><path d="M2 9h20"/></>,
    sliders: <><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/></>,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polygon points="2 12 12 17 22 12"/><polygon points="2 17 12 22 22 17"/></>,
    orbit: <><circle cx="12" cy="12" r="3"/><path d="M3.8 15c-1.3-3.6 1.1-7.7 5.4-9.1 4.3-1.4 8.9.4 10.2 4s-1.1 7.7-5.4 9.1c-4.3 1.4-8.9-.4-10.2-4Z"/><path d="M20.2 15c1.3-3.6-1.1-7.7-5.4-9.1-4.3-1.4-8.9.4-10.2 4s1.1 7.7 5.4 9.1c4.3 1.4 8.9-.4 10.2-4Z"/></>,
  };

  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      {icons[name] || <circle cx="12" cy="12" r="10" strokeDasharray="4 4" />}
    </svg>
  );
};

const getSamplesFromBuffer = (buffer: AudioBuffer | null, length: number = 200) => {
  if (!buffer) return MOCK_SAMPLES;
  const channelData = buffer.getChannelData(0);
  const step = Math.floor(channelData.length / length);
  const result = [];
  for (let i = 0; i < length; i++) {
    let max = 0;
    for (let j = 0; j < step; j++) {
      const datum = Math.abs(channelData[i * step + j]);
      if (datum > max) max = datum;
    }
    result.push(max);
  }
  return result;
};

const bufferToWave = (abuffer: AudioBuffer) => {
  const numOfChan = abuffer.numberOfChannels;
  const length = abuffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = [];
  let offset = 0;
  let pos = 0;

  const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
  const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

  // RIFF identifier
  setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157); setUint32(0x20746d66); setUint32(16);
  setUint16(1); setUint16(numOfChan); setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan); setUint16(numOfChan * 2); setUint16(16);
  setUint32(0x61746164); setUint32(length - pos - 4);

  for(let i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));

  while(pos < length) {
    for(let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF);
      view.setInt16(pos, sample, true); pos += 2;
    }
    offset++;
  }
  return new Blob([bufferArr], {type: "audio/wav"});
};

const EmptyState: React.FC<{ message: string; onUpload?: () => void }> = ({ message, onUpload }) => (
  <div className="flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in duration-700 mx-auto">
    <button onClick={onUpload} className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center border border-slate-50 shadow-2xl hover:scale-105 transition-all group">
      <svg className="w-12 h-12 text-cyan-500 group-hover:text-purple-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    </button>
    <p className="text-slate-400 text-[10px] mt-3 font-black uppercase tracking-[0.3em]">{message}</p>
  </div>
);

export const ConvertTab: React.FC<{ onFileLoaded: (file: File) => void }> = ({ onFileLoaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col items-center justify-center py-2 mx-auto w-full max-w-2xl animate-in fade-in duration-500">
      <div 
        onClick={() => fileInputRef.current?.click()} 
        className="w-full aspect-video border-2 border-dashed border-slate-100 rounded-[56px] flex flex-col items-center justify-center cursor-pointer hover:border-cyan-400 transition-all bg-white shadow-xl group"
      >
        <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={(e) => e.target.files?.[0] && onFileLoaded(e.target.files[0])} />
        <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-cyan-50 transition-all">
          <svg className="w-10 h-10 text-slate-300 group-hover:text-cyan-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <h3 className="text-4xl font-outfit font-bold text-slate-800">NoDAW Labs</h3>
        <p className="text-slate-400 text-sm mt-4 uppercase tracking-widest font-bold">Import audio</p>
      </div>
    </div>
  );
};

export const TrimTab: React.FC<TabProps> = ({ buffer, isPlaying, isMuted, togglePlayback, playbackParams, onUpdateBuffer, onUpload, ctx, onUndo, canUndo, onToggleMute }) => {
  const [progress, setProgress] = useState(0);
  const [selection, setSelection] = useState({ start: -1, end: -1 });
  const samples = getSamplesFromBuffer(buffer);
  
  useEffect(() => {
    if (!isPlaying || !buffer) { 
      return; 
    }
    const startRatio = playbackParams?.start || 0;
    const endRatio = playbackParams?.end || 1;
    const startTime = Date.now();
    let animationFrameId: number;

    const update = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const currentPos = Math.min(endRatio, startRatio + (elapsed / buffer.duration));
      setProgress(currentPos);
      if (currentPos < endRatio) {
        animationFrameId = requestAnimationFrame(update);
      }
    };
    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, buffer, playbackParams]);

  const handleCrop = () => {
    if (!buffer || !ctx || selection.start === -1 || selection.end === -1) return;
    const startFrame = Math.floor(selection.start * buffer.length);
    const endFrame = Math.floor(selection.end * buffer.length);
    const frameCount = endFrame - startFrame;
    if (frameCount <= 0) return;

    const newBuffer = ctx.createBuffer(buffer.numberOfChannels, frameCount, buffer.sampleRate);
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      const data = buffer.getChannelData(i).subarray(startFrame, endFrame);
      newBuffer.getChannelData(i).set(data);
    }
    onUpdateBuffer?.(newBuffer);
    setSelection({ start: -1, end: -1 });
  };

  const handleCut = () => {
    if (!buffer || !ctx || selection.start === -1 || selection.end === -1) return;
    const startFrame = Math.floor(selection.start * buffer.length);
    const endFrame = Math.floor(selection.end * buffer.length);
    const newLength = buffer.length - (endFrame - startFrame);
    if (newLength <= 0) return;

    const newBuffer = ctx.createBuffer(buffer.numberOfChannels, newLength, buffer.sampleRate);
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      const oldData = buffer.getChannelData(i);
      const newData = newBuffer.getChannelData(i);
      newData.set(oldData.subarray(0, startFrame));
      newData.set(oldData.subarray(endFrame), startFrame);
    }
    onUpdateBuffer?.(newBuffer);
    setSelection({ start: -1, end: -1 });
  };

  const handleExport = () => {
    if (!buffer) return;
    const blob = bufferToWave(buffer);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "nodaw_master_export.wav";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!buffer) return <EmptyState message="Upload audio to edit precision wave" onUpload={onUpload} />;

  const hasSelection = selection.start !== -1 && selection.end !== -1 && (selection.end - selection.start > 0.001);

  return (
    <div className="space-y-6 w-full mx-auto max-w-4xl flex flex-col items-center">
      <div className="bg-white rounded-[40px] p-8 shadow-2xl border border-slate-50 relative w-full">
        <Waveform samples={samples} progress={progress} selectionStart={selection.start} selectionEnd={selection.end} isPlaying={isPlaying} onTogglePlay={(start, loop, end) => {
          if (start === undefined && hasSelection) {
            togglePlayback(selection.start, loop ?? false, selection.end);
          } else {
            togglePlayback(start ?? 0, loop ?? false, end ?? 1);
          }
        }} onSelectionChange={(s, e) => setSelection({start: s, end: e})} height={200} />
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
        <button onClick={handleCrop} disabled={!hasSelection} className={`flex flex-col items-center justify-center p-5 rounded-[28px] border transition-all ${hasSelection ? 'bg-white border-cyan-100 text-slate-800 hover:border-cyan-400 hover:shadow-lg' : 'bg-slate-50 border-slate-50 text-slate-300 cursor-not-allowed opacity-50'}`}>
          <svg className="w-5 h-5 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
          <span className="text-[9px] font-black uppercase tracking-widest">Crop</span>
        </button>
        <button onClick={handleCut} disabled={!hasSelection} className={`flex flex-col items-center justify-center p-5 rounded-[28px] border transition-all ${hasSelection ? 'bg-white border-red-100 text-slate-800 hover:border-red-400 hover:shadow-lg' : 'bg-slate-50 border-slate-50 text-slate-300 cursor-not-allowed opacity-50'}`}>
          <svg className="w-5 h-5 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758L5 19m0-14l4.121 4.121" /></svg>
          <span className="text-[9px] font-black uppercase tracking-widest">Cut</span>
        </button>
        <button onClick={onUndo} disabled={!canUndo} className={`flex flex-col items-center justify-center p-5 rounded-[28px] border transition-all ${canUndo ? 'bg-white border-amber-100 text-slate-800 hover:border-amber-400 hover:shadow-lg' : 'bg-slate-50 border-slate-50 text-slate-300 cursor-not-allowed opacity-50'}`}>
          <svg className="w-5 h-5 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
          <span className="text-[9px] font-black uppercase tracking-widest">Undo</span>
        </button>
        <button onClick={onToggleMute} className={`flex flex-col items-center justify-center p-5 rounded-[28px] border transition-all bg-white hover:shadow-lg ${isMuted ? 'border-red-500 text-red-500' : 'border-slate-100 text-slate-800 hover:border-slate-400'}`}>
          {isMuted ? (
            <svg className="w-5 h-5 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
          ) : (
            <svg className="w-5 h-5 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
          )}
          <span className="text-[9px] font-black uppercase tracking-widest">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>
        <button onClick={() => setSelection({start: -1, end: -1})} disabled={!hasSelection} className={`flex flex-col items-center justify-center p-5 rounded-[28px] border transition-all ${hasSelection ? 'bg-white border-slate-100 text-slate-800 hover:border-slate-400 hover:shadow-lg' : 'bg-slate-50 border-slate-50 text-slate-300 cursor-not-allowed opacity-50'}`}>
          <svg className="w-5 h-5 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          <span className="text-[9px] font-black uppercase tracking-widest">Reset</span>
        </button>
        <button onClick={handleExport} className={`flex flex-col items-center justify-center p-5 rounded-[28px] border transition-all bg-white border-purple-100 text-slate-800 hover:border-purple-400 hover:shadow-lg`}>
          <svg className="w-5 h-5 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          <span className="text-[9px] font-black uppercase tracking-widest">Export</span>
        </button>
      </div>
    </div>
  );
};

export const CompareTab: React.FC<TabProps> = ({ bufferA, bufferB, ctx, onSetBufferA, onSetBufferB }) => {
  const [activeChannel, setActiveChannel] = useState<'A' | 'B'>('A');
  const [isPlaying, setIsPlaying] = useState(false);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  const fileInputARef = useRef<HTMLInputElement>(null);
  const fileInputBRef = useRef<HTMLInputElement>(null);

  const samplesA = getSamplesFromBuffer(bufferA);
  const samplesB = getSamplesFromBuffer(bufferB);

  const stop = () => { if (sourceRef.current) { try { sourceRef.current.stop(); } catch(e) {} } setIsPlaying(false); };

  const play = (channel: 'A' | 'B') => {
    const buffer = channel === 'A' ? bufferA : bufferB;
    if (!ctx || !buffer) return;
    stop();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    sourceRef.current = source;
    setIsPlaying(true);
    source.onended = () => { if (sourceRef.current === source) setIsPlaying(false); };
  };

  const handleToggle = (channel: 'A' | 'B') => { setActiveChannel(channel); if (isPlaying) play(channel); };

  const handleWaveClick = (channel: 'A' | 'B') => {
    if (activeChannel === channel && isPlaying) { stop(); } 
    else { handleToggle(channel); if (!isPlaying) play(channel); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, channel: 'A' | 'B') => {
    const file = e.target.files?.[0];
    if (!file || !ctx) return;
    const arrayBuffer = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    if (channel === 'A') onSetBufferA?.(decoded); else onSetBufferB?.(decoded);
  };

  useEffect(() => () => stop(), []);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center space-y-10 py-6">
      <input type="file" ref={fileInputARef} className="hidden" accept="audio/*" onChange={(e) => handleFileUpload(e, 'A')} />
      <input type="file" ref={fileInputBRef} className="hidden" accept="audio/*" onChange={(e) => handleFileUpload(e, 'B')} />

      <div className="flex bg-slate-100 p-1.5 rounded-[24px] shadow-inner w-full max-w-xs h-16">
        <button onClick={() => handleToggle('A')} className={`flex-1 flex items-center justify-center rounded-[18px] font-outfit font-black text-xs tracking-widest transition-all ${activeChannel === 'A' ? 'bg-white text-slate-900 shadow-md scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}>MASTER A</button>
        <button onClick={() => handleToggle('B')} className={`flex-1 flex items-center justify-center rounded-[18px] font-outfit font-black text-xs tracking-widest transition-all ${activeChannel === 'B' ? 'bg-white text-slate-900 shadow-md scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}>VARIANT B</button>
      </div>

      <div className="w-full space-y-12">
        <div onClick={() => handleWaveClick('A')} className={`relative cursor-pointer transition-all duration-500 rounded-[48px] p-8 border ${activeChannel === 'A' ? 'bg-white border-cyan-300 ring-4 ring-cyan-50 shadow-2xl scale-[1.02]' : 'bg-slate-50/50 border-slate-100 opacity-60 hover:opacity-100 hover:scale-[1.01]'}`}>
           <div className="absolute top-4 left-10 flex space-x-2"><button onClick={(e) => {e.stopPropagation(); fileInputARef.current?.click();}} className="w-6 h-6 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-all">+</button></div>
           <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4 text-center">Reference Source</div>
           <Waveform samples={samplesA} height={140} isPlaying={isPlaying && activeChannel === 'A'} showPlayButton={false} interactive={false} />
        </div>
        <div onClick={() => handleWaveClick('B')} className={`relative cursor-pointer transition-all duration-500 rounded-[48px] p-8 border ${activeChannel === 'B' ? 'bg-white border-purple-300 ring-4 ring-purple-50 shadow-2xl scale-[1.02]' : 'bg-slate-50/50 border-slate-100 opacity-60 hover:opacity-100 hover:scale-[1.01]'}`}>
           <div className="absolute top-4 left-10 flex space-x-2"><button onClick={(e) => {e.stopPropagation(); fileInputBRef.current?.click();}} className="w-6 h-6 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-all">+</button></div>
           <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4 text-center">Neural Output</div>
           <Waveform samples={samplesB} height={140} isPlaying={isPlaying && activeChannel === 'B'} showPlayButton={false} interactive={false} />
        </div>
      </div>
    </div>
  );
};

export const EffectsTab: React.FC<TabProps> = ({ buffer, isPlaying, togglePlayback, onUpdateBufferB, ctx, onUpload, onPreviewEffectsChange, effectParams, setEffectParams, onApplyEffects }) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeEffectId, setActiveEffectId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const samples = getSamplesFromBuffer(buffer);
  const categories = ['Instrumental', 'Vocals', 'Both', 'Mastering'];

  if (!buffer || !ctx) return <EmptyState message="Connect a master file for neural workflow" onUpload={onUpload} />;

  const handleEffectClick = (id: string) => {
    setActiveEffectId(id);
    setIsProcessing(true);
    setSuccessMessage(null);
    onPreviewEffectsChange?.([id]);

    setTimeout(() => {
      onUpdateBufferB?.(buffer); 
      setIsProcessing(false);
      setSuccessMessage("SYNCHRONIZED TO SLOT B");
      setTimeout(() => setSuccessMessage(null), 2500);
    }, 600);
  };

  const handleApply = async () => {
    if (!activeEffectId || !onApplyEffects) return;
    setIsProcessing(true);
    await onApplyEffects([activeEffectId]);
    setIsProcessing(false);
    setSuccessMessage("APPLIED TO TRACK");
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const currentWorkflow = WORKFLOWS.find(w => w.id === activeEffectId);

  const renderKnobs = () => {
    if (!effectParams || !setEffectParams || !activeEffectId) return null;
    const params = effectParams[activeEffectId];
    if (!params) return null;

    return (
      <div className="w-full mt-10 p-6 bg-white rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-8">
        {Object.entries(params).map(([key, value]) => {
          let min = 0, max = 100, step = 1;
          if (activeEffectId === 'inst-bass') {
            if (key === 'freq') { min = 20; max = 300; }
            else if (key === 'gain') { min = 0; max = 20; step = 0.1; }
            else if (key === 'drive') { min = 0.1; max = 5; step = 0.1; }
          } else if (activeEffectId === 'vocal-deep') {
             if (key === 'detune') { min = -1200; max = 0; step = 10; }
             else if (key === 'gain') { min = 0; max = 15; step = 0.5; }
          } else if (activeEffectId === 'proc-width') {
             if (key === 'width') { min = 0.5; max = 3; step = 0.1; }
          } else if (activeEffectId === 'proc-warp') {
             if (key === 'rate') { min = 0.1; max = 10; step = 0.1; }
             else if (key === 'depth') { min = 0; max = 1200; step = 10; }
          } else if (activeEffectId === 'mast-lufs') {
             if (key === 'threshold') { min = -40; max = 0; step = 0.5; }
             else if (key === 'ratio') { min = 1; max = 20; step = 0.5; }
          }

          return (
            <div key={key} className="flex flex-col space-y-3">
               <div className="flex justify-between items-center text-[10px] font-black tracking-widest text-slate-400 uppercase">
                  <span>{key}</span>
                  <span className="text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md">{value.toFixed(1)}</span>
               </div>
               <input 
                 type="range" 
                 min={min} 
                 max={max} 
                 step={step} 
                 value={value}
                 onChange={(e) => setEffectParams(prev => ({
                   ...prev,
                   [activeEffectId]: {
                     ...prev[activeEffectId],
                     [key]: parseFloat(e.target.value)
                   }
                 }))}
                 className="w-full h-2 bg-slate-100 rounded-full appearance-none accent-cyan-500 cursor-pointer" 
               />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 flex flex-col items-center">
      <div className="bg-white rounded-[64px] p-10 shadow-3xl border border-slate-50 overflow-hidden w-full">
        <div className="pb-10 border-b border-slate-50 mb-10">
          <Waveform samples={samples} height={140} interactive={true} isPlaying={isPlaying} onTogglePlay={(start) => togglePlayback(start ?? 0, true, 1)} />
        </div>

        <div className="flex flex-wrap justify-center gap-6 mb-10">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(activeCategory === cat ? null : cat)} className={`px-8 py-3 rounded-2xl font-outfit font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 border ${activeCategory === cat ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105' : 'bg-slate-50 text-slate-400 border-slate-100 hover:text-slate-900 hover:border-slate-300'}`}>
              {cat}
            </button>
          ))}
        </div>

        <div className={`overflow-hidden transition-all duration-700 ease-in-out ${activeCategory ? 'max-h-[800px] opacity-100 mb-10' : 'max-h-0 opacity-0 pointer-events-none'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {WORKFLOWS.filter(w => w.category === activeCategory).map(workflow => (
              <button key={workflow.id} onClick={() => handleEffectClick(workflow.id)} className={`flex items-center p-5 rounded-[28px] text-left transition-all duration-500 border group relative ${activeEffectId === workflow.id ? 'border-cyan-400 bg-cyan-50/20 shadow-lg scale-[1.02]' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                <div className="mr-4 transition-transform group-hover:scale-110">
                  <WorkflowIcon name={workflow.icon} className={`w-8 h-8 ${activeEffectId === workflow.id ? 'text-cyan-500' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1">
                  <div className="font-outfit font-bold text-xs text-slate-800 leading-tight">{workflow.title}</div>
                  <div className="text-[8px] text-slate-400 mt-1 font-black tracking-widest uppercase opacity-40">Neural Node</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className={`transition-all duration-500 w-full overflow-hidden ${activeEffectId ? 'opacity-100 translate-y-0 max-h-[800px]' : 'opacity-0 translate-y-8 pointer-events-none max-h-0'}`}>
          <div className="relative w-full flex flex-col items-center bg-slate-50/50 rounded-[48px] p-8 border border-slate-100">
             {isProcessing && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-[48px] animate-in fade-in duration-300"><div className="flex flex-col items-center"><div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-3"></div><span className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">Generating Neural Map...</span></div></div>}
             <div className="mb-4 drop-shadow-xl text-cyan-500">
               <WorkflowIcon name={currentWorkflow?.icon || ''} className="w-20 h-20" />
             </div>
             <h3 className="text-xl font-outfit font-bold text-slate-800 text-center">{currentWorkflow?.title}</h3>
             <p className="text-slate-400 text-[11px] mt-2 max-w-sm leading-relaxed text-center">{currentWorkflow?.description}</p>
             
             {renderKnobs()}

             <div className="mt-8 flex items-center justify-between w-full max-w-sm">
                <div className="flex flex-col items-start"><span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Status</span><div className="flex items-center space-x-2"><div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div><span className="text-[10px] font-bold text-slate-700">LIVE AUDITIONING</span></div></div>
                <div className="flex items-center space-x-4">
                  {successMessage && <div className="px-4 py-2 bg-green-500 text-white rounded-xl text-[9px] font-black tracking-widest uppercase animate-in zoom-in duration-300">{successMessage}</div>}
                  <button 
                    onClick={handleApply}
                    className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                    disabled={isProcessing}
                  >
                    Apply to Track
                  </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const MultiTrackTab: React.FC<TabProps> = ({ ctx }) => {
  const [tracks, setTracks] = useState<AudioTrack[]>(() => Array.from({ length: 6 }, (_, i) => ({ id: `${i}`, name: `Track ${i + 1}`, volume: 80, muted: false, solo: false, data: MOCK_SAMPLES })));
  const [isMtPlaying, setIsMtPlaying] = useState(false);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col space-y-6 h-full animate-in fade-in duration-700 mx-auto w-full max-w-5xl">
      <header className="flex justify-between items-center bg-white p-5 rounded-[32px] border border-slate-50 shadow-lg">
        <div className="flex space-x-3"><button onClick={() => bulkInputRef.current?.click()} className="px-10 py-4 bg-slate-900 text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-md">+ Bulk Load Stems</button><input ref={bulkInputRef} type="file" multiple className="hidden" accept="audio/*" /></div>
        <button onClick={() => setIsMtPlaying(!isMtPlaying)} className={`w-16 h-14 flex items-center justify-center rounded-[24px] shadow-xl transition-all ${isMtPlaying ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'gradient-bg text-white hover:scale-105'}`}>{isMtPlaying ? <span className="text-xl">■</span> : <span className="text-xl translate-x-0.5">▶</span>}</button>
      </header>
      <div className="flex-1 space-y-3 pr-2 pb-10 custom-scrollbar overflow-y-auto">
        {tracks.map((track) => (
          <div key={track.id} className={`grid grid-cols-12 bg-white rounded-[32px] border border-slate-50 shadow-sm hover:border-slate-200 transition-all overflow-hidden h-24 group ${track.muted ? 'opacity-40 grayscale' : ''}`}>
            <div className="col-span-3 border-r border-slate-50 p-5 flex flex-col justify-center space-y-3 bg-slate-50/30">
              <div className="flex justify-between items-center"><span className="text-[11px] font-black text-slate-800 truncate max-w-[120px] uppercase tracking-wider">{track.name}</span></div>
              <input type="range" className="w-full h-1 bg-slate-200 rounded-full appearance-none accent-slate-800 cursor-pointer" value={track.volume} onChange={(e) => setTracks(prev => prev.map(t => t.id === track.id ? {...t, volume: parseInt(e.target.value)} : t))} />
            </div>
            <div className="col-span-9 p-3 relative flex items-center bg-white">
              <div className="w-full h-full bg-slate-50/50 rounded-2xl border border-dashed border-slate-100 flex items-center px-6 group/wave relative overflow-hidden"><Waveform samples={track.data} height={50} interactive={true} isPlaying={isMtPlaying} showPlayButton={false} allowZoom={false} /></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
