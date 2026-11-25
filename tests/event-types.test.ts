import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { EventTypeCatalog } from '../frontend/src/BookingPage';
import { listEventTypes } from '../frontend/src/api/generated/sdk.gen';
import type { EventType } from '../frontend/src/api/generated/types.gen';
import { buildApp } from '../server/app.ts';
import { expectOpenApiResponse } from './openapi.ts';

const introduction: EventType = {
  id: 'introduction',
  title: 'Знакомство',
  description: 'Короткий звонок для знакомства.',
  durationMinutes: 30,
};

const consultation: EventType = {
  id: 'consultation',
  title: 'Консультация',
  description: 'Разговор о вашей задаче.',
  durationMinutes: 60,
};

test.each([
  { catalog: 'empty', eventTypes: [] },
  { catalog: 'populated', eventTypes: [introduction, consultation] },
])('the event types API returns the $catalog catalog', async ({ eventTypes }) => {
  const app = buildApp({ eventTypes });
  try {
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const response = await fetch(new URL('/api/event-types', address));

    const body = await expectOpenApiResponse(response, '/api/event-types', 'get', 200);
    expect(body).toEqual(eventTypes);
  } finally {
    await app.close();
  }
});

test('the catalog displays the meeting titles, descriptions and durations from the SDK', async () => {
  const app = buildApp({ eventTypes: [introduction, consultation] });
  try {
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const { data } = await listEventTypes({ baseUrl: address, throwOnError: true });
    const catalog = renderToStaticMarkup(createElement(EventTypeCatalog, { eventTypes: data }));

    expect(catalog).toContain('Знакомство');
    expect(catalog).toContain('Короткий звонок для знакомства.');
    expect(catalog).toContain('30 мин');
    expect(catalog).toContain('Консультация');
    expect(catalog).toContain('Разговор о вашей задаче.');
    expect(catalog).toContain('60 мин');
  } finally {
    await app.close();
  }
});

test('the catalog explains when there are no meeting types', () => {
  const catalog = renderToStaticMarkup(createElement(EventTypeCatalog, { eventTypes: [] }));

  expect(catalog).toContain('Типов встреч пока нет.');
});
