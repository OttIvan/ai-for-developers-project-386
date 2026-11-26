import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createBooking, listSlots } from './api/generated/sdk.gen';
import type { AvailabilityCalendar, Booking, EventType } from './api/generated/types.gen';
import './availability.css';

type AvailabilityState =
  | { status: 'loading' }
  | { status: 'loaded'; calendar: AvailabilityCalendar }
  | { status: 'error' };

type Submission =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'saved'; booking: Booking };

const calendarTimezone: AvailabilityCalendar['timezone'] = 'Asia/Tbilisi';
const calendarClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: calendarTimezone,
  timeStyle: 'medium',
  hourCycle: 'h23',
});

export function AvailabilityPicker({ eventType, saving, setSaving }: {
  eventType: EventType;
  saving: boolean;
  setSaving: (saving: boolean) => void;
}) {
  const [availability, setAvailability] = useState<AvailabilityState>({ status: 'loading' });
  const [selectedDate, setSelectedDate] = useState<string>();
  const [selectedStart, setSelectedStart] = useState<string>();
  const [guestName, setGuestName] = useState('');
  const [submission, setSubmission] = useState<Submission>({ status: 'idle' });
  const [availabilityRevision, setAvailabilityRevision] = useState(0);

  const refreshAvailability = useCallback(() => {
    setAvailability({ status: 'loading' });
    setAvailabilityRevision((revision) => revision + 1);
  }, []);

  const saved = submission.status === 'saved';
  useEffect(() => {
    if (saved) {
      return;
    }

    const now = new Date();
    const [hours, minutes, seconds] = calendarClock.format(now).split(':').map(Number);
    const delay = (86_400 - (hours * 3_600 + minutes * 60 + seconds)) * 1_000 - now.getMilliseconds();
    const midnight = now.getTime() + delay;
    const timer = window.setTimeout(refreshAvailability, delay);
    function refreshOnReturn() {
      if (!document.hidden && Date.now() >= midnight) {
        window.clearTimeout(timer);
        refreshAvailability();
      }
    }
    document.addEventListener('visibilitychange', refreshOnReturn);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', refreshOnReturn);
    };
  }, [availabilityRevision, refreshAvailability, saved]);

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
          setSelectedDate((date) => data.days.some((day) => day.date === date) ? date : undefined);
          setSelectedStart((start) => data.days.some((day) =>
            day.slots.some(({ startAt }) => startAt === start),
          ) ? start : undefined);
        }
      },
      () => {
        if (!request.signal.aborted) {
          setAvailability({ status: 'error' });
        }
      },
    );

    return () => request.abort();
  }, [eventType.id, availabilityRevision]);

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStart || !guestName.trim() || saving) {
      return;
    }

    setSubmission({ status: 'idle' });
    setSaving(true);
    try {
      const result = await createBooking({
        body: { eventTypeId: eventType.id, startAt: selectedStart, guestName },
      }).catch(() => undefined);

      if (result?.data) {
        setSubmission({ status: 'saved', booking: result.data });
        return;
      }

      if (result?.error?.code === 'SLOT_TAKEN' || result?.error?.code === 'INVALID_INPUT') {
        setSelectedStart(undefined);
        refreshAvailability();
      }
      setSubmission({
        status: 'error',
        message: result?.error?.message ?? 'Не удалось записаться. Попробуйте ещё раз.',
      });
    } finally {
      setSaving(false);
    }
  }

  const timezone = availability.status === 'loaded' ? availability.calendar.timezone : calendarTimezone;
  const formatTime = new Intl.DateTimeFormat('ru-RU', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  if (submission.status === 'saved') {
    const { booking } = submission;
    const date = new Intl.DateTimeFormat('ru-RU', { timeZone: timezone, dateStyle: 'long' });
    return (
      <section className="availability" aria-labelledby="booking-confirmation-title">
        <h2 id="booking-confirmation-title">Запись подтверждена</h2>
        <p role="status">
          {booking.eventTypeTitle}, {date.format(new Date(booking.startAt))},{' '}
          {formatTime.format(new Date(booking.startAt))}–{formatTime.format(new Date(booking.endAt))} ({timezone})
        </p>
      </section>
    );
  }

  const feedback = submission.status === 'error' && <p role="alert">{submission.message}</p>;

  if (availability.status === 'loading') {
    return (
      <>
        {feedback}
        <p role="status">Загружаем свободное время…</p>
      </>
    );
  }
  if (availability.status === 'error') {
    return (
      <>
        {feedback}
        <p role="alert">Не удалось загрузить свободное время.</p>
        <button className="availability-choice" type="button" onClick={refreshAvailability}>Обновить</button>
      </>
    );
  }

  const { days } = availability.calendar;
  const day = days.find(({ date }) => date === selectedDate);
  const formatDate = new Intl.DateTimeFormat('ru-RU', {
    timeZone: timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
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
            disabled={saving || slots.length === 0}
            onClick={() => {
              setSelectedDate(date);
              setSelectedStart(undefined);
              setSubmission({ status: 'idle' });
            }}
          >
            <time dateTime={date}>{formatDate.format(new Date(`${date}T12:00:00Z`))}</time>
          </button>
        ))}
      </div>
      {days.every(({ slots }) => slots.length === 0) && <p>В ближайшие 14 дней свободных слотов нет.</p>}
      {day && day.slots.length > 0 && (
        <div className="availability-times" role="group" aria-label="Доступное время">
          {day.slots.map(({ startAt }) => (
            <button
              key={startAt}
              className="availability-choice"
              type="button"
              aria-pressed={startAt === selectedStart}
              disabled={saving}
              onClick={() => {
                setSelectedStart(startAt);
                setSubmission({ status: 'idle' });
              }}
            >
              <time dateTime={startAt}>{formatTime.format(new Date(startAt))}</time>
            </button>
          ))}
        </div>
      )}
      {selectedDate && !day?.slots.length && <p>На выбранную дату свободных слотов нет.</p>}
      {(selectedDate || guestName) && (
        <form className="booking-form" onSubmit={submitBooking}>
          <label>
            Ваше имя
            <input
              name="guestName"
              autoComplete="name"
              required
              value={guestName}
              disabled={saving}
              onChange={(event) => setGuestName(event.target.value)}
            />
          </label>
          <button className="availability-choice" type="submit" disabled={saving || !selectedStart || !guestName.trim()}>
            {saving ? 'Записываем…' : 'Записаться'}
          </button>
        </form>
      )}
      {feedback}
    </section>
  );
}
