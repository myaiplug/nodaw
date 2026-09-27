import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExportRecord } from '../types';
import { listExports, updateExport } from '../lib/exports-store';
import {
  AUTH_ENABLED,
  API_BASE,
  MARKETPLACE_ENABLED,
} from '../lib/feature-flags';
import {
  canListForSale,
  getMarketplaceStatus,
  platformFeeCents,
  startConnectOnboarding,
} from '../lib/marketplace';

const PeakMini: React.FC<{ peaks?: number[] }> = ({ peaks }) => {
  const data = peaks?.length ? peaks : Array.from({ length: 32 }, () => 0.2);
  return (
    <div className="flex items-end gap-px h-8 w-full">
      {data.map((p, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-cyan-400/70"
          style={{ height: `${Math.max(8, p * 100)}%` }}
        />
      ))}
    </div>
  );
};

export const ProfileShell: React.FC<{
  handle?: string;
  displayName: string;
  isOwner: boolean;
  userId?: string | null;
  getToken?: () => Promise<string | null>;
}> = ({ handle, displayName, isOwner, userId, getToken }) => {
  const [exportsList, setExportsList] = useState<ExportRecord[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const market = getMarketplaceStatus();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = await listExports(isOwner ? userId : undefined);
      if (cancelled) return;
      setExportsList(isOwner ? local : local.filter((e) => e.isPublic));
      if (API_BASE && handle) {
        try {
          const res = await fetch(
            `${API_BASE}/api/profiles/handle?handle=${encodeURIComponent(handle)}`,
          );
          if (res.ok) {
            const data = await res.json();
            if (!cancelled && Array.isArray(data.exports)) {
              setExportsList(
                data.exports.filter((e: ExportRecord) => e.isPublic || isOwner),
              );
            }
          }
        } catch {
          /* local */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle, isOwner, userId]);

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-inter">
      <header className="h-14 sm:h-16 border-b border-slate-100 bg-white flex items-center justify-between px-4 sm:px-8">
        <Link to="/app" className="font-outfit font-bold text-slate-800 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500 inline-block" />
          NoDAW
        </Link>
        <Link to="/app" className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          ← Suite
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <section className="bg-white rounded-[28px] sm:rounded-[40px] p-6 sm:p-10 shadow-xl border border-slate-50">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
            Creator profile
          </p>
          <h1 className="font-outfit font-bold text-3xl sm:text-4xl text-slate-900">{displayName}</h1>
          <p className="text-slate-400 text-sm mt-2">@{handle}</p>
          {!AUTH_ENABLED && (
            <p className="mt-4 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
              Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> for live OAuth / email profiles.
            </p>
          )}
        </section>

        {isOwner && MARKETPLACE_ENABLED && getToken && (
          <section className="bg-white rounded-[24px] p-5 border border-slate-50 shadow-md space-y-3">
            <h2 className="font-outfit font-bold text-sm uppercase tracking-wider">Sell on NoDAW</h2>
            <p className="text-xs text-slate-500">
              Stripe Connect scaffold · platform fee{' '}
              {market.enabled ? `${(market.feeBps / 100).toFixed(1)}%` : 'n/a'}. Only list audio
              you own.
            </p>
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest"
              onClick={async () => {
                const r = await startConnectOnboarding(getToken);
                if (r.url) window.location.href = r.url;
                else setMsg(r.error || 'Connect unavailable');
              }}
            >
              Connect payouts
            </button>
            {msg && <p className="text-xs text-rose-600 font-mono">{msg}</p>}
          </section>
        )}

        <section className="space-y-4">
          <h2 className="font-outfit font-bold text-lg">
            {isOwner ? 'Your exports' : 'Public edits'}
          </h2>
          {exportsList.length === 0 && (
            <p className="text-sm text-slate-400">
              No exports yet. Open the suite, edit audio, then hit <strong>Save export</strong>.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {exportsList.map((ex) => (
              <article
                key={ex.id}
                className="bg-white rounded-[24px] p-4 border border-slate-50 shadow-sm space-y-3"
              >
                <PeakMini peaks={ex.peaks} />
                <div>
                  <h3 className="font-outfit font-bold text-sm text-slate-800 truncate">{ex.title}</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                    {ex.tool} · {new Date(ex.createdAt).toLocaleDateString()}
                    {ex.isPublic ? ' · Public' : ' · Private'}
                  </p>
                </div>
                {isOwner && getToken && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === ex.id}
                      className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100"
                      onClick={async () => {
                        setBusyId(ex.id);
                        const next = await updateExport(
                          ex.id,
                          { isPublic: !ex.isPublic },
                          getToken,
                        );
                        if (next) {
                          setExportsList((prev) => prev.map((e) => (e.id === ex.id ? next : e)));
                        }
                        setBusyId(null);
                      }}
                    >
                      {ex.isPublic ? 'Make private' : 'Publish'}
                    </button>
                    {MARKETPLACE_ENABLED && canListForSale({ ...ex, isPublic: true }) && (
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-purple-50 text-purple-700"
                        onClick={async () => {
                          const priceCents = 499;
                          setBusyId(ex.id);
                          const next = await updateExport(
                            ex.id,
                            {
                              forSale: !ex.forSale,
                              priceCents: ex.forSale ? undefined : priceCents,
                              isPublic: true,
                            },
                            getToken,
                          );
                          if (next) {
                            setExportsList((prev) =>
                              prev.map((e) => (e.id === ex.id ? next : e)),
                            );
                            if (!ex.forSale) {
                              setMsg(
                                `Listed @ $${(priceCents / 100).toFixed(2)} (fee $${(
                                  platformFeeCents(priceCents) / 100
                                ).toFixed(2)}) — checkout API stub`,
                              );
                            }
                          }
                          setBusyId(null);
                        }}
                      >
                        {ex.forSale ? 'Unlist' : 'Sell $4.99'}
                      </button>
                    )}
                  </div>
                )}
                {!isOwner && ex.forSale && ex.priceCents != null && (
                  <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">
                    ${(ex.priceCents / 100).toFixed(2)} · marketplace soon
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
