import React from 'react';
import { useParams } from 'react-router-dom';
import { AUTH_ENABLED } from '../lib/feature-flags';
import { ProfileShell } from './ProfileShell';
import ProfileAuthed from './ProfileAuthed';

const ProfileGuest: React.FC = () => {
  const { handle } = useParams<{ handle: string }>();
  return (
    <ProfileShell
      handle={handle}
      displayName={handle || 'Creator'}
      isOwner={handle === 'local'}
      userId={null}
    />
  );
};

const Profile: React.FC = () => (AUTH_ENABLED ? <ProfileAuthed /> : <ProfileGuest />);

export default Profile;
