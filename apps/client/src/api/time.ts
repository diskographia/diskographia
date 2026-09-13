// все даты платформы живут в одном поясе: так ввод и показ совпадают у всех, где бы ни стоял сервер и ни сидел человек
export const ZONE = 'Europe/Moscow';

const parts = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function wall(moment: Date): Record<string, number> {
  const out: Record<string, number> = {};

  for (const part of parts.formatToParts(moment)) {
    if (part.type !== 'literal') {
      out[part.type] = Number(part.value);
    }
  }

  return out;
}

// смещение пояса в минутах на этот момент
function offsetAt(moment: Date): number {
  const w = wall(moment);
  const asUtc = Date.UTC(w.year!, w.month! - 1, w.day!, w.hour!, w.minute!, w.second!);

  return (asUtc - moment.getTime()) / 60_000;
}

// дата и время в поясе платформы превращаются в момент. пустое время это полночь, пустая дата это ничего
export function zonedToIso(date: string, time: string): string | null {
  const day = date.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return null;
  }

  const [year, month, dayOfMonth] = day.split('-').map(Number) as [number, number, number];
  const [hour = 0, minute = 0] = time.trim() ? (time.trim().split(':').map(Number) as [number, number]) : [0, 0];
  const naive = Date.UTC(year, month - 1, dayOfMonth, hour, minute);

  // первая оценка по смещению в этот момент, вторая ловит переход времени
  const guess = naive - offsetAt(new Date(naive)) * 60_000;
  const exact = naive - offsetAt(new Date(guess)) * 60_000;

  return new Date(exact).toISOString();
}

// момент раскладывается на поля формы; полночь считается «без времени»
export function isoToParts(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) {
    return { date: '', time: '' };
  }

  const w = wall(new Date(iso));
  const two = (n: number) => String(n).padStart(2, '0');
  const midnight = w.hour === 0 && w.minute === 0;

  return { date: `${w.year}-${two(w.month!)}-${two(w.day!)}`, time: midnight ? '' : `${two(w.hour!)}:${two(w.minute!)}` };
}

// дата момента в поясе платформы, как в поле формы
export function zonedDate(iso: string): string {
  return isoToParts(iso).date;
}

export function hasTime(iso: string): boolean {
  const w = wall(new Date(iso));

  return !(w.hour === 0 && w.minute === 0);
}
