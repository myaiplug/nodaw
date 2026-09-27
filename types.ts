export enum AppTab {
  TRIM = 'Trim',
  CONVERT = 'Convert',
  EFFECTS = 'FX',
  COMPARE = 'A/B',
  LUFS = 'LUFS',
  SPLIT = 'Split',
  MULTITRACK = 'Multi-Track',
}

export interface AudioTrack {
  id: string;
  name: string;
  volume: number;
  muted: boolean;
  solo: boolean;
  data: number[];
  color?: string;
}

export interface EffectWorkflow {
  id: string;
  title: string;
  category: 'Instrumental' | 'Vocals' | 'Both' | 'Mastering';
  description: string;
  icon: string;
}

/** Saved export / portfolio item (local + optional cloud). */
export interface ExportRecord {
  id: string;
  userId: string | null;
  title: string;
  tool: AppTab | string;
  createdAt: string;
  durationSec?: number;
  sampleRate?: number;
  channels?: number;
  /** Public on profile when true */
  isPublic: boolean;
  /** Optional remote blob URL once uploaded */
  audioUrl?: string;
  /** Small waveform peaks for profile cards */
  peaks?: number[];
  mimeType?: string;
  byteLength?: number;
  /** Marketplace listing stub */
  forSale?: boolean;
  priceCents?: number;
}

export interface PublicProfile {
  userId: string;
  handle: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  exports: ExportRecord[];
}
