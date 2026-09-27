import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/react';
import { ProfileShell } from './ProfileShell';

/** Only mount under ClerkProvider (ClerkGate when AUTH_ENABLED). */
const ProfileAuthed: React.FC = () => {
  const { handle } = useParams<{ handle: string }>();
  const { getToken, userId } = useAuth();
  const { user, isLoaded } = useUser();
  const isOwner =
    !!user &&
    (user.username === handle ||
      user.primaryEmailAddress?.emailAddress?.split('@')[0] === handle ||
      user.id === handle);
  const displayName =
    isOwner && user
      ? user.fullName || user.username || handle || 'Creator'
      : handle || 'Creator';

  if (!isLoaded) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-400 text-sm">
        Loading profile...
      </div>
    );
  }

  return (
    <ProfileShell
      handle={handle}
      displayName={displayName || 'Creator'}
      isOwner={!!isOwner}
      userId={userId}
      getToken={() => getToken()}
    />
  );
};

export default ProfileAuthed;
