// src/screens/MyBookingsScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import type { Booking } from '../helpers/api';
import { fetchMyBookings, cancelBooking } from '../helpers/api';

type Props = {
  telegramId: number;
  onBack: () => void;
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: Booking['status']): string {
  if (status === 'pending') return 'Ожидает подтверждения';
  if (status === 'confirmed') return 'Подтверждена';
  if (status === 'rejected') return 'Отклонена';
  return status;
}

export const MyBookingsScreen: React.FC<Props> = ({
  telegramId,
  onBack,
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMyBookings(telegramId);
      setBookings(data);
    } catch (e) {
      console.error(e);
      setError('Не удалось загрузить ваши записи. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchMyBookings(telegramId);
        if (!cancelled) {
          setBookings(data);
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setError(
            'Не удалось загрузить ваши записи. Попробуйте позже.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [telegramId]);

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const up: Booking[] = [];
    const pa: Booking[] = [];

    bookings.forEach((b) => {
      const t = new Date(b.slot.time);
      if (t.getTime() >= now.getTime()) up.push(b);
      else pa.push(b);
    });

    return { upcoming: up, past: pa };
  }, [bookings]);

  const handleCancel = async (b: Booking) => {
    if (!confirm('Отменить эту запись?')) return;

    try {
      setCancellingId(b.id);
      setError(null);
      await cancelBooking(b.id);
      // перезагружаем список после отмены
      await load();
    } catch (e: any) {
      console.error(e);
      // пробуем вытащить текст ошибки с бэка (например, про 30 минут)
      const msg =
        e?.message?.includes('Нельзя отменить позже')
          ? 'Нельзя отменить позже, чем за 30 минут до записи.'
          : 'Не удалось отменить запись. Попробуйте позже.';
      setError(msg);
    } finally {
      setCancellingId(null);
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
      >
        ← Назад
      </button>

      <h2>Мои записи</h2>

      {loading && <p>Загрузка...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && bookings.length === 0 && (
        <p>Пока нет ни одной записи.</p>
      )}

      {!loading && !error && bookings.length > 0 && (
        <>
          {upcoming.length > 0 && (
            <>
              <h3 style={{ marginTop: 16 }}>Предстоящие</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {upcoming.map((b) => (
                  <li
                    key={b.id}
                    style={{
                      marginBottom: 8,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #444',
                      background: '#111',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      {b.service_name ||
                        b.slot.service?.name ||
                        'Услуга'}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.8 }}>
                      Мастер:{' '}
                      {b.master_name ||
                        b.slot.service?.master_name ||
                        '—'}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      Время: {formatDateTime(b.slot.time)}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 13,
                        opacity: 0.8,
                      }}
                    >
                      Статус: {statusLabel(b.status)}
                    </div>

                    <button
                      onClick={() => handleCancel(b)}
                      disabled={cancellingId === b.id}
                      style={{
                        marginTop: 8,
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: 'none',
                        cursor:
                          cancellingId === b.id ? 'default' : 'pointer',
                        background:
                          cancellingId === b.id ? '#555' : '#b3261e',
                        color: '#fff',
                        fontSize: 13,
                      }}
                    >
                      {cancellingId === b.id
                        ? 'Отмена...'
                        : 'Отменить'}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {past.length > 0 && (
            <>
              <h3 style={{ marginTop: 16 }}>Прошедшие</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {past.map((b) => (
                  <li
                    key={b.id}
                    style={{
                      marginBottom: 8,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #333',
                      background: '#080808',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      {b.service_name ||
                        b.slot.service?.name ||
                        'Услуга'}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.8 }}>
                      Мастер:{' '}
                      {b.master_name ||
                        b.slot.service?.master_name ||
                        '—'}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      Время: {formatDateTime(b.slot.time)}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 13,
                        opacity: 0.8,
                      }}
                    >
                      Статус: {statusLabel(b.status)}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
};