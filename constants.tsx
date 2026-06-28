
import { EffectWorkflow } from './types';

export const WORKFLOWS: EffectWorkflow[] = [
  // --- VOCALS ---
  { id: 'vocal-clarity', title: 'Vocal Clarity', category: 'Vocals', description: 'Deep-learning driven resonance correction and air enhancement.', icon: 'vocal' },
  { id: 'vocal-pop', title: 'Studio Pop', category: 'Vocals', description: 'Commercial-grade compression and saturation for modern pop vocals.', icon: 'sparkles' },
  { id: 'vocal-tube', title: 'Vintage Tube', category: 'Vocals', description: 'Warm second-order harmonic saturation modeling classic 12AX7 tubes.', icon: 'radio' },
  { id: 'vocal-deep', title: 'Voice Deepener', category: 'Vocals', description: 'Formant-aware pitch manipulation for authoritative character.', icon: 'user' },
  { id: 'vocal-space', title: 'Ethereal Space', category: 'Vocals', description: 'Multi-tap delay combined with high-diffusion algorithmic reverb.', icon: 'waves' },
  { id: 'vocal-pod', title: 'Podcast Master', category: 'Vocals', description: 'Intelligent leveling, noise gating, and sibilance reduction.', icon: 'mic' },

  // --- INSTRUMENTAL ---
  { id: 'inst-bass', title: 'Bass Drive', category: 'Instrumental', description: 'Sub-harmonic synthesis and low-end saturation for heavy impact.', icon: 'volume' },
  { id: 'inst-lofi', title: 'Lo-Fi Tape', category: 'Instrumental', description: 'Vintage wow/flutter and subtle saturation for nostalgic warmth.', icon: 'tape' },
  { id: 'inst-guitar', title: 'Shredder Heat', category: 'Instrumental', description: 'High-gain amp emulation with impulse response cabinet modeling.', icon: 'guitar' },
  { id: 'inst-keys', title: 'Lucid Keys', category: 'Instrumental', description: 'Transient sharpening and high-frequency excitation for piano/synths.', icon: 'keys' },
  { id: 'inst-drums', title: 'Industrial Crunch', category: 'Instrumental', description: 'Parallel bit-crushing and aggressive transient shaping for drums.', icon: 'drum' },
  { id: 'inst-pads', title: 'Pad Sculptor', category: 'Instrumental', description: 'Dynamic movement via LFO-sync filtering and stereo rotation.', icon: 'cloud' },

  // --- BOTH ---
  { id: 'proc-width', title: 'Airy Width', category: 'Both', description: 'Intelligent psychoacoustic stereo widening and balancing.', icon: 'width' },
  { id: 'proc-warp', title: 'Time Warp', category: 'Both', description: 'Phase-coherent time stretching without frequency artifacts.', icon: 'clock' },
  { id: 'proc-mono', title: 'Mono Integrity', category: 'Both', description: 'Folds signals to mono with active phase-cancellation repair.', icon: 'mono' },
  { id: 'proc-neural', title: 'Neural De-Verb', category: 'Both', description: 'AI-driven reflection removal to dry out room recordings.', icon: 'brain' },
  { id: 'proc-clip', title: 'Sonic Clipper', category: 'Both', description: 'Soft-knee hard clipping to shave peaks for maximum loudness.', icon: 'scissors' },
  { id: 'proc-eq', title: 'Dynamic AI-EQ', category: 'Both', description: 'Self-adjusting equalization curves based on harmonic content.', icon: 'barchart' },

  // --- MASTERING ---
  { id: 'mast-lufs', title: 'LUFS Target', category: 'Mastering', description: 'Optimized for Spotify, Apple Music, and YouTube loudness standards.', icon: 'headphones' },
  { id: 'mast-tape', title: 'Analog Master', category: 'Mastering', description: 'Final-stage tape saturation and soft-clipping transformer color.', icon: 'film' },
  { id: 'mast-diamond', title: 'Diamond Peak', category: 'Mastering', description: 'Transparent look-ahead limiting with 0dB ceiling protection.', icon: 'diamond' },
  { id: 'mast-console', title: 'Console Glow', category: 'Mastering', description: 'Emulates the crosstalk and saturation of high-end UK consoles.', icon: 'sliders' },
  { id: 'mast-base', title: 'Solid Foundation', category: 'Mastering', description: 'Mono-compatible sub filtering and low-end phase alignment.', icon: 'layers' },
  { id: 'mast-holo', title: 'Holographic FX', category: 'Mastering', description: 'Mid-Side spatial enhancement for immersive depth and height.', icon: 'orbit' }
];

export const MOCK_SAMPLES = Array.from({ length: 200 }, () => Math.random() * 0.8 + 0.1);
