import React, { useEffect, useMemo, useState } from 'react';
import type { Booking } from '../helpers/api';
import { fetchMyBookings, cancelBooking } from '../helpers/api';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import { ListItem } from '../components/ListItem';
import { Button } from '@telegram-apps/telegram-ui';
import { StatusBadge } from '../components/StatusBadge';
import '../css/MyBookingsScreen.css';

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

type Segment = 'upcoming' | 'past';

export const MyBookingsScreen: React.FC<Props> = ({
  telegramId,
  onBack,
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(
    null,
  );
  const [segment, setSegment] = useState<Segment>('upcoming');

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
      await load();
    } catch (e: any) {
      console.error(e);
      const msg =
        e?.message?.includes('Нельзя отменить позже')
          ? 'Нельзя отменить позже, чем за 30 минут до записи.'
          : 'Не удалось отменить запись. Попробуйте позже.';
      setError(msg);
    } finally {
      setCancellingId(null);
    }
  };

  const currentList = segment === 'upcoming' ? upcoming : past;
  const currentHeader =
    segment === 'upcoming' ? 'Предстоящие' : 'Прошедшие';

  return (
    <ScreenLayout title="Мои записи" onBack={onBack}>
      {/* Кастомный SegmentedControl-свитч */}
      <div className="mybookings-segment-root">
        <button
          type="button"
          className={
            'mybookings-segment-item' +
            (segment === 'upcoming'
              ? ' mybookings-segment-item_active'
              : '')
          }
          onClick={() => setSegment('upcoming')}
        >
          Предстоящие
        </button>
        <button
          type="button"
          className={
            'mybookings-segment-item' +
            (segment === 'past'
              ? ' mybookings-segment-item_active'
              : '')
          }
          onClick={() => setSegment('past')}
        >
          Прошедшие
        </button>
      </div>

      {loading && <div>Загрузка...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      {!loading && !error && bookings.length === 0 && (
        <div>Пока нет ни одной записи.</div>
      )}

      {!loading && !error && bookings.length > 0 && (
        <SectionCard header={currentHeader}>
          {currentList.length === 0 && (
            <div style={{ padding: '8px 0' }}>
              {segment === 'upcoming'
                ? 'Нет предстоящих записей.'
                : 'Нет прошедших записей.'}
            </div>
          )}

          {segment === 'upcoming' &&
            currentList.map((b) => (
              <div
                key={b.id}
                style={{
                  marginBottom: 8,
                  paddingBottom: 8,
                  borderBottom:
                    '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <ListItem
                  title={
                    b.service_name ||
                    b.slot.service?.name ||
                    'Услуга'
                  }
                  subtitle={
                    <>
                      <div>
                        Мастер:{' '}
                        {b.master_name ||
                          b.slot.service?.master_name ||
                          '—'}
                      </div>
                      <div>
                        Время: {formatDateTime(b.slot.time)}</div>
                      <div style={{ marginTop: 4 }}>
                        <StatusBadge status={b.status} />
                      </div>
                    </>
                  }
                />
                <Button
                  size="m"
                  mode="outline"
                  onClick={() => handleCancel(b)}
                  disabled={cancellingId === b.id}
                  style={{
                    width: '100%',
                    marginTop: 4,
                  }}
                >
                  {cancellingId === b.id
                    ? 'Отмена...'
                    : 'Отменить запись'}
                </Button>
              </div>
            ))}

          {segment === 'past' &&
            currentList.map((b) => (
              <div
                key={b.id}
                style={{
                  marginBottom: 8,
                  paddingBottom: 8,
                  borderBottom:
                    '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <ListItem
                  title={
                    b.service_name ||
                    b.slot.service?.name ||
                    'Услуга'
                  }
                  subtitle={
                    <>
                      <div>
                        Мастер:{' '}
                        {b.master_name ||
                          b.slot.service?.master_name ||
                          '—'}
                      </div>
                      <div>
                        Время: {formatDateTime(b.slot.time)}</div>
                      <div style={{ marginTop: 4 }}>
                        <StatusBadge status={b.status} />
                      </div>
                    </>
                  }
                />
              </div>
            ))}
        </SectionCard>
      )}
    </ScreenLayout>
  );
};