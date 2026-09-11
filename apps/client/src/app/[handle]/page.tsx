import Link from 'next/link';
import { notFound } from 'next/navigation';

import { apiGet } from '@/api/client';
import { parseHandle } from '@/api/handle';
import { currentViewer } from '@/api/viewer';
import type { EntityCard, ProfileView } from '@/api/types';
import { EntityGrid } from '@/components/entity/entity-grid';
import { MarkdownView } from '@/components/entity/markdown-view';
import { TagStrip } from '@/components/entity/tag-strip';
import { ModuleLayout } from '@/components/layout/module-layout';
import { Hint } from '@/components/ui/hint';
import { AsciiNote } from '@/components/world/ascii';
import { Here } from '@/components/world/here';
import { StaticScreen } from '@/components/world/static-screen';
import { routes } from '@/routes';

interface PageProps {
  params: Promise<{ handle: string }>;
}

export default async function ProfilePage({ params }: PageProps) {
  const { handle } = await params;

  const nickname = parseHandle(handle);

  if (!nickname) {
    notFound();
  }

  // в демо профили только админу
  const viewer = await currentViewer();

  if (!viewer?.isAdmin) {
    notFound();
  }

  const profile = await apiGet<ProfileView>(`/profiles/${nickname}`).catch(() => null);

  if (!profile) {
    notFound();
  }

  const inventory = await apiGet<EntityCard[]>(`/profiles/${nickname}/inventory`).catch(() => []);
  const own = viewer.handle === profile.handle;

  return (
    <>
      <Here place="учётка" inside={`@${profile.handle}`} />

      <ModuleLayout
        feed={
          inventory.length ? (
            <EntityGrid items={inventory.map((card) => ({ card }))} />
          ) : (
            <StaticScreen>инвентарь пуст</StaticScreen>
          )
        }
        media={<AsciiNote kind={2}>@{profile.handle}</AsciiNote>}
        head={
          <div>
            <strong>@{profile.handle}</strong>
            <p>отклик: {profile.isPlatform ? 'предельный' : profile.weight}</p>
            {own ? (
              <Link href={routes.profileEdit()} className="underline">
                править учётку
              </Link>
            ) : null}
          </div>
        }
        meta={
          <div>
            {profile.city || profile.country ? (
              <p>{[profile.city, profile.country].filter(Boolean).join(', ')}</p>
            ) : null}
            <TagStrip tags={profile.tags} linked />
            <Hint>слева инвентарь: объекты, которые учётка держит при себе</Hint>
          </div>
        }
        text={profile.bioMd ? <MarkdownView source={profile.bioMd} /> : <AsciiNote>о себе пусто</AsciiNote>}
      />
    </>
  );
}
