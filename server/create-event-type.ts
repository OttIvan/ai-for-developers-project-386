import type { FastifyInstance } from 'fastify';
import type { EventType } from '../frontend/src/api/generated/types.gen.ts';

const invalidInput = {
  code: 'INVALID_INPUT',
  message: 'Проверьте ID, название, описание и длительность встречи.',
};

function parseEventType(body: unknown): EventType | undefined {
  if (typeof body !== 'object' || body === null) {
    return;
  }

  const { id, title, description, durationMinutes } = body as Record<string, unknown>;
  if (
    typeof id !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)
    || typeof title !== 'string' || !title.trim()
    || typeof description !== 'string' || !description.trim()
    || typeof durationMinutes !== 'number' || !Number.isInteger(durationMinutes)
    || durationMinutes < 1 || durationMinutes > 2_147_483_647
  ) {
    return;
  }

  return { id, title: title.trim(), description: description.trim(), durationMinutes };
}

export function registerCreateEventType(app: FastifyInstance, eventTypesById: Map<string, EventType>) {
  app.post('/api/event-types', {
    errorHandler(error, _request, reply) {
      if (error.statusCode === 400) {
        return reply.code(400).send(invalidInput);
      }
      return reply.send(error);
    },
  }, (request, reply) => {
    const eventType = parseEventType(request.body);
    if (!eventType) {
      return reply.code(400).send(invalidInput);
    }

    if (eventTypesById.has(eventType.id)) {
      return reply.code(409).send({
        code: 'EVENT_TYPE_ID_TAKEN',
        message: 'Этот ID уже занят. Выберите другой ID.',
      });
    }

    eventTypesById.set(eventType.id, eventType);
    return reply.code(201).send(eventType);
  });
}
