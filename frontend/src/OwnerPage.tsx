import { useState } from 'react';
import type { FormEvent } from 'react';
import { createEventType } from './api/generated/sdk.gen';
import { UpcomingBookings } from './UpcomingBookings';
import './owner.css';

type Submission =
  | { status: 'idle' | 'saving' | 'saved' }
  | { status: 'error'; message: string; duplicateId?: boolean };

export function OwnerPage() {
  return (
    <>
      <h1>Владелец календаря</h1>
      <EventTypeForm />
      <UpcomingBookings />
      <a className="back-link" href="/">На главную</a>
    </>
  );
}

function EventTypeForm() {
  const [submission, setSubmission] = useState<Submission>({ status: 'idle' });
  const saving = submission.status === 'saving';

  async function submitEventType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setSubmission({ status: 'saving' });

    const result = await createEventType({
      body: {
        id: String(fields.get('id')),
        title: String(fields.get('title')),
        description: String(fields.get('description')),
        durationMinutes: Number(fields.get('durationMinutes')),
      },
    }).catch(() => undefined);

    if (result?.data) {
      form.reset();
      setSubmission({ status: 'saved' });
    } else if (result?.error?.code === 'EVENT_TYPE_ID_TAKEN') {
      setSubmission({ status: 'error', message: result.error.message, duplicateId: true });
    } else if (result?.error?.code === 'INVALID_INPUT') {
      setSubmission({ status: 'error', message: result.error.message });
    } else {
      setSubmission({ status: 'error', message: 'Не удалось создать тип встречи. Попробуйте ещё раз.' });
    }
  }

  const duplicateId = submission.status === 'error' && submission.duplicateId;
  return (
    <form className="event-type-form" aria-labelledby="event-type-form-heading" onSubmit={submitEventType}>
      <h2 id="event-type-form-heading">Новый тип встречи</h2>
      <fieldset disabled={saving}>
        <label>
          ID
          <input
            name="id"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            aria-describedby={duplicateId ? 'event-type-id-hint event-type-error' : 'event-type-id-hint'}
            aria-invalid={duplicateId || undefined}
          />
        </label>
        <small id="event-type-id-hint">Строчные латинские буквы и цифры. Части можно разделять дефисом.</small>
        <label>
          Название
          <input name="title" required />
        </label>
        <label>
          Описание
          <textarea name="description" rows={3} required />
        </label>
        <label>
          Длительность (мин)
          <input name="durationMinutes" type="number" min={1} max={2_147_483_647} step={1} required />
        </label>
        <button className="primary-link" type="submit">{saving ? 'Сохраняем…' : 'Создать тип встречи'}</button>
      </fieldset>
      {submission.status === 'saved' && <p role="status">Тип встречи создан.</p>}
      {submission.status === 'error' && <p id="event-type-error" role="alert">{submission.message}</p>}
    </form>
  );
}
