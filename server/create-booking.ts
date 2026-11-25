import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Booking, BookingRequest, EventType } from '../frontend/src/api/generated/types.gen.ts';
import { findScheduledSlot, slotsOverlap } from './scheduling.ts';

const invalidInput = {
  code: 'INVALID_INPUT',
  message: 'Проверьте тип встречи, время и имя гостя.',
};

// The grid starts on whole minutes. A nonzero fraction must not be rounded by Date.parse.
const slotTimestamp = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.0+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/i;

function parseBookingRequest(body: unknown): BookingRequest | undefined {
  if (typeof body !== 'object' || body === null) {
    return;
  }

  const { eventTypeId, guestName, startAt } = body as Record<string, unknown>;
  if (
    typeof eventTypeId !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(eventTypeId)
    || typeof guestName !== 'string' || !guestName.trim()
    || typeof startAt !== 'string'
  ) {
    return;
  }

  const timestamp = slotTimestamp.exec(startAt);
  if (!timestamp || timestamp[0] !== startAt) {
    return;
  }
  // Reject calendar dates that Date would roll over into the following month.
  const date = new Date(`${timestamp[1]}T00:00:00Z`);
  if (!Number.isFinite(date.valueOf()) || !date.toISOString().startsWith(timestamp[1])) {
    return;
  }

  return { eventTypeId, startAt, guestName: guestName.trim() };
}

export function registerCreateBooking(
  app: FastifyInstance,
  eventTypesById: ReadonlyMap<string, EventType>,
  bookings: Booking[],
  now: () => Date,
) {
  app.post('/api/bookings', {
    errorHandler(error, _request, reply) {
      if (error.statusCode === 400) {
        return reply.code(400).send(invalidInput);
      }
      return reply.send(error);
    },
  }, (request, reply) => {
    const input = parseBookingRequest(request.body);
    if (!input) {
      return reply.code(400).send(invalidInput);
    }

    const eventType = eventTypesById.get(input.eventTypeId);
    if (!eventType) {
      return reply.code(404).send({
        code: 'EVENT_TYPE_NOT_FOUND',
        message: 'Тип встречи не найден.',
      });
    }

    const slot = findScheduledSlot(now(), eventType.durationMinutes, input.startAt);
    if (!slot) {
      return reply.code(400).send(invalidInput);
    }

    // Keep the overlap check and insertion synchronous within this process.
    if (bookings.some((booking) => slotsOverlap(slot, booking))) {
      return reply.code(409).send({
        code: 'SLOT_TAKEN',
        message: 'Это время уже занято. Выберите другой слот',
      });
    }

    const booking: Booking = {
      id: randomUUID(),
      eventTypeId: eventType.id,
      eventTypeTitle: eventType.title,
      ...slot,
      guestName: input.guestName,
    };
    bookings.push(booking);
    return reply.code(201).send(booking);
  });
}
