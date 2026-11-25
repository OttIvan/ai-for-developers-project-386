import { useEffect, useState } from 'react';
import { listUpcomingBookings } from './api/generated/sdk.gen';
import type { Booking } from './api/generated/types.gen';

type BookingsState =
  | { status: 'loading' }
  | { status: 'loaded'; bookings: Booking[] }
  | { status: 'error' };

const timeZone = 'Asia/Tbilisi';
const formatDate = new Intl.DateTimeFormat('ru-RU', { timeZone, dateStyle: 'long' });
const formatTime = new Intl.DateTimeFormat('ru-RU', {
  timeZone,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function UpcomingBookings() {
  const [state, setState] = useState<BookingsState>({ status: 'loading' });

  useEffect(() => {
    const request = new AbortController();
    void listUpcomingBookings({ signal: request.signal, throwOnError: true }).then(
      ({ data }) => {
        if (!request.signal.aborted) {
          setState({ status: 'loaded', bookings: data });
        }
      },
      () => {
        if (!request.signal.aborted) {
          setState({ status: 'error' });
        }
      },
    );

    return () => request.abort();
  }, []);

  return (
    <section className="upcoming-bookings" aria-labelledby="upcoming-bookings-heading">
      <h2 id="upcoming-bookings-heading">Предстоящие записи</h2>
      {state.status === 'loading' && <p role="status">Загружаем предстоящие записи…</p>}
      {state.status === 'error' && <p role="alert">Не удалось загрузить предстоящие записи.</p>}
      {state.status === 'loaded' && (state.bookings.length === 0 ? (
        <p>Предстоящих записей пока нет.</p>
      ) : (
        <>
          <p>Часовой пояс: {timeZone}</p>
          <ul role="list">
            {state.bookings.map((booking) => (
              <li key={booking.id}>
                <time dateTime={booking.startAt}>{formatDate.format(new Date(booking.startAt))}</time>
                <span>
                  <time dateTime={booking.startAt}>{formatTime.format(new Date(booking.startAt))}</time>
                  {'–'}
                  <time dateTime={booking.endAt}>{formatTime.format(new Date(booking.endAt))}</time>
                </span>
                <strong>{booking.eventTypeTitle}</strong>
                <span>{booking.guestName}</span>
              </li>
            ))}
          </ul>
        </>
      ))}
    </section>
  );
}
