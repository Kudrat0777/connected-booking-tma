// src/screens/ServicesScreen.tsx
import React, { useEffect, useState } from 'react';
import { Service, fetchServices } from '../helpers/api';

type Props = {
  onBack: () => void;
  onServiceSelected: (service: Service) => void;
};

export const ServicesScreen: React.FC<Props> = ({
  onBack,
  onServiceSelected,
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchServices();
        if (!cancelled) {
          setServices(data);
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setError('Не удалось загрузить услуги. Попробуй ещё раз позже.');
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
      <button
        onClick={onBack}
        style={{
          marginBottom: 12,
          padding: '4px 10px',
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        ← Назад
      </button>

      <h1>Услуги</h1>

      {loading && <p>Загрузка...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && services.length === 0 && (
        <p>Пока нет ни одной услуги.</p>
      )}

      {!loading && !error && services.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {services.map((s) => (
            <li key={s.id} style={{ marginBottom: 8 }}>
              <button
                onClick={() => onServiceSelected(s)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #444',
                  background: '#222',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                <strong>{s.name}</strong>
                {s.master_name && <> — мастер: {s.master_name}</>}
                <br />
                {s.duration && <span>Длительность: {s.duration} мин. </span>}
                {s.price != null && <span>Цена: {s.price} ₽</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};