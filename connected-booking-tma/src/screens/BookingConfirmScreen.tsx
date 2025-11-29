// src/screens/BookingConfirmScreen.tsx
import React, { useState } from 'react';
import type { Service, Slot, Booking } from '../helpers/api';
import { createBooking } from '../helpers/api';

type TelegramUser = {
  id: number;
  username?: string;
  photo_url?: string;
  first_name?: string;
  last_name?: string;
};

type Props = {
  service: Service;
  slot: Slot;
  onBack: () => void;
  onSuccess: (booking: Booking) => void;
  user: TelegramUser | null;
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

export const BookingConfirmScreen: React.FC<Props> = ({
  service,
  slot,
  onBack,
  onSuccess,
  user,
}) => {
    const defaultName =
      user?.first_name ||
      user?.username ||
      [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
      (user?.username ? user.username : '');
    const [name, setName] = useState(defaultName);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Пожалуйста, укажи своё имя.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const booking = await createBooking({
        name: name.trim(),
        slot_id: slot.id,
        telegram_id: user?.id ?? null,
        username: user?.username ?? null,
        photo_url: user?.photo_url ?? null,

      });
  console.log('BookingConfirmScreen user:', user);
    console.log('BookingConfirmScreen defaultName:', defaultName);

      onSuccess(booking);
    } catch (err) {
      console.error(err);
      setError('Не удалось создать бронь. Попробуй ещё раз позже.');
    } finally {
      setSubmitting(false);
    }
  };

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
        disabled={submitting}
      >
        ← Назад к слотам
      </button>

      <h2>Подтверждение записи</h2>

      <p>
        <strong>Услуга:</strong> {service.name}
      </p>
      {service.master_name && (
        <p>
          <strong>Мастер:</strong> {service.master_name}
        </p>
      )}
      <p>
        <strong>Время:</strong> {formatTime(slot.time)}
      </p>
      {service.duration && (
        <p>
          <strong>Длительность:</strong> {service.duration} мин.
        </p>
      )}
      {service.price != null && (
        <p>
          <strong>Цена:</strong> {service.price} ₽
        </p>
      )}

      <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Имя:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 4,
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid #444',
              background: '#111',
              color: '#fff',
            }}
            placeholder="Как к тебе обращаться?"
          />
        </label>

        {user?.username && (
          <p style={{ fontSize: 12, opacity: 0.7 }}>
            Telegram: @{user.username}
          </p>
        )}

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: 12,
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            cursor: submitting ? 'default' : 'pointer',
            background: submitting ? '#555' : '#2ea44f',
            color: '#fff',
          }}
        >
          {submitting ? 'Создаём бронь...' : 'Записаться'}
        </button>
      </form>
    </div>
  );
};