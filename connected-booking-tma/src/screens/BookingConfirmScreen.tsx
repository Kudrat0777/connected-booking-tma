import React, { useState } from 'react';
import type { Service, Slot, Booking } from '../helpers/api';
import { createBooking } from '../helpers/api';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import { Button } from '@telegram-apps/telegram-ui';

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
  return `${day} • ${time}`;
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
    '';

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

      onSuccess(booking);
    } catch (err) {
      console.error(err);
      setError('Не удалось создать бронь. Попробуйте позже.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenLayout title="Подтверждение записи" onBack={onBack}>
      <SectionCard header="Детали записи">
        <div style={{ marginBottom: 4 }}>
          <strong>Услуга:</strong> {service.name}
        </div>
        {service.master_name && (
          <div style={{ marginBottom: 4 }}>
            <strong>Мастер:</strong> {service.master_name}
          </div>
        )}
        <div style={{ marginBottom: 4 }}>
          <strong>Время:</strong> {formatTime(slot.time)}
        </div>
        {service.duration && (
          <div style={{ marginBottom: 4 }}>
            <strong>Длительность:</strong> {service.duration} мин.
          </div>
        )}
        {service.price != null && (
          <div>
            <strong>Цена:</strong> {service.price} ₽
          </div>
        )}
      </SectionCard>

      <SectionCard header="Данные клиента">
        <form onSubmit={handleSubmit}>
          <label
            style={{
              display: 'block',
              marginBottom: 10,
              fontSize: 14,
            }}
          >
            Имя:
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Как к тебе обращаться?"
              style={{
                display: 'block',
                width: '100%',
                marginTop: 4,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent',
                color: 'inherit',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </label>

          {user?.username && (
            <div
              style={{
                fontSize: 12,
                opacity: 0.7,
                marginBottom: 8,
              }}
            >
              Telegram: @{user.username}
            </div>
          )}

          {error && (
            <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>
          )}

          <Button
            size="l"
            mode="bezeled"
            type="submit"
            disabled={submitting}
            style={{ width: '100%', marginTop: 4 }}
          >
            {submitting ? 'Создаём бронь...' : 'Записаться'}
          </Button>
        </form>
      </SectionCard>
    </ScreenLayout>
  );
};