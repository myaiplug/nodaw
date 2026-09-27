/**
 * LUFS tab — quick integrated loudness estimate + target trim.
 * Lightweight, no Demucs. Uses a BS.1770-ish K-weighted approximation.
 */
import React, { useMemo, useState } from 'react';

interface LufsTabProps {
  buffer: AudioBuffer | null;
  ctx?: AudioContext | null;
  onUpdateBuffer?: (b: AudioBuffer) => void;
  onUpload?: () => void;
}

function kWeightChannel(data: Float32Array, sampleRate: number): Float32Array {
  // Very small high-shelf approx for K-weighting (not lab-grade).
  const out = new Float32Array(data.length);
  const a = Math.exp((-2 * Math.PI * 1500) / sampleRate);
  let prevX = 0;
  let prevY = 0;
  for (let i = 0; i < data.length; i++) {
    const x = data[i];
    const y = (1 + a) * 0.5 * (x - prevX) + a * prevY;
    out[i] = y * 1.2 + x * 0.35;
    prevX = x;
    prevY = y;
  }
  return out;
}

function estimateLufs(buffer: AudioBuffer): number {
  const n = buffer.length;
  if (n === 0) return -70;
  let power = 0;
  const chs = buffer.numberOfChannels;
  for (let c = 0; c < chs; c++) {
    const weighted = kWeightChannel(buffer.getChannelData(c), buffer.sampleRate);
    for (let i = 0; i < n; i++) power += weighted[i] * weighted[i];
  }
  power /= n * chs;
  if (power < 1e-12) return -70;
  return -0.691 + 10 * Math.log10(power);
}

function applyGain(buffer: AudioBuffer, ctx: AudioContext, db: number): AudioBuffer {
  const g = Math.pow(10, db / 20);
  const out = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = out.getChannelData(c);
    for (let i = 0; i < src.length; i++) dst[i] = Math.max(-1, Math.min(1, src[i] * g));
  }
  return out;
}

const TARGETS = [
  { label: 'Spotify', lufs: -14 },
  { label: 'YouTube', lufs: -13 },
  { label: 'Apple', lufs: -16 },
  { label: 'Podcast', lufs: -16 },
];

export const LufsTab: React.FC<LufsTabProps> = ({
  buffer,
  ctx,
  onUpdateBuffer,
  onUpload,
}) => {
  const measured = useMemo(() => (buffer ? estimateLufs(buffer) : null), [buffer]);
  const [target, setTarget] = useState(-14);

  if (!buffer) {
    return (
      <div className="flex flex-col items-center justify-center text-center space-y-6 py-10">
        <button
          type="button"
          onClick={onUpload}
          className="w-20 h-20 bg-white rounded-[28px] flex items-center justify-center border border-slate-50 shadow-xl"
        >
          <svg className="w-10 h-10 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </button>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
          Upload audio to measure LUFS
        </p>
      </div>
    );
  }

  const delta = measured !== null ? target - measured : 0;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 px-1">
      <div className="bg-white rounded-[28px] sm:rounded-[40px] p-6 sm:p-10 shadow-xl border border-slate-50 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3">
          Integrated loudness (approx)
        </p>
        <div className="text-5xl sm:text-6xl font-outfit font-bold text-slate-800 tabular-nums">
          {measured?.toFixed(1)}
          <span className="text-lg sm:text-xl text-slate-400 ml-2">LUFS</span>
        </div>
        <p className="text-slate-400 text-xs mt-4">
          Duration {(buffer.duration).toFixed(1)}s · {buffer.sampleRate} Hz · {buffer.numberOfChannels} ch
        </p>
      </div>

      <div className="bg-white rounded-[28px] p-5 sm:p-6 shadow-md border border-slate-50">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
          Target platform
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {TARGETS.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setTarget(t.lufs)}
              className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                target === t.lufs
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-cyan-300'
              }`}
            >
              {t.label}
              <div className="opacity-60 mt-0.5">{t.lufs} LUFS</div>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-slate-600">
            Gain to target:{' '}
            <span className="font-mono font-bold text-cyan-600">
              {delta >= 0 ? '+' : ''}
              {delta.toFixed(1)} dB
            </span>
          </div>
          <button
            type="button"
            disabled={!ctx || !onUpdateBuffer}
            onClick={() => {
              if (!ctx || !onUpdateBuffer || measured === null) return;
              onUpdateBuffer(applyGain(buffer, ctx, delta));
            }}
            className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
          >
            Apply gain
          </button>
        </div>
      </div>
    </div>
  );
};
