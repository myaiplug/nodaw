/**
 * Optional: copy onnxruntime-web WASM next to the built app for offline/Tauri.
 * CDN remains the default at runtime (see lib/demucs-browser.ts).
 */
import { cpSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules/onnxruntime-web/dist');
const dest = join(root, 'dist/ort');
if (!existsSync(src)) {
  console.warn('[copy-ort-wasm] onnxruntime-web not installed; skip');
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
for (const f of [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.jsep.mjs',
]) {
  try {
    cpSync(join(src, f), join(dest, f));
    console.log('[copy-ort-wasm]', f);
  } catch (e) {
    console.warn('[copy-ort-wasm] missing', f);
  }
}
