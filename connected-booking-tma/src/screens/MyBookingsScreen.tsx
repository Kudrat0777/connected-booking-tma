import React, { useEffect, useMemo, useState } from 'react';
import type { Booking } from '../helpers/api';
import { fetchMyBookings, cancelBooking } from '../helpers/api';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import { Button } from '@telegram-apps/telegram-ui';
import { StatusBadge } from '../components/StatusBadge';
import {
  Icon20UserOutline,
  Icon20RecentOutline,
} from '@vkontakte/icons';
import '../css/MyBookingsScreen.css';
import { UpcomingEmptyState } from '../components/UpcomingEmptyState';

type Props = {
  telegramId: number;
  onBack: () => void;
  onGoToServices?: () => void;
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

type Segment = 'upcoming' | 'past';

export const MyBookingsScreen: React.FC<Props> = ({
  telegramId,
  onBack,
  onGoToServices,
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
      {/* Кастомный переключатель Предстоящие/Прошедшие */}
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
              <>
                {segment === 'upcoming' ? (
                  <UpcomingEmptyState onGoToServices={onGoToServices} />
                ) : (
                  <div style={{ padding: '8px 0' }}>
                    Нет прошедших записей.
                  </div>
                )}
              </>
            )}

          {/* ПРЕДСТОЯЩИЕ */}
          {segment === 'upcoming' &&
            currentList.map((b) => (
              <div key={b.id} className="mybookings-card">
                <div className="mybookings-card-header">
                  <div className="mybookings-card-title">
                    {b.service_name ||
                      b.slot.service?.name ||
                      'Услуга'}
                  </div>
                  <div className="mybookings-status-chip-wrapper">
                    <span
                      className={
                        'mybookings-status-chip ' +
                        `mybookings-status-chip_${b.status}`
                      }
                    >
                      <StatusBadge status={b.status} />
                    </span>
                  </div>
                </div>

                <div className="mybookings-row">
                  <span className="mybookings-row-icon">
                    <Icon20UserOutline />
                  </span>
                  <span className="mybookings-row-text">
                    {b.master_name ||
                      b.slot.service?.master_name ||
                      'Мастер не указан'}
                  </span>
                </div>

                <div className="mybookings-row">
                  <span className="mybookings-row-icon">
                    <Icon20RecentOutline />
                  </span>
                  <span className="mybookings-row-text">
                    {formatDateTime(b.slot.time)}
                  </span>
                </div>

                <Button
                  size="m"
                  mode="outline"
                  onClick={() => handleCancel(b)}
                  disabled={cancellingId === b.id}
                  style={{
                    width: '100%',
                    marginTop: 10,
                  }}
                >
                  {cancellingId === b.id
                    ? 'Отмена...'
                    : 'Отменить запись'}
                </Button>
              </div>
            ))}

          {/* ПРОШЕДШИЕ */}
          {segment === 'past' &&
            currentList.length > 0 &&
            currentList.map((b) => (
              <div key={b.id} className="mybookings-card">
                <div className="mybookings-card-header">
                  <div className="mybookings-card-title">
                    {b.service_name ||
                      b.slot.service?.name ||
                      'Услуга'}
                  </div>
                  <div className="mybookings-status-chip-wrapper">
                    <span
                      className={
                        'mybookings-status-chip ' +
                        `mybookings-status-chip_${b.status}`
                      }
                    >
                      <StatusBadge status={b.status} />
                    </span>
                  </div>
                </div>

                <div className="mybookings-row">
                  <span className="mybookings-row-icon">
                    <Icon20UserOutline />
                  </span>
                  <span className="mybookings-row-text">
                    {b.master_name ||
                      b.slot.service?.master_name ||
                      'Мастер не указан'}
                  </span>
                </div>

                <div className="mybookings-row">
                  <span className="mybookings-row-icon">
                    <Icon20RecentOutline />
                  </span>
                  <span className="mybookings-row-text">
                    {formatDateTime(b.slot.time)}
                  </span>
                </div>
              </div>
            ))}
        </SectionCard>
      )}
    </ScreenLayout>
  );
};