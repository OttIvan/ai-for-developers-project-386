import { expect, test } from 'vitest';
import { getHealth } from '../frontend/src/api/generated/sdk.gen';
import { buildApp } from '../server/app.ts';

test('the application serves the frontend and answers the generated health call', async () => {
  const app = buildApp({ serveFrontend: true });

  try {
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const page = await fetch(address);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('<title>Календарь звонков</title>');

    const { data, response } = await getHealth({ baseUrl: address });
    expect(response.status).toBe(200);
    expect(data).toEqual({ status: 'ok' });
  } finally {
    await app.close();
  }
});
