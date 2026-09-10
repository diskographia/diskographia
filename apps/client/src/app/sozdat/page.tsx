import { notFound } from 'next/navigation';

import { requireService } from '@/api/viewer';
import { Here } from '@/components/world/here';

import { CreateForm } from './create-form';

export default async function CreatePage() {
  const viewer = await requireService();

  if (!viewer) {
    notFound();
  }

  return (
    <>
      <Here place="создание объекта" />
      <CreateForm platform={viewer.isAdmin} />
    </>
  );
}
