import { expect, test } from 'vitest';
import type { AvailabilityCalendar, EventType } from '../frontend/src/api/generated/types.gen';
import { buildApp } from '../server/app.ts';
import { expectOpenApiResponse } from './openapi.ts';

const eventTypes: EventType[] = [
  { id: 'introduction', title: 'Знакомство', description: 'Короткий звонок.', durationMinutes: 30 },
  { id: 'consultation', title: 'Консультация', description: 'Разговор о вашей задаче.', durationMinutes: 60 },
];
const slotsPath = '/api/event-types/{id}/slots';

test('the slot calendar uses the owner’s next 14 dates and fits each meeting type into working hours', async () => {
  const app = buildApp({ eventTypes, now: () => new Date('2026-11-25T21:00:00Z') });
  try {
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const introduction = await fetch(new URL('/api/event-types/introduction/slots', address));
    const consultation = await fetch(new URL('/api/event-types/consultation/slots', address));

    const calendar = await expectOpenApiResponse(introduction, slotsPath, 'get', 200) as AvailabilityCalendar;
    expect(calendar.timezone).toBe('Asia/Tbilisi');
    expect(calendar.days.map(({ date }) => date)).toEqual([
      '2026-11-27', '2026-11-28', '2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03',
      '2026-12-04', '2026-12-05', '2026-12-06', '2026-12-07', '2026-12-08', '2026-12-09', '2026-12-10',
    ]);
    expect(calendar.days.filter(({ slots }) => slots.length === 0).map(({ date }) => date)).toEqual([
      '2026-11-28', '2026-11-29', '2026-12-05', '2026-12-06',
    ]);
    const fridaySlots = calendar.days[0].slots;
    expect(fridaySlots).toHaveLength(31);
    expect(fridaySlots[0]).toEqual({
      startAt: '2026-11-27T06:00:00.000Z',
      endAt: '2026-11-27T06:30:00.000Z',
    });
    for (let index = 1; index < fridaySlots.length; index += 1) {
      expect(Date.parse(fridaySlots[index].startAt) - Date.parse(fridaySlots[index - 1].startAt)).toBe(900_000);
      expect(Date.parse(fridaySlots[index].endAt) - Date.parse(fridaySlots[index].startAt)).toBe(1_800_000);
    }
    expect(fridaySlots.at(-1)).toEqual({
      startAt: '2026-11-27T13:30:00.000Z',
      endAt: '2026-11-27T14:00:00.000Z',
    });

    const longCalendar = await expectOpenApiResponse(consultation, slotsPath, 'get', 200) as AvailabilityCalendar;
    expect(longCalendar.days[0].slots).toHaveLength(29);
    expect(longCalendar.days[0].slots.at(-1)).toEqual({
      startAt: '2026-11-27T13:00:00.000Z',
      endAt: '2026-11-27T14:00:00.000Z',
    });
  } finally {
    await app.close();
  }
});

test('the calendar advances at Tbilisi midnight and retains all dates when a meeting cannot fit', async () => {
  let now = new Date('2026-12-31T19:59:59Z');
  const workshop = { ...eventTypes[0], id: 'workshop', durationMinutes: 481 };
  const app = buildApp({ eventTypes: [workshop], now: () => now });
  try {
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const url = new URL('/api/event-types/workshop/slots', address);

    const before = await expectOpenApiResponse(await fetch(url), slotsPath, 'get', 200) as AvailabilityCalendar;
    expect(before.days[0].date).toBe('2027-01-01');
    expect(before.days[13].date).toBe('2027-01-14');

    now = new Date('2026-12-31T20:00:00Z');
    const after = await expectOpenApiResponse(await fetch(url), slotsPath, 'get', 200) as AvailabilityCalendar;
    expect(after.days).toHaveLength(14);
    expect(after.days[0].date).toBe('2027-01-02');
    expect(after.days[13].date).toBe('2027-01-15');
    expect(after.days.every(({ slots }) => slots.length === 0)).toBe(true);
  } finally {
    await app.close();
  }
});

test('requesting slots for an unknown meeting type returns the documented error', async () => {
  const app = buildApp({ eventTypes });
  try {
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const response = await fetch(new URL('/api/event-types/unknown/slots', address));

    const body = await expectOpenApiResponse(response, slotsPath, 'get', 404);
    expect(body).toMatchObject({ code: 'EVENT_TYPE_NOT_FOUND' });
  } finally {
    await app.close();
  }
});
