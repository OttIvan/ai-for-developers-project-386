import { expect, test } from 'vitest';
import type { AvailabilityCalendar, CreateBookingData, EventType } from '../frontend/src/api/generated/types.gen';
import { buildApp } from '../server/app.ts';
import { expectOpenApiResponse } from './openapi.ts';

const eventTypes: EventType[] = [
  { id: 'introduction', title: 'Знакомство', description: 'Короткий звонок.', durationMinutes: 30 },
  { id: 'consultation', title: 'Консультация', description: 'Разговор о вашей задаче.', durationMinutes: 60 },
];
const bookingsPath = '/api/bookings';
const upcomingPath = '/api/bookings/upcoming';
const slotsPath = '/api/event-types/{id}/slots';
const booking = {
  eventTypeId: 'consultation',
  startAt: '2026-11-27T10:00:00+04:00',
  guestName: '  Анна  ',
} satisfies CreateBookingData['body'];

const buildBookingApp = () => buildApp({ eventTypes, now: () => new Date('2026-11-25T21:00:00Z') });

function submitBooking(address: string, body: unknown) {
  return fetch(new URL(bookingsPath, address), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function listUpcomingBookings(address: string) {
  return expectOpenApiResponse(await fetch(new URL(upcomingPath, address)), upcomingPath, 'get', 200);
}

test('the upcoming bookings list is empty before any booking is confirmed', async () => {
  const app = buildBookingApp();
  try {
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    expect(await listUpcomingBookings(address)).toEqual([]);
  } finally {
    await app.close();
  }
});

test('the upcoming list orders all meeting types by start time and drops bookings that have started', async () => {
  let now = new Date('2026-11-25T21:00:00Z');
  const app = buildApp({ eventTypes, now: () => now });
  try {
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const later = await expectOpenApiResponse(await submitBooking(address, {
      ...booking,
      eventTypeId: 'introduction',
      startAt: '2026-11-27T07:00:00Z',
      guestName: 'Борис',
    }), bookingsPath, 'post', 201);
    const earlier = await expectOpenApiResponse(await submitBooking(address, booking), bookingsPath, 'post', 201);
    expect(await listUpcomingBookings(address)).toEqual([earlier, later]);

    now = new Date('2026-11-27T06:15:00Z');
    expect(await listUpcomingBookings(address)).toEqual([later]);
  } finally {
    await app.close();
  }
});

test('a confirmed booking excludes overlapping slots across meeting types and permits adjacency', async () => {
  const app = buildBookingApp();
  try {
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const confirmed = await expectOpenApiResponse(await submitBooking(address, booking), bookingsPath, 'post', 201);
    expect(confirmed).toEqual({
      id: expect.any(String),
      eventTypeId: 'consultation',
      eventTypeTitle: 'Консультация',
      startAt: '2026-11-27T06:00:00.000Z',
      endAt: '2026-11-27T07:00:00.000Z',
      guestName: 'Анна',
    });

    const overlap = await submitBooking(address, {
      ...booking,
      eventTypeId: 'introduction',
      startAt: '2026-11-27T06:30:00Z',
    });
    expect(await expectOpenApiResponse(overlap, bookingsPath, 'post', 409)).toMatchObject({ code: 'SLOT_TAKEN' });

    const repeated = await submitBooking(address, booking);
    expect(await expectOpenApiResponse(repeated, bookingsPath, 'post', 409)).toMatchObject({ code: 'SLOT_TAKEN' });

    const slotsResponse = await fetch(new URL('/api/event-types/introduction/slots', address));
    const calendar = await expectOpenApiResponse(slotsResponse, slotsPath, 'get', 200) as AvailabilityCalendar;
    expect(calendar.days[0].slots[0]).toEqual({
      startAt: '2026-11-27T07:00:00.000Z',
      endAt: '2026-11-27T07:30:00.000Z',
    });

    const adjacent = await submitBooking(address, {
      ...booking,
      eventTypeId: 'introduction',
      startAt: '2026-11-27T07:00:00.000Z',
    });
    expect(await expectOpenApiResponse(adjacent, bookingsPath, 'post', 201)).toMatchObject({
      startAt: '2026-11-27T07:00:00.000Z',
      endAt: '2026-11-27T07:30:00.000Z',
    });
  } finally {
    await app.close();
  }
});

test('two concurrent overlapping requests produce one confirmation and one conflict', async () => {
  const app = buildBookingApp();
  try {
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const responses = await Promise.all([
      submitBooking(address, booking),
      submitBooking(address, {
        eventTypeId: 'introduction',
        startAt: '2026-11-27T06:30:00Z',
        guestName: 'Борис',
      }),
    ]);
    const [confirmed, conflict] = responses.sort((left, right) => left.status - right.status);

    const winner = await expectOpenApiResponse(confirmed, bookingsPath, 'post', 201);
    expect(await expectOpenApiResponse(conflict, bookingsPath, 'post', 409)).toMatchObject({ code: 'SLOT_TAKEN' });
    expect(await listUpcomingBookings(address)).toEqual([winner]);
  } finally {
    await app.close();
  }
});

test('invalid booking fields and starts fail the contract without reserving the slot', async () => {
  const app = buildBookingApp();
  try {
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const invalidBookings = [
      null,
      [],
      {},
      { ...booking, guestName: 42 },
      { ...booking, guestName: '  \t  ' },
      { ...booking, eventTypeId: '' },
      { ...booking, startAt: '2026-11-27T06:00:00' },
      { ...booking, startAt: '2026-11-27 06:00:00Z' },
      { ...booking, startAt: '2026-11-27T06:00:00.0001Z' },
      { ...booking, startAt: '2026-11-31T06:00:00Z' },
      { ...booking, startAt: '2026-11-26T06:00:00Z' },
      { ...booking, startAt: '2026-12-11T06:00:00Z' },
      { ...booking, startAt: '2026-11-28T06:00:00Z' },
      { ...booking, startAt: '2026-11-27T05:45:00Z' },
      { ...booking, startAt: '2026-11-27T06:01:00Z' },
      { ...booking, startAt: '2026-11-27T06:00:01Z' },
      { ...booking, startAt: '2026-11-27T13:15:00Z' },
    ];
    for (const invalid of invalidBookings) {
      const response = await submitBooking(address, invalid);
      expect(response.status, JSON.stringify(invalid)).toBe(400);
      expect(await expectOpenApiResponse(response, bookingsPath, 'post', 400)).toMatchObject({ code: 'INVALID_INPUT' });
    }

    const malformed = await fetch(new URL(bookingsPath, address), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    });
    expect(await expectOpenApiResponse(malformed, bookingsPath, 'post', 400)).toMatchObject({ code: 'INVALID_INPUT' });

    const unknownType = await submitBooking(address, { ...booking, eventTypeId: 'unknown' });
    expect(await expectOpenApiResponse(unknownType, bookingsPath, 'post', 404)).toMatchObject({
      code: 'EVENT_TYPE_NOT_FOUND',
    });

    await expectOpenApiResponse(await submitBooking(address, booking), bookingsPath, 'post', 201);
  } finally {
    await app.close();
  }
});
