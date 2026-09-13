'use client';

import { isoToParts } from '@/api/time';
import type { EntityDetail, EntityKind } from '@/api/types';

import { DisplayAuthorInput } from './display-author-input';
import { KIND_LABEL, VISIBILITY_LABEL } from './labels';
import { PairsInput } from './pairs-input';
import { TagsInput } from './tags-input';
import { PriceInput } from './price-input';

interface EntityFieldsProps {
  kind: EntityKind;
  entity?: EntityDetail;
  platform?: boolean;
}

const VISIBILITY = Object.entries(VISIBILITY_LABEL).map(([value, label]) => ({ value, label }));

// дата и время лежат двумя полями: время можно не указывать, тогда считается полночь и не показывается
function DateTimeInput({ name, label, value }: { name: string; label: string; value: string | null | undefined }) {
  const initial = isoToParts(value);

  return (
    <label className="mt-2 block">
      {label}
      <span className="flex flex-wrap gap-1">
        <input type="date" name={`${name}Date`} defaultValue={initial.date} className="frame block flex-1 p-1" />
        <input type="time" name={`${name}Time`} defaultValue={initial.time} className="frame block p-1" />
      </span>
    </label>
  );
}

// паспорт предмета: то, без чего он не существует
export function IdentityFields({ kind, entity }: { kind: EntityKind; entity?: EntityDetail }) {
  return (
    <>
      <p className="hint">Вид: {KIND_LABEL[kind]}.</p>

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

      <TagsInput initial={entity?.tags.join(', ') ?? ''} />
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
          <DateTimeInput name="starts" label="начало" value={entity?.event?.startsAt} />
          <DateTimeInput name="ends" label="конец" value={entity?.event?.endsAt} />
          <DateTimeInput name="announce" label="анонс с" value={entity?.event?.announceAt} />
          <p className="hint mt-1">Без даты начала ивент начнётся сейчас. Время можно не указывать; конец по умолчанию в тот же день.</p>
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
          <div className="mt-2 flex flex-wrap gap-1">
            <label className="min-w-40 flex-1">
              широта, можно пусто
              <input
                name="latitude"
                type="number"
                step="any"
                min={-90}
                max={90}
                defaultValue={entity?.event?.latitude ?? ''}
                className="frame block w-full p-1"
              />
            </label>
            <label className="min-w-40 flex-1">
              долгота
              <input
                name="longitude"
                type="number"
                step="any"
                min={-180}
                max={180}
                defaultValue={entity?.event?.longitude ?? ''}
                className="frame block w-full p-1"
              />
            </label>
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

      <PairsInput
        name="links"
        legend="ссылки"
        initial={(entity?.links ?? []).map((link) => ({ first: link.label, second: link.url }))}
        firstKey="label"
        secondKey="url"
        firstPlaceholder="подпись"
        secondPlaceholder="https://"
        secondType="url"
        addLabel="добавить ссылку"
        hint="На странице предмета они прячутся под звёздочкой в нижнем экране."
      />
      <PairsInput
        name="meta"
        legend="свои поля"
        initial={(entity?.meta ?? []).map((field) => ({ first: field.label, second: field.value }))}
        firstKey="label"
        secondKey="value"
        firstPlaceholder="подпись"
        secondPlaceholder="значение"
        addLabel="добавить поле"
      />
      <DisplayAuthorInput initial={entity?.displayAuthor ?? null} />
    </>
  );
}
