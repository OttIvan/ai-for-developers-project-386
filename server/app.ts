import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { fileURLToPath } from 'node:url';
import type { EventType } from '../frontend/src/api/generated/types.gen.ts';
import { registerCreateEventType } from './create-event-type.ts';
import { listAvailability } from './scheduling.ts';

interface AppOptions {
  logger?: boolean;
  serveFrontend?: boolean;
  eventTypes?: readonly EventType[];
  now?: () => Date;
}

export function buildApp({
  logger = false,
  serveFrontend = false,
  eventTypes = [],
  now = () => new Date(),
}: AppOptions = {}) {
  const app = Fastify({ logger });
  const eventTypesById = new Map(eventTypes.map((eventType) => [eventType.id, eventType]));

  app.get('/api/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          required: ['status'],
          properties: { status: { type: 'string', const: 'ok' } },
        },
      },
    },
  }, async () => ({ status: 'ok' }));

  app.get('/api/event-types', async () => Array.from(eventTypesById.values()));
  registerCreateEventType(app, eventTypesById);

  app.get<{ Params: { id: string } }>('/api/event-types/:id/slots', async (request, reply) => {
    const eventType = eventTypesById.get(request.params.id);
    if (!eventType) {
      return reply.code(404).send({
        code: 'EVENT_TYPE_NOT_FOUND',
        message: 'Тип встречи не найден.',
      });
    }

    return listAvailability(now(), eventType.durationMinutes);
  });

  if (serveFrontend) {
    app.register(fastifyStatic, {
      root: fileURLToPath(new URL('../dist/', import.meta.url)),
    });

    app.get('/book', async (_request, reply) => reply.sendFile('index.html'));
    app.get('/book/', async (_request, reply) => reply.redirect('/book'));
    app.get('/owner', async (_request, reply) => reply.sendFile('index.html'));
    app.get('/owner/', async (_request, reply) => reply.redirect('/owner'));
  }

  return app;
}
