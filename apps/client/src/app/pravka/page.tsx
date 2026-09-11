import { notFound } from 'next/navigation';

import { apiGet } from '@/api/client';
import type { ProfileView } from '@/api/types';
import { requireService } from '@/api/viewer';

import { ProfileForm } from './profile-form';

export default async function ProfileEditPage() {
  const identity = await requireService();

  if (!identity) {
    notFound();
  }

  const profile = await apiGet<ProfileView>(`/profiles/${identity.handle}`).catch(() => null);

  if (!profile) {
    notFound();
  }

  return <ProfileForm profile={profile} />;
}
