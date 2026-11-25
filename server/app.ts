import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { fileURLToPath } from 'node:url';
import type { EventType } from '../frontend/src/api/generated/types.gen.ts';
import { registerCreateEventType } from './create-event-type.ts';

interface AppOptions {
  logger?: boolean;
  serveFrontend?: boolean;
  eventTypes?: readonly EventType[];
}

export function buildApp({
  logger = false,
  serveFrontend = false,
  eventTypes = [],
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
