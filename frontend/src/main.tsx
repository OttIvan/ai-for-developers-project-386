import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getHealth } from './api/generated/sdk.gen';
import './styles.css';

function App() {
  const [status, setStatus] = useState('Проверяем подключение к API…');

  useEffect(() => {
    const controller = new AbortController();

    async function checkHealth() {
      try {
        const { data } = await getHealth({ signal: controller.signal });

        if (!controller.signal.aborted) {
          setStatus(data?.status === 'ok' ? 'API доступно' : 'API недоступно');
        }
      } catch {
        if (!controller.signal.aborted) {
          setStatus('API недоступно');
        }
      }
    }

    void checkHealth();
    return () => controller.abort();
  }, []);

  return (
    <main>
      <h1>Календарь звонков</h1>
      <p role="status">{status}</p>
    </main>
  );
}

const root = document.getElementById('root');

if (!root) {
  throw new Error('Missing application root');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
