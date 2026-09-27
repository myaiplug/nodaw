import React from 'react';
import { Link } from 'react-router-dom';
import { SignInButton, SignUpButton, UserButton, Show, useUser } from '@clerk/react';
import { AUTH_ENABLED } from '../lib/feature-flags';

/** Compact Clerk controls for the suite header. No-ops gracefully if unset. */
export const AuthBar: React.FC = () => {
  if (!AUTH_ENABLED) {
    return (
      <a
        href="https://dashboard.clerk.com/last-active?path=api-keys"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden md:inline-flex text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700"
        title="Set VITE_CLERK_PUBLISHABLE_KEY for production OAuth + email auth"
      >
        Auth setup
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            type="button"
            className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            type="button"
            className="hidden sm:inline-flex px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-black"
          >
            Join
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <ProfileLink />
        <UserButton afterSignOutUrl="/app" />
      </Show>
    </div>
  );
};

const ProfileLink: React.FC = () => {
  const { user } = useUser();
  const handle =
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
    user?.id;
  if (!handle) return null;
  return (
    <Link
      to={`/u/${encodeURIComponent(handle)}`}
      className="hidden sm:inline-flex px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-cyan-700 bg-cyan-50 hover:bg-cyan-100"
    >
      Profile
    </Link>
  );
};

export const SaveExportButton: React.FC<{
  disabled?: boolean;
  onSave: () => void;
  saving?: boolean;
}> = ({ disabled, onSave, saving }) => (
  <button
    type="button"
    disabled={disabled || saving}
    onClick={onSave}
    className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed"
    title="Save this edit to your portfolio (opt-in)"
  >
    {saving ? 'Saving…' : 'Save export'}
  </button>
);
