import { BookingPage } from './BookingPage';
import { OwnerPage } from './OwnerPage';

export function App({ pathname }: { pathname: string }) {
  const isBookingPage = pathname === '/book' || pathname === '/book/';
  const isOwnerPage = pathname === '/owner' || pathname === '/owner/';

  return (
    <div className="page">
      <header className="site-header">
        <span className="calendar-mark" aria-hidden="true" />
        <span>Календарь звонков</span>
        <a className="back-link owner-link" href="/owner">Страница владельца</a>
      </header>
      <main className="page-content">
        {isBookingPage && <BookingPage />}
        {isOwnerPage && <OwnerPage />}
        {!isBookingPage && !isOwnerPage && (
          <>
            <h1>Запишитесь на звонок</h1>
            <p>Выберите тип встречи и удобное время. Для записи не нужен аккаунт.</p>
            <a className="primary-link" href="/book">Записаться на звонок</a>
          </>
        )}
      </main>
    </div>
  );
}
