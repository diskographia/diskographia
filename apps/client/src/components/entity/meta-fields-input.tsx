'use client';

import { useState } from 'react';

interface MetaFieldsInputProps {
  name: string;
  initial: { label: string; value: string }[];
}

// произвольные пары уходят одним скрытым полем в json
export function MetaFieldsInput({ name, initial }: MetaFieldsInputProps) {
  const [fields, setFields] = useState(initial.length > 0 ? initial : [{ label: '', value: '' }]);

  const update = (index: number, part: Partial<{ label: string; value: string }>) =>
    setFields((rows) => rows.map((row, position) => (position === index ? { ...row, ...part } : row)));

  const filled = fields.filter((row) => row.label.trim() && row.value.trim());

  return (
    <fieldset className="frame mt-2 p-2">
      <legend>свои поля</legend>
      <input type="hidden" name={name} value={JSON.stringify(filled)} />

      {fields.map((row, index) => (
        <div key={index} className="mb-1 flex gap-1">
          <input
            value={row.label}
            onChange={(event) => update(index, { label: event.target.value })}
            placeholder="подпись"
            className="frame w-1/3 p-1"
          />
          <input
            value={row.value}
            onChange={(event) => update(index, { value: event.target.value })}
            placeholder="значение"
            className="frame flex-1 p-1"
          />
          <button
            type="button"
            onClick={() => setFields((rows) => rows.filter((_, position) => position !== index))}
            className="frame px-2"
          >
            убрать
          </button>
        </div>
      ))}

      <button type="button" onClick={() => setFields((rows) => [...rows, { label: '', value: '' }])} className="frame px-2">
        добавить поле
      </button>
    </fieldset>
  );
}
