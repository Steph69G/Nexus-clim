export function toParisISO(date: Date): string {
  const parisDate = new Date(
    date.toLocaleString('en-US', { timeZone: 'Europe/Paris' })
  );
  return parisDate.toISOString();
}

export function fromParisISO(isoString: string): Date {
  const utcDate = new Date(isoString);
  return new Date(
    utcDate.toLocaleString('en-US', { timeZone: 'Europe/Paris' })
  );
}

export function getParisNow(): Date {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' })
  );
}

export function ensureParisTimezone(date: Date): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const values: Record<string, string> = {};

  parts.forEach(part => {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  });

  return new Date(
    `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`
  );
}
