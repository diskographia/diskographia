'use client';

import { useState } from 'react';

import type { EntityDetail } from '@/api/types';

// либо сумма с валютой, либо ценник словами: в базе стоит проверка на то же самое
export function PriceInput({ product }: { product: EntityDetail['product'] }) {
  const [words, setWords] = useState(!product || product.priceAmount === null);

  return (
    <div>
      <div className="mb-2 flex gap-1">
        <button type="button" onClick={() => setWords(false)} aria-pressed={!words} className="frame px-2 py-1">
          сумма
        </button>
        <button type="button" onClick={() => setWords(true)} aria-pressed={words} className="frame px-2 py-1">
          словами
        </button>
      </div>

      {words ? (
        <label className="block">
          ценник словами, например обмен
          <input
            name="priceLabel"
            required
            maxLength={48}
            defaultValue={product?.priceLabel ?? ''}
            className="frame block w-full p-1"
          />
        </label>
      ) : (
        <div className="flex gap-1">
          <label className="w-2/3">
            сумма
            <input
              type="number"
              step="0.01"
              min={0}
              name="priceAmount"
              required
              defaultValue={product?.priceAmount ?? ''}
              className="frame block w-full p-1"
            />
          </label>
          <label className="w-1/3">
            валюта
            <input
              name="priceCurrency"
              required
              maxLength={3}
              minLength={3}
              defaultValue={product?.priceCurrency ?? 'RUB'}
              className="frame block w-full p-1"
            />
          </label>
        </div>
      )}
    </div>
  );
}
