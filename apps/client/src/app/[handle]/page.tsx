import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { apiGet } from '@/api/server';
import { parseHandle } from '@/api/handle';
import { canBrowse, currentViewer } from '@/api/viewer';
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
import { describe, pageMetadata } from '@/site';

interface PageProps {
  params: Promise<{ handle: string }>;
}

async function readProfile(segment: string): Promise<ProfileView | null> {
  const nickname = parseHandle(segment);

  if (!nickname) {
    return null;
  }

  return apiGet<ProfileView>(`/profiles/${nickname}`).catch(() => null);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (!canBrowse(await currentViewer())) {
    return {};
  }

  const profile = await readProfile((await params).handle);

  if (!profile) {
    return {};
  }

  return pageMetadata({ title: `@${profile.handle}`, description: describe(profile.bioMd) });
}

export default async function ProfilePage({ params }: PageProps) {
  const [{ handle }, viewer] = await Promise.all([params, currentViewer()]);

  // в демо профили только платформе
  if (!canBrowse(viewer)) {
    notFound();
  }

  const profile = await readProfile(handle);

  if (!profile) {
    notFound();
  }

  const inventory = await apiGet<EntityCard[]>(`/profiles/${profile.handle}/inventory`).catch(() => []);
  const own = viewer?.handle === profile.handle;

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
            <p>Отклик: {profile.isPlatform ? 'предельный' : profile.weight}.</p>
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
            <Hint>Слева инвентарь: предметы, которые учётка держит при себе.</Hint>
          </div>
        }
        text={profile.bioMd ? <MarkdownView source={profile.bioMd} /> : <AsciiNote>о себе пусто</AsciiNote>}
      />
    </>
  );
}
