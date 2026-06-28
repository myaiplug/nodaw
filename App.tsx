
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppTab } from './types';
import { ConvertTab, TrimTab, CompareTab, EffectsTab, MultiTrackTab } from './components/Tabs';
import { PeakMeter, SpectralAnalyzer } from './components/Visualizer';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.CONVERT);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [bufferHistory, setBufferHistory] = useState<AudioBuffer[]>([]);
  
  // A/B Comparison State
  const [bufferA, setBufferA] = useState<AudioBuffer | null>(null);
  const [bufferB, setBufferB] = useState<AudioBuffer | null>(null);

  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [targetFormat, setTargetFormat] = useState<{ ext: string; mime: string }>({ ext: '', mime: '' });
  
  const [previewEffectIds, setPreviewEffectIds] = useState<string[]>([]);
  const [effectParams, setEffectParams] = useState<Record<string, Record<string, number>>>({
    'inst-bass': { freq: 160, gain: 3.5, drive: 1.1 },
    'vocal-deep': { detune: -700, gain: 5 },
    'proc-width': { width: 1.6 },
    'proc-warp': { rate: 3.5, depth: 400 },
    'mast-lufs': { threshold: -20, ratio: 3 },
  });
  
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const activeNodesRef = useRef<Record<string, any>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playbackParamsRef = useRef<{ start: number, loop: boolean, end: number }>({ start: 0, loop: false, end: 1 });
  const startTimeRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);

  // --- REFINED REAL-TIME DSP ENGINE ---
  const buildEffectChain = useCallback((ctx: AudioContext, source: AudioBufferSourceNode, effectIds: string[], params: Record<string, Record<string, number>>): AudioNode => {
    let lastNode: AudioNode = source;
    activeNodesRef.current = {}; // reset active nodes

    effectIds.forEach(id => {
      const p = params[id] || {};
      if (id === 'inst-bass') {
        const lowShelf = ctx.createBiquadFilter();
        lowShelf.type = 'lowshelf';
        lowShelf.frequency.value = p.freq ?? 160;
        lowShelf.gain.value = p.gain ?? 3.5;
        const sat = ctx.createWaveShaper();
        const drive = p.drive ?? 1.1;
        const curve = new Float32Array(44100);
        for (let i = 0; i < 44100; i++) {
          const x = (i * 2) / 44100 - 1;
          curve[i] = Math.tanh(x * drive);
        }
        sat.curve = curve;
        lastNode.connect(lowShelf);
        lowShelf.connect(sat);
        lastNode = sat;
        activeNodesRef.current[id] = { lowShelf, sat, updateDrive: (d: number) => {
            const c = new Float32Array(44100);
            for (let i = 0; i < 44100; i++) c[i] = Math.tanh(((i*2)/44100 - 1) * d);
            sat.curve = c;
        }};
      } else if (id === 'vocal-deep') {
        source.detune.value = p.detune ?? -700; 
        const lowBoost = ctx.createBiquadFilter();
        lowBoost.type = 'lowshelf';
        lowBoost.frequency.value = 250;
        lowBoost.gain.value = p.gain ?? 5;
        lastNode.connect(lowBoost);
        lastNode = lowBoost;
        activeNodesRef.current[id] = { source, lowBoost };
      } else if (id === 'proc-width') {
        const splitter = ctx.createChannelSplitter(2);
        const merger = ctx.createChannelMerger(2);
        const mid = ctx.createGain();
        const side = ctx.createGain();
        const inverter = ctx.createGain();
        inverter.gain.value = -1;
        lastNode.connect(splitter);
        splitter.connect(mid, 0);
        splitter.connect(mid, 1);
        mid.gain.value = 0.5;
        splitter.connect(side, 0);
        splitter.connect(inverter, 1);
        inverter.connect(side);
        side.gain.value = p.width ?? 1.6;
        mid.connect(merger, 0, 0);
        mid.connect(merger, 0, 1);
        side.connect(merger, 0, 0);
        const sidePhaseInvert = ctx.createGain();
        sidePhaseInvert.gain.value = -1;
        side.connect(sidePhaseInvert);
        sidePhaseInvert.connect(merger, 0, 1);
        lastNode = merger;
        activeNodesRef.current[id] = { side };
      } else if (id === 'proc-warp') {
        const lfo = ctx.createOscillator();
        lfo.frequency.value = p.rate ?? 3.5;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = p.depth ?? 400;
        lfo.connect(lfoGain);
        lfoGain.connect(source.detune);
        lfo.start();
        activeNodesRef.current[id] = { lfo, lfoGain };
      } else if (id === 'proc-mono') {
        const monoSum = ctx.createGain();
        monoSum.gain.value = 0.5;
        const merger = ctx.createChannelMerger(2);
        lastNode.connect(monoSum);
        monoSum.connect(merger, 0, 0);
        monoSum.connect(merger, 0, 1);
        lastNode = merger;
      } else if (id === 'mast-lufs') {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = p.threshold ?? -20;
        comp.ratio.value = p.ratio ?? 3;
        lastNode.connect(comp);
        lastNode = comp;
        activeNodesRef.current[id] = { comp };
      }
    });

    return lastNode;
  }, []);

  // Watch for effectParams changes to update audio nodes in real time
  useEffect(() => {
    if (!audioContext || !isPlaying) return;
    Object.keys(effectParams).forEach(id => {
      const nodes = activeNodesRef.current[id];
      const p = effectParams[id];
      if (nodes && p) {
        if (id === 'inst-bass') {
          if (nodes.lowShelf.frequency.value !== p.freq) nodes.lowShelf.frequency.setTargetAtTime(p.freq, audioContext.currentTime, 0.1);
          if (nodes.lowShelf.gain.value !== p.gain) nodes.lowShelf.gain.setTargetAtTime(p.gain, audioContext.currentTime, 0.1);
          if (nodes.updateDrive) nodes.updateDrive(p.drive);
        } else if (id === 'vocal-deep') {
          if (nodes.source.detune.value !== p.detune) nodes.source.detune.setTargetAtTime(p.detune, audioContext.currentTime, 0.1);
          if (nodes.lowBoost.gain.value !== p.gain) nodes.lowBoost.gain.setTargetAtTime(p.gain, audioContext.currentTime, 0.1);
        } else if (id === 'proc-width') {
          if (nodes.side.gain.value !== p.width) nodes.side.gain.setTargetAtTime(p.width, audioContext.currentTime, 0.1);
        } else if (id === 'proc-warp') {
          if (nodes.lfo.frequency.value !== p.rate) nodes.lfo.frequency.setTargetAtTime(p.rate, audioContext.currentTime, 0.1);
          if (nodes.lfoGain.gain.value !== p.depth) nodes.lfoGain.gain.setTargetAtTime(p.depth, audioContext.currentTime, 0.1);
        } else if (id === 'mast-lufs') {
          if (nodes.comp.threshold.value !== p.threshold) nodes.comp.threshold.setTargetAtTime(p.threshold, audioContext.currentTime, 0.1);
          if (nodes.comp.ratio.value !== p.ratio) nodes.comp.ratio.setTargetAtTime(p.ratio, audioContext.currentTime, 0.1);
        }
      }
    });
  }, [effectParams, audioContext, isPlaying]);

  const handleAudioLoad = async (file: File) => {
    setPendingFile(file);
    setShowDownloadModal(true);
  };

  const processPendingFile = async (selectedTab: AppTab = AppTab.TRIM) => {
    if (!pendingFile) return;
    const ctx = audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
    if (!audioContext) setAudioContext(ctx);

    try {
      const arrayBuffer = await pendingFile.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      const node = ctx.createAnalyser();
      node.fftSize = 512;
      setAnalyser(node);
      setAudioBuffer(buffer);
      setBufferHistory([]); // Reset history on new load
      setBufferA(buffer); 
      setFileName(pendingFile.name);
      setShowDownloadModal(false);
      setActiveTab(selectedTab);
    } catch (err) {
      console.error(err);
      setShowDownloadModal(false);
    }
  };

  const togglePlayback = (startTimeRatio: number = 0, loop: boolean = false, endTimeRatio: number = 1, preservePosition: boolean = false) => {
    if (!audioBuffer || !audioContext || !analyser) return;

    if (isPlaying && !loop && !preservePosition && startTimeRatio === playbackParamsRef.current.start) {
      handleStop();
      return;
    }

    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e) {}
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = loop;
    
    let actualStartSec = startTimeRatio * audioBuffer.duration;
    if (preservePosition && isPlaying) {
      const elapsed = audioContext.currentTime - startTimeRef.current;
      actualStartSec = (offsetRef.current + elapsed) % audioBuffer.duration;
    }

    const durationSec = (endTimeRatio - startTimeRatio) * audioBuffer.duration;
    playbackParamsRef.current = { start: startTimeRatio, loop, end: endTimeRatio };

    const chainEnd = buildEffectChain(audioContext, source, previewEffectIds, effectParams);
    
    // Master Gain for Mute
    const masterGain = audioContext.createGain();
    masterGain.gain.value = isMuted ? 0 : 1;
    gainNodeRef.current = masterGain;

    chainEnd.connect(masterGain);
    masterGain.connect(analyser);
    analyser.connect(audioContext.destination);

    if (loop) {
      source.loopStart = startTimeRatio * audioBuffer.duration;
      source.loopEnd = endTimeRatio * audioBuffer.duration;
      source.start(0, actualStartSec);
    } else if (endTimeRatio < 0.999) {
      source.start(0, actualStartSec, durationSec);
    } else {
      source.start(0, actualStartSec);
    }
    
    sourceNodeRef.current = source;
    startTimeRef.current = audioContext.currentTime;
    offsetRef.current = actualStartSec;
    setIsPlaying(true);

    source.onended = () => {
      if (sourceNodeRef.current === source) setIsPlaying(false);
    };
  };

  useEffect(() => {
    if (isPlaying) togglePlayback(playbackParamsRef.current.start, playbackParamsRef.current.loop, playbackParamsRef.current.end, true);
  }, [previewEffectIds]);

  // Handle Mute changes during playback
  useEffect(() => {
    if (gainNodeRef.current && audioContext) {
      gainNodeRef.current.gain.setTargetAtTime(isMuted ? 0 : 1, audioContext.currentTime, 0.05);
    }
  }, [isMuted, audioContext]);

  const handleStop = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e) {}
    }
    setIsPlaying(false);
  };

  const handleUndo = () => {
    if (bufferHistory.length === 0) return;
    const previousBuffer = bufferHistory[bufferHistory.length - 1];
    setAudioBuffer(previousBuffer);
    setBufferA(previousBuffer);
    setBufferHistory(prev => prev.slice(0, -1));
  };

  const updateBufferWithHistory = (newBuffer: AudioBuffer) => {
    if (audioBuffer) {
      setBufferHistory(prev => [...prev, audioBuffer]);
    }
    setAudioBuffer(newBuffer);
    setBufferA(newBuffer);
  };

  const handleApplyEffects = async (effectIds: string[]) => {
    if (!audioContext || !audioBuffer) return;
    const offlineCtx = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    const chainEnd = buildEffectChain(offlineCtx as unknown as AudioContext, source, effectIds, effectParams);
    chainEnd.connect(offlineCtx.destination);
    source.start(0);
    const renderedBuffer = await offlineCtx.startRendering();
    updateBufferWithHistory(renderedBuffer);
  };

  const renderTabContent = () => {
    const commonProps = {
      buffer: audioBuffer,
      bufferA: bufferA,
      bufferB: bufferB,
      isPlaying,
      isMuted,
      togglePlayback,
      playbackParams: playbackParamsRef.current,
      onUpdateBuffer: updateBufferWithHistory,
      onUpdateBufferB: (newBuffer: AudioBuffer) => {
        setBufferB(newBuffer); 
      },
      onSetBufferA: (buf: AudioBuffer) => setBufferA(buf),
      onSetBufferB: (buf: AudioBuffer) => setBufferB(buf),
      onUpload: () => fileInputRef.current?.click(),
      ctx: audioContext,
      onPreviewEffectsChange: (ids: string[]) => setPreviewEffectIds(ids),
      previewEffectIds,
      effectParams,
      setEffectParams,
      onApplyEffects: handleApplyEffects,
      onUndo: handleUndo,
      canUndo: bufferHistory.length > 0,
      onToggleMute: () => setIsMuted(!isMuted)
    };

    switch (activeTab) {
      case AppTab.CONVERT: return <ConvertTab onFileLoaded={handleAudioLoad} />;
      case AppTab.TRIM: return <TrimTab {...commonProps} />;
      case AppTab.COMPARE: return <CompareTab {...commonProps} />;
      case AppTab.EFFECTS: return <EffectsTab {...commonProps} />;
      case AppTab.MULTITRACK: return <MultiTrackTab {...commonProps} />;
      default: return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#FDFDFD] overflow-hidden font-inter text-slate-900">
      <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={(e) => e.target.files?.[0] && handleAudioLoad(e.target.files[0])} />
      <header className="flex-none bg-white border-b border-slate-100 shadow-sm relative z-50 h-16 flex items-center justify-between px-8">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setActiveTab(AppTab.CONVERT)}>
            <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center shadow-lg"><svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg></div>
            <span className="text-xl font-outfit font-bold tracking-tight text-slate-800">NoDAW</span>
          </div>
        </div>
        <nav className="flex space-x-1 bg-slate-100/50 p-1 rounded-full">
          {Object.values(AppTab).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 rounded-full font-outfit font-bold text-[10px] uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{tab}</button>
          ))}
        </nav>
        <div className="flex items-center space-x-4">
           <SpectralAnalyzer isPlaying={isPlaying} analyser={analyser || undefined} width={120} height={30} />
        </div>
      </header>
      <main className="flex-1 overflow-hidden relative flex items-center justify-center">
        {/* Absolute Centering Wrapper */}
        <div className="w-full h-full flex items-center justify-center overflow-y-auto custom-scrollbar px-6">
           <div className="w-full max-w-5xl py-12">
             {renderTabContent()}
           </div>
        </div>
      </main>
      
      {showDownloadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => processPendingFile(AppTab.TRIM)}>
          <div className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-3xl text-center relative animate-in zoom-in slide-in-from-bottom-4 duration-500" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => processPendingFile(AppTab.TRIM)} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="w-16 h-16 gradient-bg rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-xl">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
            </div>
            <h3 className="text-2xl font-outfit font-bold text-slate-800 mb-2">Audio Loaded</h3>
            <p className="text-slate-400 text-sm mb-8">Your audio file is ready. Which tool would you like to use first?</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => processPendingFile(AppTab.TRIM)} className="p-6 rounded-2xl border border-slate-100 hover:border-cyan-500 hover:shadow-lg transition-all group flex flex-col items-center">
                 <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-cyan-50 flex items-center justify-center mb-4 transition-colors">
                   <svg className="w-6 h-6 text-slate-400 group-hover:text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" x2="8.12" y1="4" y2="15.88"/><line x1="14.47" x2="20" y1="14.48" y2="20"/><line x1="8.12" x2="12" y1="8.12" y2="12"/></svg>
                 </div>
                 <span className="font-outfit font-bold text-base text-slate-700">Trim & Cut</span>
              </button>
              <button onClick={() => processPendingFile(AppTab.COMPARE)} className="p-6 rounded-2xl border border-slate-100 hover:border-cyan-500 hover:shadow-lg transition-all group flex flex-col items-center">
                 <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-cyan-50 flex items-center justify-center mb-4 transition-colors">
                   <svg className="w-6 h-6 text-slate-400 group-hover:text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/></svg>
                 </div>
                 <span className="font-outfit font-bold text-base text-slate-700">A/B Compare</span>
              </button>
              <button onClick={() => processPendingFile(AppTab.EFFECTS)} className="p-6 rounded-2xl border border-slate-100 hover:border-purple-500 hover:shadow-lg transition-all group flex flex-col items-center">
                 <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-purple-50 flex items-center justify-center mb-4 transition-colors">
                   <svg className="w-6 h-6 text-slate-400 group-hover:text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="m12 3 1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                 </div>
                 <span className="font-outfit font-bold text-base text-slate-700">Effects & DSP</span>
              </button>
              <button onClick={() => processPendingFile(AppTab.MULTITRACK)} className="p-6 rounded-2xl border border-slate-100 hover:border-purple-500 hover:shadow-lg transition-all group flex flex-col items-center">
                 <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-purple-50 flex items-center justify-center mb-4 transition-colors">
                   <svg className="w-6 h-6 text-slate-400 group-hover:text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polygon points="2 12 12 17 22 12"/><polygon points="2 17 12 22 22 17"/></svg>
                 </div>
                 <span className="font-outfit font-bold text-base text-slate-700">Multi-Track</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
