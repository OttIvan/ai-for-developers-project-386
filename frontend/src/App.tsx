export function App({ pathname }: { pathname: string }) {
  const isBookingPage = pathname === '/book' || pathname === '/book/';

  return (
    <div className="page">
      <header className="site-header">
        <span className="calendar-mark" aria-hidden="true" />
        <span>Календарь звонков</span>
      </header>
      <main className="page-content">
        {isBookingPage ? (
          <>
            <h1>Страница записи</h1>
            <p>Запись пока недоступна.</p>
            <a className="back-link" href="/">На главную</a>
          </>
        ) : (
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
