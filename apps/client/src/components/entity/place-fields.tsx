'use client';

import { useEffect, useState } from 'react';

import { request } from '@/api/browser';

interface Places {
  cities: string[];
  locations: string[];
}

// адрес и город подсказываются из своих прошлых ивентов, свежие первыми
export function PlaceFields({ location, city }: { location: string; city: string }) {
  const [places, setPlaces] = useState<Places>({ cities: [], locations: [] });

  useEffect(() => {
    void request<Places>('/entities/mine/places').then((answer) => {
      if (answer.ok && answer.data) {
        setPlaces(answer.data);
      }
    });
  }, []);

  return (
    <>
      <label className="mt-2 block">
        адрес
        <input name="location" defaultValue={location} list="places-locations" className="frame block w-full p-1" />
      </label>
      <label className="mt-2 block">
        город
        <input name="city" defaultValue={city} list="places-cities" className="frame block w-full p-1" />
      </label>

      <datalist id="places-locations">
        {places.locations.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="places-cities">
        {places.cities.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
    </>
  );
}
