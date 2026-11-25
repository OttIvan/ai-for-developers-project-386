import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { App } from '../frontend/src/App';

test('the home page explains how to book and links to the booking page', () => {
  const page = renderToStaticMarkup(createElement(App, { pathname: '/' }));

  expect(page).toContain('<h1>Запишитесь на звонок</h1>');
  expect(page).toContain('Выберите тип встречи и удобное время. Для записи не нужен аккаунт.');
  expect(page).toMatch(/<a\b[^>]*href="\/book"[^>]*>Записаться на звонок<\/a>/);
});

test('the booking page shows that the catalog is loading and offers a route home', () => {
  const page = renderToStaticMarkup(createElement(App, { pathname: '/book' }));

  expect(page).toContain('<h1>Страница записи</h1>');
  expect(page).toContain('Загружаем типы встреч…');
  expect(page).toMatch(/<a\b[^>]*href="\/"[^>]*>На главную<\/a>/);
});
