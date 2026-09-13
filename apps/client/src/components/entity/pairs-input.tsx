'use client';

import { useId, useState, type ReactNode } from 'react';

interface Pair {
  first: string;
  second: string;
}

interface PairsInputProps {
  name: string;
  legend: string;
  initial: Pair[];
  firstKey: string;
  secondKey: string;
  firstPlaceholder: string;
  secondPlaceholder: string;
  secondType?: 'text' | 'url';
  addLabel: string;
  hint?: ReactNode;
}

interface Row extends Pair {
  key: string;
}

// пары «подпись и значение» уходят одним скрытым полем в json: так собраны свои поля и ссылки предмета
export function PairsInput({
  name,
  legend,
  initial,
  firstKey,
  secondKey,
  firstPlaceholder,
  secondPlaceholder,
  secondType = 'text',
  addLabel,
  hint,
}: PairsInputProps) {
  const prefix = useId();
  const [rows, setRows] = useState<Row[]>(() =>
    (initial.length > 0 ? initial : [{ first: '', second: '' }]).map((pair, index) => ({ ...pair, key: `${prefix}-${index}` })),
  );
  const [counter, setCounter] = useState(rows.length);

  const update = (key: string, part: Partial<Pair>) =>
    setRows((list) => list.map((row) => (row.key === key ? { ...row, ...part } : row)));

  // адрес без схемы дописывается до https при уходе из поля
  const settle = (key: string, value: string) => {
    const text = value.trim();

    if (secondType === 'url' && text && !/^[a-z][a-z0-9+.-]*:/i.test(text)) {
      update(key, { second: `https://${text}` });
    }
  };

  const filled = rows
    .filter((row) => row.first.trim() && row.second.trim())
    .map((row) => ({ [firstKey]: row.first.trim(), [secondKey]: row.second.trim() }));

  return (
    <fieldset className="frame mt-2 p-2">
      <legend>{legend}</legend>
      <input type="hidden" name={name} value={JSON.stringify(filled)} />

      {rows.map((row) => (
        <div key={row.key} className="mb-1 flex flex-wrap gap-1">
          <input
            value={row.first}
            onChange={(event) => update(row.key, { first: event.target.value })}
            placeholder={firstPlaceholder}
            aria-label={firstPlaceholder}
            className="frame min-w-0 flex-[1_1_9em] p-1"
          />
          <input
            value={row.second}
            type="text"
            inputMode={secondType === 'url' ? 'url' : undefined}
            onChange={(event) => update(row.key, { second: event.target.value })}
            onBlur={(event) => settle(row.key, event.target.value)}
            placeholder={secondPlaceholder}
            aria-label={secondPlaceholder}
            className="frame min-w-0 flex-[3_1_14em] p-1"
          />
          <button
            type="button"
            onClick={() => setRows((list) => list.filter((item) => item.key !== row.key))}
            className="frame px-2"
            aria-label="убрать строку"
            title="убрать строку"
          >
            &times;
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => {
          setRows((list) => [...list, { first: '', second: '', key: `${prefix}-${counter}` }]);
          setCounter((value) => value + 1);
        }}
        className="frame px-2"
      >
        {addLabel}
      </button>

      {hint ? <p className="hint">{hint}</p> : null}
    </fieldset>
  );
}
