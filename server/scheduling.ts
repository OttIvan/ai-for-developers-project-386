import type { AvailabilityCalendar, Slot } from '../frontend/src/api/generated/types.gen.ts';

const timezone = 'Asia/Tbilisi';
const minuteMs = 60_000;
const dayMs = 24 * 60 * minuteMs;
const ownerDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: timezone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const ownerOffset = new Intl.DateTimeFormat('en-US', {
  timeZone: timezone,
  timeZoneName: 'longOffset',
});

function windowDates(now: Date): string[] {
  const today = Date.parse(ownerDate.format(now));
  return Array.from({ length: 14 }, (_, index) =>
    new Date(today + (index + 1) * dayMs).toISOString().slice(0, 10),
  );
}

function scheduledSlots(date: string, durationMinutes: number): Slot[] {
  const dateAtNoonUtc = new Date(`${date}T12:00:00Z`);
  const weekday = dateAtNoonUtc.getUTCDay();
  if (weekday === 0 || weekday === 6) {
    return [];
  }

  const offsetName = ownerOffset.formatToParts(dateAtNoonUtc).find(({ type }) => type === 'timeZoneName');
  const offset = offsetName?.value.slice(3) || 'Z';
  const workdayStart = Date.parse(`${date}T10:00:00${offset}`);
  const workdayMinutes = 8 * 60;
  const slots: Slot[] = [];

  for (let minute = 0; minute + durationMinutes <= workdayMinutes; minute += 15) {
    const start = workdayStart + minute * minuteMs;
    slots.push({
      startAt: new Date(start).toISOString(),
      endAt: new Date(start + durationMinutes * minuteMs).toISOString(),
    });
  }

  return slots;
}

export function slotsOverlap(left: Slot, right: Slot): boolean {
  return Date.parse(left.startAt) < Date.parse(right.endAt)
    && Date.parse(right.startAt) < Date.parse(left.endAt);
}

export function listAvailability(
  now: Date,
  durationMinutes: number,
  occupied: readonly Slot[] = [],
): AvailabilityCalendar {
  // windowDates always supplies one entry for each of the 14 calendar days.
  const days = windowDates(now).map((date) => ({
    date,
    slots: scheduledSlots(date, durationMinutes).filter(
      (slot) => !occupied.some((reservation) => slotsOverlap(slot, reservation)),
    ),
  })) as AvailabilityCalendar['days'];

  return { timezone, days };
}

export function findScheduledSlot(now: Date, durationMinutes: number, startAt: string): Slot | undefined {
  const start = Date.parse(startAt);
  if (!Number.isFinite(start)) {
    return undefined;
  }

  const date = ownerDate.format(start);
  if (!windowDates(now).includes(date)) {
    return undefined;
  }

  return scheduledSlots(date, durationMinutes).find((slot) => Date.parse(slot.startAt) === start);
}
