'use client';


import type { EntityDetail, EntityKind } from '@/api/types';

import { DisplayAuthorInput } from './display-author-input';
import { LinksInput } from './links-input';
import { MetaFieldsInput } from './meta-fields-input';
import { PriceInput } from './price-input';

interface EntityFieldsProps {
  kind: EntityKind;
  entity?: EntityDetail;
  platform?: boolean;
}

const KIND_LABEL: Record<EntityKind, string> = {
  content: 'контент',
  product: 'товар',
  event: 'ивент',
  capsule: 'капсула',
};

const VISIBILITY: { value: string; label: string }[] = [
  { value: 'draft', label: 'черновик' },
  { value: 'private', label: 'только я' },
  { value: 'unlisted', label: 'по ссылке' },
  { value: 'public', label: 'публичный' },
];

// datetime-local работает в местном времени, поэтому сдвигаем на смещение пояса
function forInput(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const moment = new Date(value);

  return new Date(moment.getTime() - moment.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

// паспорт объекта: то, без чего он не существует
export function IdentityFields({ kind, entity }: { kind: EntityKind; entity?: EntityDetail }) {
  return (
    <>
      <p className="hint">вид: {KIND_LABEL[kind]}</p>

      <label className="block">
        название
        <input name="title" defaultValue={entity?.title ?? ''} required className="frame block w-full p-1" />
      </label>

      <label className="mt-2 block">
        видимость
        <select name="visibility" defaultValue={entity?.visibility ?? 'draft'} className="frame block w-full p-1">
          {VISIBILITY.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-2 block">
        теги через запятую
        <input name="tags" defaultValue={entity?.tags.join(', ') ?? ''} className="frame block w-full p-1" />
      </label>

    </>
  );
}

// всё остальное: свойства вида, ссылки, свои строки паспорта
export function DetailFields({ kind, entity, platform = false }: EntityFieldsProps) {
  return (
    <>
      {kind === 'event' ? (
        <fieldset className="frame mt-2 p-2">
          <legend>ивент</legend>
          <label className="block">
            начало
            <input
              type="datetime-local"
              name="startsAt"
              defaultValue={forInput(entity?.event?.startsAt)}
              required
              className="frame block w-full p-1"
            />
          </label>
          <label className="mt-2 block">
            конец
            <input
              type="datetime-local"
              name="endsAt"
              defaultValue={forInput(entity?.event?.endsAt)}
              className="frame block w-full p-1"
            />
          </label>
          <label className="mt-2 block">
            время анонса, не позже начала
            <input
              type="datetime-local"
              name="announceAt"
              defaultValue={forInput(entity?.event?.announceAt)}
              className="frame block w-full p-1"
            />
          </label>
          <label className="mt-2 block">
            текст анонса, показывается до начала
            <textarea
              name="announceMd"
              defaultValue={entity?.event?.announceMd ?? ''}
              rows={3}
              className="frame block w-full p-1"
            />
          </label>
          <label className="mt-2 block">
            адрес
            <input name="location" defaultValue={entity?.event?.location ?? ''} className="frame block w-full p-1" />
          </label>
          <label className="mt-2 block">
            город
            <input name="city" defaultValue={entity?.event?.city ?? ''} className="frame block w-full p-1" />
          </label>
          <div className="mt-2 flex gap-1">
            <input
              name="latitude"
              defaultValue={entity?.event?.latitude ?? ''}
              placeholder="широта, можно пусто"
              className="frame w-1/2 p-1"
            />
            <input
              name="longitude"
              defaultValue={entity?.event?.longitude ?? ''}
              placeholder="долгота"
              className="frame w-1/2 p-1"
            />
          </div>
          {platform ? (
            <label className="mt-2 block">
              <input type="checkbox" name="isGlobal" defaultChecked={entity?.event?.isGlobal} /> глобальный, подменяет
              главную
            </label>
          ) : null}
          <label className="mt-2 block">
            сколько дней висит после окончания
            <input
              type="number"
              name="lingerDays"
              min={0}
              max={365}
              defaultValue={entity?.event?.lingerDays ?? 0}
              className="frame block w-full p-1"
            />
          </label>
          <label className="mt-2 block">
            <input type="checkbox" name="applicationsOpen" defaultChecked={entity?.event?.applicationsOpen} /> принимать
            заявки
          </label>
          <label className="mt-2 block">
            срок жизни заявки в днях, не больше 90
            <input
              type="number"
              name="applicationTtlDays"
              min={1}
              max={90}
              defaultValue={entity?.event?.applicationTtlDays ?? 30}
              className="frame block w-full p-1"
            />
          </label>
        </fieldset>
      ) : null}

      {kind === 'product' ? (
        <fieldset className="frame mt-2 p-2">
          <legend>товар</legend>
          <PriceInput product={entity?.product ?? null} />
          <label className="mt-2 block">
            контакты
            <input
              name="contacts"
              defaultValue={entity?.product?.contacts ?? ''}
              required
              className="frame block w-full p-1"
            />
          </label>
        </fieldset>
      ) : null}

      <LinksInput name="links" initial={entity?.links ?? []} />
      <MetaFieldsInput name="meta" initial={entity?.meta ?? []} />
      <DisplayAuthorInput initial={entity?.displayAuthor ?? null} />

    </>
  );
}
