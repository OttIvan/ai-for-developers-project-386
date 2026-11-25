import { useEffect, useState } from 'react';
import { listEventTypes } from './api/generated/sdk.gen';
import type { EventType } from './api/generated/types.gen';
import { AvailabilityPicker } from './AvailabilityPicker';

type CatalogState =
  | { status: 'loading' }
  | { status: 'loaded'; eventTypes: EventType[] }
  | { status: 'error' };

export function BookingPage() {
  const [catalog, setCatalog] = useState<CatalogState>({ status: 'loading' });
  const [eventType, setEventType] = useState<EventType>();

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
      {catalog.status === 'loaded' && (
        <EventTypeCatalog eventTypes={catalog.eventTypes} selectedId={eventType?.id} onSelect={setEventType} />
      )}
      {eventType && <AvailabilityPicker key={eventType.id} eventType={eventType} />}
      <a className="back-link" href="/">На главную</a>
    </>
  );
}

export function EventTypeCatalog({ eventTypes, selectedId, onSelect }: {
  eventTypes: readonly EventType[];
  selectedId?: string;
  onSelect?: (eventType: EventType) => void;
}) {
  if (eventTypes.length === 0) {
    return <p>Типов встреч пока нет.</p>;
  }

  return (
    <ul className="event-types" aria-label="Типы встреч">
      {eventTypes.map((eventType) => (
        <li key={eventType.id}>
          <h2>{eventType.title}</h2>
          <p>{eventType.description}</p>
          <span>{eventType.durationMinutes} мин</span>
          {onSelect && (
            <button
              className="availability-choice event-type-choice"
              type="button"
              aria-label={`Выбрать время: ${eventType.title}`}
              aria-pressed={selectedId === eventType.id}
              onClick={() => onSelect(eventType)}
            >
              Выбрать время
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
