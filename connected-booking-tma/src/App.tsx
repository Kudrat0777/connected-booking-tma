import React, { useEffect, useState } from 'react';
import { initData, retrieveLaunchParams } from '@tma.js/sdk-react';

type PingResponse = {
  status: string;
  message: string;
};

function App() {
  const [initDataJson, setInitDataJson] = useState<string>('{}');
  const [launchParamsJson, setLaunchParamsJson] = useState<string>('{}');

  const [pingLoading, setPingLoading] = useState(false);
  const [pingError, setPingError] = useState<string | null>(null);
  const [pingData, setPingData] = useState<PingResponse | null>(null);

  useEffect(() => {
    const initState = initData.state();
    const launchParams = retrieveLaunchParams();

    setInitDataJson(JSON.stringify(initState, null, 2));
    setLaunchParamsJson(JSON.stringify(launchParams, null, 2));
  }, []);

  async function handlePingBackend() {
    try {
      setPingLoading(true);
      setPingError(null);
      setPingData(null);

      const response = await fetch('http://127.0.0.1:8000/api/services/');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: PingResponse = await response.json();
      setPingData(data);
    } catch (error: any) {
      setPingError(error.message || 'Неизвестная ошибка');
    } finally {
      setPingLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#e5e7eb',
        padding: '16px',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif',
      }}
    >
      <h1 style={{ fontSize: '24px', marginBottom: '12px' }}>
        Connected Booking · Telegram Mini App
      </h1>

      <p style={{ marginBottom: '16px' }}>
        Ниже показываем данные, которые Telegram передаёт Mini App при запуске.
        В обычном браузере многие поля будут пустыми — это нормально.
        В Telegram они заполнятся.
      </p>

      {/* Кнопка проверки соединения с Django */}
      <div
        style={{
          marginBottom: '24px',
          padding: '12px',
          backgroundColor: '#020617',
          borderRadius: '8px',
        }}
      >
        <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>
          Проверка соединения с Django‑бэкендом
        </h2>

        <button
          onClick={handlePingBackend}
          disabled={pingLoading}
          style={{
            padding: '8px 16px',
            borderRadius: '9999px',
            border: 'none',
            cursor: pingLoading ? 'default' : 'pointer',
            backgroundColor: '#3b82f6',
            color: 'white',
            fontWeight: 500,
            fontSize: '14px',
          }}
        >
          {pingLoading ? 'Отправляем запрос...' : 'Проверить /api/services/'}
        </button>

        <div style={{ marginTop: '12px', fontSize: '14px' }}>
          {pingError && (
            <div style={{ color: '#f97373' }}>
              Ошибка при запросе: {pingError}
            </div>
          )}

          {pingData && (
            <pre
              style={{
                backgroundColor: '#020617',
                padding: '8px',
                borderRadius: '8px',
                fontSize: '12px',
                marginTop: '8px',
              }}
            >
              {JSON.stringify(pingData, null, 2)}
            </pre>
          )}

          {!pingError && !pingData && !pingLoading && (
            <div style={{ opacity: 0.7 }}>
              Нажми кнопку, чтобы отправить запрос на
              {' '}
              <code>http://127.0.0.1:8000/api/services/</code>.
            </div>
          )}
        </div>
      </div>

      <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Init Data (state)</h2>
      <pre
        style={{
          backgroundColor: '#020617',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '12px',
          overflowX: 'auto',
          marginBottom: '16px',
        }}
      >
        {initDataJson}
      </pre>

      <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Launch Parameters</h2>
      <pre
        style={{
          backgroundColor: '#020617',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '12px',
          overflowX: 'auto',
          marginBottom: '16px',
        }}
      >
        {launchParamsJson}
      </pre>

      <p style={{ fontSize: '14px', opacity: 0.8 }}>
        Позже мы будем использовать эти данные, чтобы авторизовать пользователя
        на Django‑бэкенде.
      </p>
    </div>
  );
}

export default App;