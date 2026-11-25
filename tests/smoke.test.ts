import { expect, test } from 'vitest';
import { getHealth } from '../frontend/src/api/generated/sdk.gen';
import { buildApp } from '../server/app.ts';

test('the application serves the home, booking and owner pages and answers the generated health call', async () => {
  const app = buildApp({ serveFrontend: true });

  try {
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const page = await fetch(address);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('<title>Календарь звонков</title>');

    const bookingPage = await fetch(new URL('/book', address));
    expect(bookingPage.status).toBe(200);
    expect(bookingPage.headers.get('content-type')).toContain('text/html');
    expect(await bookingPage.text()).toContain('id="root"');

    const ownerPage = await fetch(new URL('/owner', address));
    expect(ownerPage.status).toBe(200);
    expect(ownerPage.headers.get('content-type')).toContain('text/html');
    expect(await ownerPage.text()).toContain('id="root"');

    const { data, response } = await getHealth({ baseUrl: address });
    expect(response.status).toBe(200);
    expect(data).toEqual({ status: 'ok' });
  } finally {
    await app.close();
  }
});
