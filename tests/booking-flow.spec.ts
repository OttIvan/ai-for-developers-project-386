import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { buildApp } from '../server/app.ts';

async function selectSlot(page: Page, name: string) {
  await page.getByRole('button', { name: 'Выбрать время: Знакомство' }).click();
  await expect(page.getByText('Часовой пояс: Asia/Tbilisi')).toBeVisible();
  const dates = page.getByRole('group', { name: 'Даты' });
  await dates.getByRole('button', { name: /27 нояб/ }).click();
  await page.getByRole('button', { name: '10:00', exact: true }).click();
  await page.getByLabel('Ваше имя').fill(name);
}

test('the owner sees a guest booking and a second guest can recover from a stale slot', async ({ page, context }) => {
  const app = buildApp({ serveFrontend: true, now: () => new Date('2026-11-25T21:00:00Z') });
  try {
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    await page.goto(address);
    await page.getByRole('link', { name: 'Страница владельца' }).click();

    const upcoming = page.getByRole('region', { name: 'Предстоящие записи' });
    await expect(upcoming.getByText('Предстоящих записей пока нет.')).toBeVisible();
    await page.getByLabel('ID', { exact: true }).fill('introduction');
    await page.getByLabel('Название').fill('Знакомство');
    await page.getByLabel('Описание').fill('Короткий звонок.');
    await page.getByLabel('Длительность (мин)').fill('30');
    await page.getByRole('button', { name: 'Создать тип встречи' }).click();
    await expect(page.getByText('Тип встречи создан.')).toBeVisible();

    const guest = await context.newPage();
    await guest.goto(address);
    await guest.getByRole('link', { name: 'Записаться на звонок' }).click();
    await expect(guest.getByText('Короткий звонок.')).toBeVisible();
    await selectSlot(guest, 'Анна');

    const secondGuest = await context.newPage();
    await secondGuest.goto(new URL('/book', address).href);
    await selectSlot(secondGuest, 'Борис');

    await guest.getByRole('button', { name: 'Записаться', exact: true }).click();
    await expect(guest.getByRole('heading', { name: 'Запись подтверждена' })).toBeVisible();
    await expect(guest.getByRole('status')).toContainText('10:00–10:30 (Asia/Tbilisi)');

    const secondSubmit = secondGuest.getByRole('button', { name: 'Записаться', exact: true });
    await secondSubmit.click();
    await expect(secondGuest.getByRole('alert')).toHaveText('Это время уже занято. Выберите другой слот');
    await expect(secondGuest.getByLabel('Ваше имя')).toHaveValue('Борис');
    await expect(secondGuest.getByRole('button', { name: /27 нояб/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(secondGuest.getByRole('button', { name: '10:00', exact: true })).toHaveCount(0);
    await expect(secondSubmit).toBeDisabled();
    await secondGuest.getByRole('button', { name: '10:30', exact: true }).click();
    await secondSubmit.click();
    await expect(secondGuest.getByRole('heading', { name: 'Запись подтверждена' })).toBeVisible();

    await page.reload();
    await expect(upcoming.getByText('Часовой пояс: Asia/Tbilisi')).toBeVisible();
    const bookings = upcoming.getByRole('listitem');
    await expect(bookings).toHaveCount(2);
    const first = bookings.nth(0);
    await expect(first.getByText(/27 ноября 2026/)).toBeVisible();
    await expect(first.getByText('10:00–10:30')).toBeVisible();
    await expect(first.getByText('Знакомство')).toBeVisible();
    await expect(first.getByText('Анна')).toBeVisible();
    const second = bookings.nth(1);
    await expect(second.getByText('10:30–11:00')).toBeVisible();
    await expect(second.getByText('Борис')).toBeVisible();
  } finally {
    await app.close();
  }
});

test('an open calendar advances at Tbilisi midnight and preserves the guest name', async ({ page }) => {
  const beforeMidnight = new Date('2026-11-25T19:59:00Z');
  let now = beforeMidnight;
  const app = buildApp({
    serveFrontend: true,
    now: () => now,
    eventTypes: [
      { id: 'introduction', title: 'Знакомство', description: 'Короткий звонок.', durationMinutes: 30 },
    ],
  });
  try {
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    await page.clock.install({ time: new Date('2026-11-25T19:58:00Z') });
    await page.clock.pauseAt(beforeMidnight);
    await page.goto(new URL('/book', address).href);
    await page.getByRole('button', { name: 'Выбрать время: Знакомство' }).click();

    const dates = page.getByRole('group', { name: 'Даты' });
    const oldDate = dates.getByRole('button', { name: /26 нояб/ });
    await oldDate.click();
    await page.getByRole('button', { name: '10:00', exact: true }).click();
    await page.getByLabel('Ваше имя').fill('Анна');

    now = new Date('2026-11-25T20:00:00Z');
    await page.clock.fastForward(60_000);
    await expect(dates.getByRole('button').first()).toHaveText(/27 нояб/);
    await expect(oldDate).toHaveCount(0);
    await expect(page.getByLabel('Ваше имя')).toHaveValue('Анна');
    await expect(page.getByRole('button', { name: 'Записаться', exact: true })).toBeDisabled();
  } finally {
    await app.close();
  }
});
