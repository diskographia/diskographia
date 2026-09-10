import type { EntityDetail } from '@/api/types';

// произвольные поля объекта
export function MetaCard({ fields }: { fields: EntityDetail['meta'] }) {
  if (fields.length === 0) {
    return null;
  }

  return (
    <dl>
      {fields.map((field) => (
        <div key={`${field.label}:${field.value}`}>
          <dt className="inline">{field.label}:</dt> <dd className="inline">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}
