/**
 * Stem Split tab — HTDemucs 6s in-browser.
 * Preloads Demucs ONLY when this tab mounts (user navigated to Split),
 * never on app boot. Dropzone / Split stay disabled until session is ready.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEMUCS_SOURCES,
  DemucsPack,
  DemucsProgress,
  decodeForDemucs,
  encodeWavStereo,
  isDemucsReady,
  loadDemucsSession,
  resetDemucsSession,
  separateDemucs,
} from '../lib/demucs-browser';

type ReadyState = 'idle' | 'loading' | 'ready' | 'error';

const STEM_COLORS: Record<string, string> = {
  drums: 'bg-rose-500',
  bass: 'bg-amber-500',
  other: 'bg-slate-400',
  vocals: 'bg-cyan-500',
  guitar: 'bg-emerald-500',
  piano: 'bg-purple-500',
};

export const SplitTab: React.FC<{
  onUpload?: () => void;
}> = () => {
  const [readyState, setReadyState] = useState<ReadyState>(() =>
    isDemucsReady() ? 'ready' : 'idle',
  );
  const [progress, setProgress] = useState<DemucsProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [separating, setSeparating] = useState(false);
  const [pack, setPack] = useState<DemucsPack | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);

  const onProg = useCallback((p: DemucsProgress) => {
    if (cancelledRef.current) return;
    setProgress(p);
    if (p.phase === 'error') {
      setReadyState('error');
      setError(p.detail || 'Load failed');
    }
  }, []);

  // Preload ONLY when Split tab is shown — not on app boot.
  useEffect(() => {
    cancelledRef.current = false;
    if (isDemucsReady()) {
      setReadyState('ready');
      return;
    }
    setReadyState('loading');
    setError(null);
    loadDemucsSession(onProg)
      .then(() => {
        if (!cancelledRef.current) setReadyState('ready');
      })
      .catch((err) => {
        if (cancelledRef.current) return;
        setReadyState('error');
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelledRef.current = true;
    };
  }, [onProg]);

  const handleRetry = () => {
    resetDemucsSession();
    setReadyState('loading');
    setError(null);
    setProgress(null);
    loadDemucsSession(onProg)
      .then(() => setReadyState('ready'))
      .catch((err) => {
        setReadyState('error');
        setError(err instanceof Error ? err.message : String(err));
      });
  };

  const runSplit = async (file: File) => {
    if (readyState !== 'ready' || separating) return;
    setSeparating(true);
    setError(null);
    setPack(null);
    setFileName(file.name);
    try {
      const { left, right } = await decodeForDemucs(file);
      const result = await separateDemucs(left, right, onProg);
      setPack(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSeparating(false);
    }
  };

  const onFiles = (files: FileList | File[] | null) => {
    const file = files?.[0];
    if (!file) return;
    void runSplit(file);
  };

  const downloadStem = (name: string, channels: Float32Array[]) => {
    const blob = encodeWavStereo(channels[0], channels[1] || channels[0]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(fileName || 'track').replace(/\.[^.]+$/, '')}_${name}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pct = Math.round((progress?.ratio ?? 0) * 100);
  const canDrop = readyState === 'ready' && !separating;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 px-1 sm:px-0">
      {/* Engine status / preload gate */}
      <div className="bg-white rounded-[28px] sm:rounded-[40px] p-5 sm:p-8 shadow-xl border border-slate-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="font-outfit font-bold text-lg sm:text-xl text-slate-800">
              Stem Split · HTDemucs 6s
            </h3>
            <p className="text-slate-400 text-[10px] sm:text-xs mt-1 uppercase tracking-widest font-bold">
              Local ONNX · ~130 MB · no upload
            </p>
          </div>
          <div
            className={`self-start px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
              readyState === 'ready'
                ? 'bg-emerald-50 text-emerald-600'
                : readyState === 'error'
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-cyan-50 text-cyan-600'
            }`}
          >
            {readyState === 'ready'
              ? 'Engine ready'
              : readyState === 'error'
                ? 'Load failed'
                : 'Loading model…'}
          </div>
        </div>

        {readyState !== 'ready' && (
          <div className="space-y-3">
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
                style={{ width: `${readyState === 'error' ? 100 : Math.max(4, pct)}%` }}
              />
            </div>
            <p className="text-[11px] font-mono text-slate-500">
              {progress?.detail ||
                (readyState === 'loading'
                  ? 'Downloading / building session…'
                  : error || 'Waiting…')}
            </p>
            {readyState === 'error' && (
              <button
                type="button"
                onClick={handleRetry}
                className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest"
              >
                Retry preload
              </button>
            )}
          </div>
        )}

        {readyState === 'ready' && !separating && !pack && (
          <p className="text-sm text-slate-500">
            Model loaded. Drop a track below to separate into 6 stems.
          </p>
        )}

        {separating && (
          <div className="space-y-2 mt-2">
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all duration-200"
                style={{ width: `${Math.max(4, pct)}%` }}
              />
            </div>
            <p className="text-[11px] font-mono text-cyan-600">
              {progress?.detail || 'Separating…'}
            </p>
          </div>
        )}
      </div>

      {/* Dropzone — gated until ready */}
      <div
        role="button"
        tabIndex={canDrop ? 0 : -1}
        aria-disabled={!canDrop}
        onClick={() => canDrop && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (canDrop && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (canDrop) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (!canDrop) return;
          onFiles(e.dataTransfer.files);
        }}
        className={`w-full min-h-[160px] sm:min-h-[200px] rounded-[28px] sm:rounded-[48px] border-2 border-dashed flex flex-col items-center justify-center transition-all px-4 text-center ${
          !canDrop
            ? 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-60'
            : isDragOver
              ? 'border-cyan-400 bg-cyan-50 cursor-pointer'
              : 'border-slate-200 bg-white cursor-pointer hover:border-cyan-300 shadow-lg'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.wav,.mp3,.flac,.ogg,.m4a"
          className="hidden"
          disabled={!canDrop}
          onChange={(e) => {
            onFiles(e.target.files);
            e.currentTarget.value = '';
          }}
        />
        <svg
          className="w-10 h-10 text-slate-300 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
        <span className="font-outfit font-bold text-slate-700 text-base sm:text-lg">
          {canDrop ? 'Drop audio to split' : 'Waiting for model…'}
        </span>
        <span className="text-slate-400 text-[10px] mt-2 uppercase tracking-widest font-bold">
          WAV · MP3 · FLAC · OGG · M4A
        </span>
      </div>

      {error && readyState === 'ready' && (
        <div className="px-4 py-3 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Stem grid */}
      {pack && (
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {DEMUCS_SOURCES.map((name) => (
            <div
              key={name}
              className="bg-white rounded-[24px] p-4 sm:p-5 border border-slate-50 shadow-md flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${STEM_COLORS[name]}`} />
                <span className="font-outfit font-bold text-sm uppercase tracking-wider text-slate-800">
                  {name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => downloadStem(name, pack[name])}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
              >
                Download WAV
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
