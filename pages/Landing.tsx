import React from 'react';
import { motion } from 'framer-motion';
import AdUnit, { AD_SLOTS } from '../components/AdUnit';

const products = [
  { name: 'NoDAW 5-in-1 Suite', desc: 'Convert, trim, process, export — 5 professional audio tools in one browser app.', price: 'Free', href: '/app' },
  { name: 'NoDAW Workstation', desc: 'Full multi-track DAW in your browser. Record, layer, mix, export.', price: 'Free', href: '/workstation.html' },
  { name: 'Pro Vault', desc: '500+ GB of sounds, samples, one-shots, vocals, and VSTs.', price: '$19/mo', href: '#vault' },
  { name: 'NoDAW Desktop', desc: 'Windows native app with offline processing and lower latency.', price: '$49', href: '#desktop' },
  { name: 'Merch Store', desc: 'T-shirts, stickers, hoodies for producers, artists, and AI creators.', price: 'Shop', href: '#shop' },
];

const freeTools = ['ConvertIT', 'TrimIT', 'FxIT', 'TestIT', 'Image to ICO', 'Stem Split', 'Vocal Remover', 'Karaoke Maker'];

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.08) 0%, transparent 60%)' }}>
        <div className="max-w-4xl mx-auto text-center relative z-10 py-20">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <span className="font-tech text-xs tracking-[0.2em] uppercase" style={{ color: 'var(--theme-accent)' }}>NoDAW Ecosystem</span>
            <h1 className="text-5xl md:text-7xl font-display font-bold mt-6 leading-tight tracking-tight text-white">
              Audio tools that feel like <span style={{ color: 'var(--theme-accent)' }}>instruments.</span>
            </h1>
            <p className="text-lg mt-4 max-w-2xl mx-auto" style={{ color: 'var(--theme-secondary)' }}>
              Convert, trim, process, and export — 5 professional tools + a full DAW workstation. All in your browser. No subscriptions.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a href="/app" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm tracking-wider uppercase transition-all" style={{ background: 'var(--theme-accent)', color: '#000', boxShadow: '0 0 30px rgba(6,182,212,0.3)' }}>
              Open NoDAW
            </a>
            <a href="#tools" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm tracking-wider uppercase transition-all border" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-primary)' }}>
              Free Tools ↓
            </a>
          </motion.div>
        </div>
      </section>

      {/* AD — TOP BANNER */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <AdUnit slot={AD_SLOTS.BANNER_TOP} format="horizontal" className="rounded-xl border" style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)', minHeight: '90px' }} />
      </div>

      {/* PRODUCTS */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-10 text-center">The Ecosystem</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map((p, i) => (
            <motion.a key={p.name} href={p.href} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} whileHover={{ y: -4 }} className="p-6 rounded-xl border transition-all no-underline" style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-tech text-xs tracking-wider uppercase" style={{ color: 'var(--theme-accent)' }}>{p.price}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--theme-accent-glow)', color: 'var(--theme-accent)' }}>Launch</span>
              </div>
              <h3 className="font-bold text-lg text-white mb-1">{p.name}</h3>
              <p className="text-sm" style={{ color: 'var(--theme-secondary)' }}>{p.desc}</p>
            </motion.a>
          ))}
        </div>
      </section>

      {/* AD — MID BANNER */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <AdUnit slot={AD_SLOTS.BANNER_MID} format="rectangle" className="rounded-xl border" style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)', minHeight: '250px' }} />
      </div>

      {/* FREE TOOLS */}
      <section id="tools" className="py-16 px-4" style={{ background: 'var(--theme-surface)' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-xl font-bold text-white text-center mb-8">Free Tools</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {freeTools.map(tool => (
              <a key={tool} href="/app" className="p-4 rounded-xl border text-center transition-all no-underline" style={{ background: 'var(--theme-surface-2)', borderColor: 'var(--theme-border)' }}>
                <span className="text-sm font-semibold text-white">{tool}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* AD — BOTTOM BANNER */}
      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <AdUnit slot={AD_SLOTS.BANNER_BOTTOM} format="rectangle" style={{ minHeight: '200px' }} />
        <AdUnit slot={AD_SLOTS.RECTANGLE} format="rectangle" style={{ minHeight: '200px' }} />
        <AdUnit slot={AD_SLOTS.IN_FEED} format="rectangle" style={{ minHeight: '200px' }} />
      </div>

      {/* FOOTER */}
      <footer className="border-t py-10 px-4 text-center" style={{ borderColor: 'var(--theme-border)' }}>
        <p className="text-xs font-mono" style={{ color: 'var(--theme-muted)' }}>NoDAW © {new Date().getFullYear()} · Browser-native audio tools</p>
      </footer>
    </div>
  );
};

export default Landing;
