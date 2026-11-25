import { useEffect, useState } from 'react';
import { listEventTypes } from './api/generated/sdk.gen';
import type { EventType } from './api/generated/types.gen';

type CatalogState =
  | { status: 'loading' }
  | { status: 'loaded'; eventTypes: EventType[] }
  | { status: 'error' };

export function BookingPage() {
  const [catalog, setCatalog] = useState<CatalogState>({ status: 'loading' });

  useEffect(() => {
    const request = new AbortController();
    void listEventTypes({ signal: request.signal, throwOnError: true }).then(
      ({ data }) => {
        if (!request.signal.aborted) {
          setCatalog({ status: 'loaded', eventTypes: data });
        }
      },
      () => {
        if (!request.signal.aborted) {
          setCatalog({ status: 'error' });
        }
      },
    );

    return () => request.abort();
  }, []);

  return (
    <>
      <h1>Страница записи</h1>
      {catalog.status === 'loading' && <p role="status">Загружаем типы встреч…</p>}
      {catalog.status === 'error' && <p role="alert">Не удалось загрузить типы встреч.</p>}
      {catalog.status === 'loaded' && <EventTypeCatalog eventTypes={catalog.eventTypes} />}
      <a className="back-link" href="/">На главную</a>
    </>
  );
}

export function EventTypeCatalog({ eventTypes }: { eventTypes: readonly EventType[] }) {
  if (eventTypes.length === 0) {
    return <p>Типов встреч пока нет.</p>;
  }

  return (
    <ul className="event-types" aria-label="Типы встреч">
      {eventTypes.map(({ id, title, description, durationMinutes }) => (
        <li key={id}>
          <h2>{title}</h2>
          <p>{description}</p>
          <span>{durationMinutes} мин</span>
        </li>
      ))}
    </ul>
  );
}
