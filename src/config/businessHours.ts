export const BUSINESS_HOURS = {
  start: 7,
  end: 20,
  workDays: [1, 2, 3, 4, 5],
  defaultSlotDuration: 60,
  defaultSlotStart: 8,
} as const;

export type BusinessHoursConfig = typeof BUSINESS_HOURS;

export function isWithinBusinessHours(date: Date): boolean {
  const hour = date.getHours();
  const day = date.getDay();

  return (
    BUSINESS_HOURS.workDays.includes(day) &&
    hour >= BUSINESS_HOURS.start &&
    hour < BUSINESS_HOURS.end
  );
}

export function isWorkDay(date: Date): boolean {
  return BUSINESS_HOURS.workDays.includes(date.getDay());
}

export function getDefaultSlot(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(BUSINESS_HOURS.defaultSlotStart, 0, 0, 0);

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + BUSINESS_HOURS.defaultSlotDuration);

  return { start, end };
}
