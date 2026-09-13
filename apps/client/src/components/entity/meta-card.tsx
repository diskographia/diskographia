import type { EntityDetail } from '@/api/types';

// произвольные поля предмета
export function MetaCard({ fields }: { fields: EntityDetail['meta'] }) {
  if (fields.length === 0) {
    return null;
  }

  return (
    <dl>
      {fields.map((field, index) => (
        <div key={`${index}:${field.label}`}>
          <dt className="inline">{field.label}:</dt> <dd className="inline">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}
