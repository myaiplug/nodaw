/**
 * Real HTDemucs 6-stem separation in the browser.
 * Model: StemSplitio/htdemucs-6s-onnx (fp16weights, ~130 MB)
 * Runs fully local via onnxruntime-web. No server. No upload.
 *
 * Stems (exact order): drums, bass, other, vocals, guitar, piano
 *
 * Preload intentionally — call loadDemucsSession only when the user
 * opens Split (or starts separation). Do NOT kick this off on app boot.
 */

import * as ort from "onnxruntime-web";

export const DEMUCS_SOURCES = [
  "drums",
  "bass",
  "other",
  "vocals",
  "guitar",
  "piano",
] as const;

export type DemucsStem = (typeof DEMUCS_SOURCES)[number];
export type DemucsPack = Record<DemucsStem, Float32Array[]>;

const SAMPLE_RATE = 44100;
const SEGMENT_S = 7.8;
const N_SAMPLES = Math.round(SEGMENT_S * SAMPLE_RATE);
const N_CHANNELS = 2;
const OVERLAP = Math.floor(N_SAMPLES / 4);
const STRIDE = N_SAMPLES - OVERLAP;
const N_STEMS = 6;

/** Keep in sync with package.json onnxruntime-web version. */
export const ORT_WASM_VERSION = "1.21.0";

export const DEMUCS_MODEL_URL =
  "https://huggingface.co/StemSplitio/htdemucs-6s-onnx/resolve/main/htdemucs_6s_fp16weights.onnx";

const CACHE_NAME = "nodaw-demucs-v2";
/** Rough expected size — used to reject truncated/corrupt cache hits. */
const MIN_MODEL_BYTES = 80_000_000;

export type DemucsProgress = {
  phase: "download" | "load" | "warmup" | "separate" | "done" | "error";
  ratio: number;
  detail?: string;
};

let sessionPromise: Promise<ort.InferenceSession> | null = null;
let ortConfigured = false;
let readySession: ort.InferenceSession | null = null;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function viteBase(): string {
  try {
    // Vite injects this at build time; falls back for non-Vite hosts.
    const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env
      ?.BASE_URL;
    return base || "/";
  } catch {
    return "/";
  }
}

/** Resolve WASM asset base: prefer same-origin /ort/ (build copy), else CDN. */
export function resolveOrtWasmPaths(): string {
  const base = viteBase();
  const local = `${base}ort/`.replace(/([^:]\/)\/+/g, "$1");
  return local;
}

export function configureOrtForVite() {
  if (ortConfigured || typeof window === "undefined") return;
  ortConfigured = true;

  const localPaths = resolveOrtWasmPaths();
  const cdnPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_WASM_VERSION}/dist/`;

  // Prefer CDN for GH Pages reliability (local /ort may 404 if copy script skipped).
  // Callers can force local by setting window.__NODAW_ORT_WASM_PATHS.
  const forced = (window as unknown as { __NODAW_ORT_WASM_PATHS?: string })
    .__NODAW_ORT_WASM_PATHS;
  ort.env.wasm.wasmPaths = forced || cdnPaths;
  // Keep a hint for debugging; localPaths is used by copy-ort-wasm.mjs builds.
  (window as unknown as { __NODAW_ORT_LOCAL_PATHS?: string }).__NODAW_ORT_LOCAL_PATHS =
    localPaths;

  ort.env.wasm.numThreads = Math.min(
    typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2,
    4,
  );
  ort.env.wasm.simd = true;
  // Avoid proxy worker path — common source of 404 + stuck promises in Vite.
  try {
    (ort.env.wasm as { proxy?: boolean }).proxy = false;
  } catch {
    /* older ort */
  }
}

async function clearModelCache(): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    await caches.delete(CACHE_NAME);
  } catch {
    /* ignore */
  }
}

async function putCache(url: string, buf: ArrayBuffer): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(url, new Response(buf.slice(0)));
  } catch {
    /* quota */
  }
}

async function fetchModelOnce(
  url: string,
  onProgress?: (p: DemucsProgress) => void,
): Promise<ArrayBuffer> {
  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(url);
      if (hit) {
        const buf = await hit.arrayBuffer();
        if (buf.byteLength >= MIN_MODEL_BYTES) {
          onProgress?.({
            phase: "download",
            ratio: 1,
            detail: `From cache · ${(buf.byteLength / 1e6).toFixed(0)} MB`,
          });
          return buf;
        }
        // Truncated/corrupt — drop it.
        await cache.delete(url);
        onProgress?.({
          phase: "download",
          ratio: 0,
          detail: "Corrupt cache cleared — re-downloading",
        });
      }
    } catch {
      /* cache API flaky in private mode */
    }
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Model download failed (${res.status})`);

  const total = Number(res.headers.get("content-length") || 0);
  const reader = res.body?.getReader();
  if (!reader) {
    const buf = await res.arrayBuffer();
    if (buf.byteLength < MIN_MODEL_BYTES) {
      throw new Error(`Model too small (${buf.byteLength} bytes) — corrupt download`);
    }
    await putCache(url, buf);
    onProgress?.({ phase: "download", ratio: 1, detail: "Download complete" });
    return buf;
  }

  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total > 0) {
      onProgress?.({
        phase: "download",
        ratio: Math.min(0.99, received / total),
        detail: `${(received / 1e6).toFixed(1)} / ${(total / 1e6).toFixed(0)} MB`,
      });
    } else {
      onProgress?.({
        phase: "download",
        ratio: Math.min(0.95, received / 130e6),
        detail: `${(received / 1e6).toFixed(1)} MB`,
      });
    }
  }

  const merged = new Uint8Array(received);
  let off = 0;
  for (const c of chunks) {
    merged.set(c, off);
    off += c.length;
  }
  const buf = merged.buffer;
  if (buf.byteLength < MIN_MODEL_BYTES) {
    throw new Error(`Model too small (${buf.byteLength} bytes) — corrupt download`);
  }
  await putCache(url, buf);
  onProgress?.({ phase: "download", ratio: 1, detail: "Download complete" });
  return buf;
}

async function fetchModelCached(
  url: string,
  onProgress?: (p: DemucsProgress) => void,
): Promise<ArrayBuffer> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) {
        onProgress?.({
          phase: "download",
          ratio: 0,
          detail: `Retry ${attempt + 1}/3…`,
        });
        await sleep(800 * 2 ** (attempt - 1));
      }
      return await fetchModelOnce(url, onProgress);
    } catch (err) {
      lastErr = err;
      await clearModelCache();
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error(String(lastErr || "Model download failed"));
}

function hasWebGpu(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

async function createSessionWithFallback(
  modelBuf: ArrayBuffer,
  onProgress?: (p: DemucsProgress) => void,
): Promise<ort.InferenceSession> {
  configureOrtForVite();

  const attempts: { providers: string[]; label: string }[] = [];
  if (hasWebGpu()) {
    attempts.push({ providers: ["webgpu"], label: "WebGPU" });
  }
  attempts.push({ providers: ["wasm"], label: "WASM" });

  let lastErr: unknown;
  for (let i = 0; i < attempts.length; i++) {
    const { providers, label } = attempts[i];
    onProgress?.({
      phase: "load",
      ratio: i / attempts.length,
      detail: `Building ${label} session…`,
    });
    try {
      const session = await ort.InferenceSession.create(modelBuf, {
        executionProviders: providers,
        graphOptimizationLevel: "all",
      });
      onProgress?.({
        phase: "load",
        ratio: 1,
        detail: `Backend ready · ${label}`,
      });
      return session;
    } catch (err) {
      lastErr = err;
      onProgress?.({
        phase: "load",
        ratio: (i + 0.5) / attempts.length,
        detail: `${label} failed — falling back…`,
      });
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error(String(lastErr || "Failed to create ORT session"));
}

async function warmUpSession(
  session: ort.InferenceSession,
  onProgress?: (p: DemucsProgress) => void,
): Promise<void> {
  onProgress?.({ phase: "warmup", ratio: 0, detail: "Warm-up inference…" });
  const zeros = new Float32Array(1 * N_CHANNELS * N_SAMPLES);
  const inputTensor = new ort.Tensor("float32", zeros, [
    1,
    N_CHANNELS,
    N_SAMPLES,
  ]);
  await session.run({ mix: inputTensor });
  onProgress?.({ phase: "warmup", ratio: 1, detail: "Model ready" });
}

/**
 * Load (download + create + warm-up) the Demucs session.
 * Safe to call repeatedly — shares one in-flight promise.
 * On failure the promise is cleared so a later retry can succeed.
 */
export async function loadDemucsSession(
  onProgress?: (p: DemucsProgress) => void,
): Promise<ort.InferenceSession> {
  if (readySession) {
    onProgress?.({ phase: "done", ratio: 1, detail: "Already loaded" });
    return readySession;
  }
  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    onProgress?.({
      phase: "download",
      ratio: 0,
      detail: "HTDemucs 6s · ~130 MB",
    });
    const modelBuf = await fetchModelCached(DEMUCS_MODEL_URL, onProgress);

    let session: ort.InferenceSession;
    try {
      session = await createSessionWithFallback(modelBuf, onProgress);
    } catch (err) {
      // Model bytes may be corrupt — clear cache so next attempt re-downloads.
      await clearModelCache();
      throw err;
    }

    try {
      await warmUpSession(session, onProgress);
    } catch (err) {
      readySession = null;
      sessionPromise = null;
      await clearModelCache();
      throw err instanceof Error
        ? new Error(`Warm-up failed: ${err.message}`)
        : err;
    }

    readySession = session;
    onProgress?.({ phase: "done", ratio: 1, detail: "Six-stem engine ready" });
    return session;
  })().catch((err) => {
    sessionPromise = null;
    readySession = null;
    onProgress?.({
      phase: "error",
      ratio: 0,
      detail: err instanceof Error ? err.message : String(err),
    });
    throw err;
  });

  return sessionPromise;
}

/** True once loadDemucsSession completed successfully. */
export function isDemucsReady(): boolean {
  return readySession !== null;
}

/** Drop the loaded session (e.g. after OOM) so the next load is fresh. */
export function resetDemucsSession(): void {
  sessionPromise = null;
  readySession = null;
}

function makeTransitionWindow(segment: number, overlap: number): Float32Array {
  const w = new Float32Array(segment);
  w.fill(1);
  for (let i = 0; i < overlap; i++) {
    const v = i / overlap;
    w[i] = v;
    w[segment - 1 - i] = v;
  }
  return w;
}

export async function separateDemucs(
  left: Float32Array,
  right: Float32Array,
  onProgress?: (p: DemucsProgress) => void,
): Promise<DemucsPack> {
  if (left.length !== right.length) {
    throw new Error("Channel length mismatch");
  }

  const session = await loadDemucsSession(onProgress);
  const totalLen = left.length;
  const nChunks = Math.max(1, Math.ceil(totalLen / STRIDE));
  const window = makeTransitionWindow(N_SAMPLES, OVERLAP);

  const out: Float32Array[][] = DEMUCS_SOURCES.map(() => [
    new Float32Array(totalLen),
    new Float32Array(totalLen),
  ]);
  const weight = new Float32Array(totalLen);
  const chunkBuf = new Float32Array(1 * N_CHANNELS * N_SAMPLES);

  for (let i = 0; i < nChunks; i++) {
    const start = i * STRIDE;
    const end = Math.min(start + N_SAMPLES, totalLen);
    const chunkLen = end - start;

    chunkBuf.fill(0);
    chunkBuf.set(left.subarray(start, end), 0);
    chunkBuf.set(right.subarray(start, end), N_SAMPLES);

    const inputTensor = new ort.Tensor("float32", chunkBuf, [
      1,
      N_CHANNELS,
      N_SAMPLES,
    ]);
    const result = await session.run({ mix: inputTensor });
    const stems = result.stems.data as Float32Array;

    for (let stem = 0; stem < N_STEMS; stem++) {
      for (let ch = 0; ch < N_CHANNELS; ch++) {
        const rowStart = (stem * N_CHANNELS + ch) * N_SAMPLES;
        const dest = out[stem][ch];
        for (let s = 0; s < chunkLen; s++) {
          dest[start + s] += stems[rowStart + s] * window[s];
        }
      }
    }
    for (let s = 0; s < chunkLen; s++) {
      weight[start + s] += window[s];
    }

    onProgress?.({
      phase: "separate",
      ratio: (i + 1) / nChunks,
      detail: `Chunk ${i + 1} / ${nChunks}`,
    });

    await new Promise((r) => setTimeout(r, 0));
  }

  for (let stem = 0; stem < N_STEMS; stem++) {
    for (let ch = 0; ch < N_CHANNELS; ch++) {
      const dest = out[stem][ch];
      for (let s = 0; s < totalLen; s++) {
        dest[s] /= Math.max(weight[s], 1e-8);
      }
    }
  }

  const pack = {} as DemucsPack;
  DEMUCS_SOURCES.forEach((name, i) => {
    pack[name] = out[i];
  });

  onProgress?.({ phase: "done", ratio: 1, detail: "Six stems ready" });
  return pack;
}

export async function decodeForDemucs(
  file: Blob,
): Promise<{ left: Float32Array; right: Float32Array; duration: number }> {
  const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
  try {
    const ab = await file.arrayBuffer();
    const audio = await ctx.decodeAudioData(ab.slice(0));
    if (audio.sampleRate !== SAMPLE_RATE) {
      const frames = Math.ceil(audio.duration * SAMPLE_RATE);
      const offline = new OfflineAudioContext(2, frames, SAMPLE_RATE);
      const src = offline.createBufferSource();
      src.buffer = audio;
      src.connect(offline.destination);
      src.start(0);
      const rendered = await offline.startRendering();
      const L = new Float32Array(rendered.length);
      const R = new Float32Array(rendered.length);
      L.set(rendered.getChannelData(0));
      R.set(
        rendered.numberOfChannels > 1
          ? rendered.getChannelData(1)
          : rendered.getChannelData(0),
      );
      return { left: L, right: R, duration: rendered.duration };
    }
    const len = audio.length;
    const left = new Float32Array(len);
    const right = new Float32Array(len);
    left.set(audio.getChannelData(0));
    if (audio.numberOfChannels > 1) {
      right.set(audio.getChannelData(1));
    } else {
      right.set(left);
    }
    return { left, right, duration: audio.duration };
  } finally {
    await ctx.close();
  }
}

export function encodeWavStereo(
  left: Float32Array,
  right: Float32Array,
  sampleRate = SAMPLE_RATE,
): Blob {
  const n = left.length;
  const buf = new ArrayBuffer(44 + n * 4);
  const view = new DataView(buf);
  const ws = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  ws(0, "RIFF");
  view.setUint32(4, 36 + n * 4, true);
  ws(8, "WAVE");
  ws(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  ws(36, "data");
  view.setUint32(40, n * 4, true);
  let off = 44;
  for (let i = 0; i < n; i++) {
    for (const ch of [left, right]) {
      const v = Math.max(-1, Math.min(1, ch[i]));
      view.setInt16(off, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([buf], { type: "audio/wav" });
}
