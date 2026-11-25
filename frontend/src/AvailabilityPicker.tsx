import { useEffect, useState } from 'react';
import { listSlots } from './api/generated/sdk.gen';
import type { AvailabilityCalendar, EventType } from './api/generated/types.gen';
import './availability.css';

type AvailabilityState =
  | { status: 'loading' }
  | { status: 'loaded'; calendar: AvailabilityCalendar }
  | { status: 'error' };

export function AvailabilityPicker({ eventType }: { eventType: EventType }) {
  const [availability, setAvailability] = useState<AvailabilityState>({ status: 'loading' });
  const [selectedDate, setSelectedDate] = useState<string>();
  const [selectedStart, setSelectedStart] = useState<string>();

  useEffect(() => {
    const request = new AbortController();
    void listSlots({
      path: { id: eventType.id },
      signal: request.signal,
      throwOnError: true,
    }).then(
      ({ data }) => {
        if (!request.signal.aborted) {
          setAvailability({ status: 'loaded', calendar: data });
        }
      },
      () => {
        if (!request.signal.aborted) {
          setAvailability({ status: 'error' });
        }
      },
    );

    return () => request.abort();
  }, [eventType.id]);

  if (availability.status === 'loading') {
    return <p role="status">Загружаем свободное время…</p>;
  }
  if (availability.status === 'error') {
    return <p role="alert">Не удалось загрузить свободное время.</p>;
  }

  const { timezone, days } = availability.calendar;
  const day = days.find(({ date }) => date === selectedDate);
  const formatDate = new Intl.DateTimeFormat('ru-RU', {
    timeZone: timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const formatTime = new Intl.DateTimeFormat('ru-RU', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  return (
    <section className="availability" aria-labelledby="availability-title">
      <h2 id="availability-title">Свободное время</h2>
      <p>Часовой пояс: {timezone}</p>
      <div className="availability-dates" role="group" aria-label="Даты">
        {days.map(({ date, slots }) => (
          <button
            key={date}
            className="availability-choice"
            type="button"
            aria-pressed={date === selectedDate}
            disabled={slots.length === 0}
            onClick={() => {
              setSelectedDate(date);
              setSelectedStart(undefined);
            }}
          >
            <time dateTime={date}>{formatDate.format(new Date(`${date}T12:00:00Z`))}</time>
          </button>
        ))}
      </div>
      {days.every(({ slots }) => slots.length === 0) && <p>В ближайшие 14 дней свободных слотов нет.</p>}
      {day && (
        <div className="availability-times" role="group" aria-label="Доступное время">
          {day.slots.map(({ startAt }) => (
            <button
              key={startAt}
              className="availability-choice"
              type="button"
              aria-pressed={startAt === selectedStart}
              onClick={() => setSelectedStart(startAt)}
            >
              <time dateTime={startAt}>{formatTime.format(new Date(startAt))}</time>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
