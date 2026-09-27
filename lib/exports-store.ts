/**
 * Opt-in export history / portfolio store.
 * - Always persists locally (IndexedDB) for the current browser.
 * - When signed in + VITE_NODAW_API_BASE is set, syncs metadata to the API.
 * Audio blobs stay local unless the user explicitly uploads (future).
 */
import { AppTab, ExportRecord } from '../types';
import { API_BASE } from './feature-flags';

const DB_NAME = 'nodaw-exports-v1';
const STORE = 'exports';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' });
        os.createIndex('userId', 'userId', { unique: false });
        os.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function peaksFromBuffer(buffer: AudioBuffer, bars = 64): number[] {
  const data = buffer.getChannelData(0);
  const step = Math.max(1, Math.floor(data.length / bars));
  const peaks: number[] = [];
  for (let i = 0; i < bars; i++) {
    let max = 0;
    const start = i * step;
    for (let j = 0; j < step && start + j < data.length; j++) {
      max = Math.max(max, Math.abs(data[start + j]));
    }
    peaks.push(Number(max.toFixed(4)));
  }
  return peaks;
}

export async function listExports(userId?: string | null): Promise<ExportRecord[]> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readonly');
  const all = await idbReq(tx.objectStore(STORE).getAll() as IDBRequest<ExportRecord[]>);
  db.close();
  const sorted = (all || []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!userId) return sorted.filter((e) => !e.userId);
  return sorted.filter((e) => e.userId === userId || !e.userId);
}

export async function saveExport(
  partial: Omit<ExportRecord, 'id' | 'createdAt'> & { id?: string },
  getToken?: () => Promise<string | null>,
): Promise<ExportRecord> {
  const record: ExportRecord = {
    ...partial,
    id: partial.id || crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  await idbReq(tx.objectStore(STORE).put(record));
  db.close();

  if (API_BASE && record.userId && getToken) {
    try {
      const token = await getToken();
      if (token) {
        await fetch(`${API_BASE}/api/exports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(record),
        });
      }
    } catch {
      /* offline / API not deployed — local still saved */
    }
  }
  return record;
}

export async function updateExport(
  id: string,
  patch: Partial<ExportRecord>,
  getToken?: () => Promise<string | null>,
): Promise<ExportRecord | null> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  const existing = await idbReq(store.get(id) as IDBRequest<ExportRecord | undefined>);
  if (!existing) {
    db.close();
    return null;
  }
  const next = { ...existing, ...patch, id: existing.id };
  await idbReq(store.put(next));
  db.close();

  if (API_BASE && next.userId && getToken) {
    try {
      const token = await getToken();
      if (token) {
        await fetch(`${API_BASE}/api/exports/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(patch),
        });
      }
    } catch {
      /* ignore */
    }
  }
  return next;
}

export async function deleteExport(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  await idbReq(tx.objectStore(STORE).delete(id));
  db.close();
}

export function defaultExportTitle(fileName: string | null, tool: AppTab | string): string {
  const base = (fileName || 'untitled').replace(/\.[^.]+$/, '');
  return `${base} · ${tool}`;
}
