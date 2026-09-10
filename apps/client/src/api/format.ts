const dateTime = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});


export function formatEventPeriod(startsAt: string, endsAt: string | null): string {
  const start = new Date(startsAt);

  if (!endsAt) {
    return dateTime.format(start);
  }

  const end = new Date(endsAt);
  const sameDay = start.toDateString() === end.toDateString();

  if (sameDay) {
    const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return `${dateTime.format(start)} - ${time.format(end)}`;
  }

  return `${dateTime.format(start)} - ${dateTime.format(end)}`;
}

export function formatPrice(amount: string | null, currency: string | null, label: string | null): string | null {
  if (label) {
    return label;
  }

  if (!amount) {
    return null;
  }

  const value = Number(amount);

  return new Intl.NumberFormat('ru-RU', {
    style: currency ? 'currency' : 'decimal',
    currency: currency ?? undefined,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}
