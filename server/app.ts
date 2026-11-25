import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { fileURLToPath } from 'node:url';

interface AppOptions {
  logger?: boolean;
  serveFrontend?: boolean;
}

export function buildApp({ logger = false, serveFrontend = false }: AppOptions = {}) {
  const app = Fastify({ logger });

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

  if (serveFrontend) {
    app.register(fastifyStatic, {
      root: fileURLToPath(new URL('../dist/', import.meta.url)),
    });

    app.get('/book', async (_request, reply) => reply.sendFile('index.html'));
    app.get('/book/', async (_request, reply) => reply.redirect('/book'));
  }

  return app;
}
