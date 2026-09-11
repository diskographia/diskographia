'use client';

import { useState } from 'react';

interface LinksInputProps {
  name: string;
  initial: { label: string; url: string }[];
}

// ссылки объекта уходят одним скрытым полем в json, как и свои поля
export function LinksInput({ name, initial }: LinksInputProps) {
  const [rows, setRows] = useState(initial.length > 0 ? initial : [{ label: '', url: '' }]);

  const update = (index: number, part: Partial<{ label: string; url: string }>) =>
    setRows((list) => list.map((row, position) => (position === index ? { ...row, ...part } : row)));

  const filled = rows.filter((row) => row.label.trim() && row.url.trim());

  return (
    <fieldset className="frame mt-2 p-2">
      <legend>ссылки</legend>
      <input type="hidden" name={name} value={JSON.stringify(filled)} />

      {rows.map((row, index) => (
        <div key={index} className="mb-1 flex gap-1">
          <input
            value={row.label}
            onChange={(event) => update(index, { label: event.target.value })}
            placeholder="подпись"
            className="frame w-1/3 p-1"
          />
          <input
            value={row.url}
            onChange={(event) => update(index, { url: event.target.value })}
            placeholder="https://"
            className="frame flex-1 p-1"
          />
          <button
            type="button"
            onClick={() => setRows((list) => list.filter((_, position) => position !== index))}
            className="frame px-2"
          >
            убрать
          </button>
        </div>
      ))}

      <button type="button" onClick={() => setRows((list) => [...list, { label: '', url: '' }])} className="frame px-2">
        добавить ссылку
      </button>

      <p className="hint">на странице объекта они прячутся под звёздочкой в нижнем экране</p>
    </fieldset>
  );
}
