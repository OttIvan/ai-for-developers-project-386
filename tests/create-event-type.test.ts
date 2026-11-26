import { expect, test } from 'vitest';
import { buildApp } from '../server/app.ts';
import { expectOpenApiResponse } from './openapi.ts';

const path = '/api/event-types';
const introduction = {
  id: 'intro-30',
  title: 'Знакомство',
  description: 'Короткий звонок.',
  durationMinutes: 30,
};

function createEventType(url: URL, body: unknown) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('a created event type appears in the guest catalog', async () => {
  const app = buildApp();
  try {
    const url = new URL(path, await app.listen({ host: '127.0.0.1', port: 0 }));
    const response = await createEventType(url, {
      ...introduction,
      title: `  ${introduction.title}  `,
      description: `  ${introduction.description}  `,
    });

    expect(await expectOpenApiResponse(response, path, 'post', 201)).toEqual(introduction);
    expect(await expectOpenApiResponse(await fetch(url), path, 'get', 200)).toEqual([introduction]);
  } finally {
    await app.close();
  }
});

test('a duplicate ID leaves the original event type in the catalog', async () => {
  const app = buildApp({ eventTypes: [introduction] });
  try {
    const url = new URL(path, await app.listen({ host: '127.0.0.1', port: 0 }));
    const response = await createEventType(url, { ...introduction, title: 'Другая встреча' });

    expect(await expectOpenApiResponse(response, path, 'post', 409)).toEqual({
      code: 'EVENT_TYPE_ID_TAKEN',
      message: 'Этот ID уже занят. Выберите другой ID.',
    });
    expect(await expectOpenApiResponse(await fetch(url), path, 'get', 200)).toEqual([introduction]);
  } finally {
    await app.close();
  }
});

test('invalid fields and malformed JSON return INVALID_INPUT and leave the catalog empty', async () => {
  const app = buildApp();
  try {
    const url = new URL(path, await app.listen({ host: '127.0.0.1', port: 0 }));
    for (const body of [
      null,
      {},
      { ...introduction, id: 'Intro-30' },
      { ...introduction, id: 'intro--30' },
      { ...introduction, title: ' \t ' },
      { ...introduction, description: '' },
      { ...introduction, durationMinutes: 0 },
      { ...introduction, durationMinutes: 2.5 },
      { ...introduction, durationMinutes: Number.MAX_SAFE_INTEGER + 1 },
      { ...introduction, durationMinutes: '30' },
    ]) {
      const response = await createEventType(url, body);
      expect(await expectOpenApiResponse(response, path, 'post', 400)).toEqual({
        code: 'INVALID_INPUT',
        message: 'Проверьте ID, название, описание и длительность встречи.',
      });
    }

    const malformedJson = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    expect(await expectOpenApiResponse(malformedJson, path, 'post', 400)).toMatchObject({
      code: 'INVALID_INPUT',
    });
    expect(await expectOpenApiResponse(await fetch(url), path, 'get', 200)).toEqual([]);
  } finally {
    await app.close();
  }
});

test('the API accepts a positive safe integer duration larger than int32', async () => {
  const app = buildApp();
  try {
    const url = new URL(path, await app.listen({ host: '127.0.0.1', port: 0 }));
    const eventType = { ...introduction, durationMinutes: 2_147_483_648 };
    expect(await expectOpenApiResponse(await createEventType(url, eventType), path, 'post', 201)).toEqual(eventType);
  } finally {
    await app.close();
  }
});
