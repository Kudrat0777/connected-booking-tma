// src/screens/ServicesScreen.tsx
import React, { useEffect, useState } from 'react';
import { Service, fetchServices } from '../helpers/api';

type Props = {
  onBack: () => void;
};

export const ServicesScreen: React.FC<Props> = ({ onBack }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchServices(); // пока без фильтра по мастеру
        if (!cancelled) {
          setServices(data);
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setError('Не удалось загрузить услуги. Попробуй еще раз позже.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Услуги</h1>

      {loading && <p>Загрузка...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && services.length === 0 && (
        <p>Пока нет ни одной услуги.</p>
      )}

      {!loading && !error && services.length > 0 && (
        <ul>
          {services.map((s) => (
            <li key={s.id} style={{ marginBottom: 8 }}>
              <strong>{s.name}</strong>
              {s.master_name && <> — мастер: {s.master_name}</>}
              <br />
              {s.duration && <span>Длительность: {s.duration} мин. </span>}
              {s.price != null && <span>Цена: {s.price} ₽</span>}
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={onBack}
        style={{
          marginTop: 12,
          padding: '8px 16px',
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Назад
      </button>
    </div>
  );
};