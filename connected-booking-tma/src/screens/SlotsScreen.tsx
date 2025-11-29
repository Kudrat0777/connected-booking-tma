// src/screens/SlotsScreen.tsx
import React, { useEffect, useState } from 'react';
import type { Service, Slot } from '../helpers/api';
import { fetchSlotsForService } from '../helpers/api';

type Props = {
  service: Service;
  onBack: () => void;
  onSlotSelected: (slot: Slot) => void;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  });
  const time = d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${day} ${time}`;
}

export const SlotsScreen: React.FC<Props> = ({
  service,
  onBack,
  onSlotSelected,
}) => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchSlotsForService(service.id);
        if (!cancelled) {
          setSlots(data.filter((s) => !s.is_booked));
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setError('Не удалось загрузить слоты. Попробуй ещё раз позже.');
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
  }, [service.id]);

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
        ← Назад к услугам
      </button>

      <h2>{service.name}</h2>
      {service.master_name && <p>Мастер: {service.master_name}</p>}
      {service.duration && <p>Длительность: {service.duration} мин.</p>}
      {service.price != null && <p>Цена: {service.price} ₽</p>}

      <h3 style={{ marginTop: 16 }}>Свободные слоты</h3>

      {loading && <p>Загрузка...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && slots.length === 0 && (
        <p>Пока нет доступных слотов для этой услуги.</p>
      )}

      {!loading && !error && slots.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {slots.map((slot) => (
          <li key={slot.id} style={{ marginBottom: 8 }}>
            <button
              onClick={() => {
                console.log('КЛИК ПО СЛОТУ В SlotsScreen', slot);
                onSlotSelected(slot);
              }}
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
              {formatTime(slot.time)}
            </button>
          </li>
        ))}
        </ul>
      )}
    </div>
  );
};