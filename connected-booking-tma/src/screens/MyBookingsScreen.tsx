import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Button,
  SegmentedControl,
  Placeholder,
  Spinner,
  Banner,
} from '@telegram-apps/telegram-ui';
import {
  Icon28FavoriteOutline,
  Icon24CheckCircleOutline,
  Icon24ClockOutline,
  Icon24CancelOutline
} from '@vkontakte/icons';
import lottie from 'lottie-web';

import type { Booking } from '../helpers/api';
import { fetchMyBookings, cancelBooking } from '../helpers/api';
import { RateBookingModal } from '../components/RateBookingModal';

const LottieIcon: React.FC<{ src: string; size?: number }> = ({ src, size = 120 }) => {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const anim = lottie.loadAnimation({
      container: container.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: src,
    });
    return () => anim.destroy();
  }, [src]);
  return <div ref={container} style={{ width: size, height: size, margin: '0 auto 16px' }} />;
};

type Props = {
  telegramId: number;
  onBack: () => void;
  onGoToServices?: () => void;
  onReview?: (booking: Booking) => void;
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Segment = 'upcoming' | 'past';
type StatusFilter = 'all' | 'confirmed' | 'pending' | 'rejected';

export const MyBookingsScreen: React.FC<Props> = ({
  telegramId,
  onBack,
  onGoToServices,
  onReview
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);

  const [segment, setSegment] = useState<Segment>('upcoming');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMyBookings(telegramId);
      setBookings(data);
    } catch (e) {
      console.error(e);
      setError('Не удалось загрузить ваши записи.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
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
    up.sort((a, b) => new Date(a.slot.time).getTime() - new Date(b.slot.time).getTime());
    pa.sort((a, b) => new Date(b.slot.time).getTime() - new Date(a.slot.time).getTime());

    return { upcoming: up, past: pa };
  }, [bookings]);

  const displayedList = useMemo(() => {
      const baseList = segment === 'upcoming' ? upcoming : past;
      if (statusFilter === 'all') return baseList;
      return baseList.filter(b => b.status === statusFilter);
  }, [segment, upcoming, past, statusFilter]);

  const handleCancel = async (b: Booking) => {
    if (!window.confirm('Отменить эту запись?')) return;
    try {
      setCancellingId(b.id);
      await cancelBooking(b.id);
      await load();
    } catch (e: any) {
      alert('Не удалось отменить запись. Возможно, до начала осталось меньше 30 минут.');
    } finally {
      setCancellingId(null);
    }
  };

  const getBannerIcon = (status: string, isPast: boolean) => {
    if (isPast) return <Icon24ClockOutline style={{ color: 'var(--tg-theme-hint-color)' }} />;

    switch (status) {
      case 'confirmed':
        return <Icon24CheckCircleOutline style={{ color: '#34c759' }} />;
      case 'pending':
        return <Icon24ClockOutline style={{ color: '#ff9500' }} />;
      case 'rejected':
        return <Icon24CancelOutline style={{ color: '#ff3b30' }} />;
      default:
        return <Icon24ClockOutline style={{ color: 'var(--tg-theme-hint-color)' }} />;
    }
  };

  const getStatusText = (status: string) => {
      switch (status) {
          case 'confirmed': return 'Подтверждено';
          case 'pending': return 'Ожидание';
          case 'rejected': return 'Отменено';
          default: return 'Неизвестно';
      }
  };

  const triggerHaptic = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
  };

  return (
    <>
      <div style={{
          minHeight: '100%',
          backgroundColor: 'var(--tg-theme-bg-color)',
          display: 'flex',
          flexDirection: 'column'
      }}>

        {/* ШАПК�� С ФИЛЬТРАМИ (Убрали borderBottom!) */}
        <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backgroundColor: 'var(--tg-theme-bg-color)',
            padding: '16px 16px 8px'
            // Граница удалена, теперь фон абсолютно сплошной
        }}>
          <SegmentedControl size="m">
            <SegmentedControl.Item
              selected={segment === 'upcoming'}
              onClick={() => { triggerHaptic(); setSegment('upcoming'); setStatusFilter('all'); }}
            >
              Предстоящие
            </SegmentedControl.Item>
            <SegmentedControl.Item
              selected={segment === 'past'}
              onClick={() => { triggerHaptic(); setSegment('past'); setStatusFilter('all'); }}
            >
              Прошедшие
            </SegmentedControl.Item>
          </SegmentedControl>

          <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '16px',
              overflowX: 'auto',
              paddingBottom: '8px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
          }}>
              <Button size="s" mode={statusFilter === 'all' ? 'filled' : 'bezeled'} onClick={() => { triggerHaptic(); setStatusFilter('all'); }} style={{ flexShrink: 0, borderRadius: 100 }}>
                  Все
              </Button>
              <Button size="s" mode={statusFilter === 'confirmed' ? 'filled' : 'bezeled'} onClick={() => { triggerHaptic(); setStatusFilter('confirmed'); }} style={{ flexShrink: 0, borderRadius: 100 }}>
                  Подтверждено
              </Button>
              <Button size="s" mode={statusFilter === 'pending' ? 'filled' : 'bezeled'} onClick={() => { triggerHaptic(); setStatusFilter('pending'); }} style={{ flexShrink: 0, borderRadius: 100 }}>
                  Ожидание
              </Button>
              <Button size="s" mode={statusFilter === 'rejected' ? 'filled' : 'bezeled'} onClick={() => { triggerHaptic(); setStatusFilter('rejected'); }} style={{ flexShrink: 0, borderRadius: 100 }}>
                  Отменено
              </Button>
          </div>
        </div>

        {/* СПИСОК ЗАПИСЕЙ */}
        <div style={{ padding: '16px 16px 100px', flex: 1 }}>

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
              <Spinner size="l" />
            </div>
          )}

          {!loading && error && (
            <Placeholder header="Ошибка" description={error}>
                <Button size="m" mode="filled" onClick={load}>Повторить</Button>
            </Placeholder>
          )}

          {!loading && !error && displayedList.length === 0 && (
            <div style={{ marginTop: '20px' }}>
              <Placeholder
                header={statusFilter === 'all' ? 'Список пуст' : 'Ничего не найдено'}
                description={
                  statusFilter === 'all'
                    ? (segment === 'upcoming' ? 'У вас пока нет предстоящих записей' : 'История записей пуста')
                    : 'Записей с таким статусом нет'
                }
              >
                <LottieIcon
                  src={segment === 'upcoming' ? '/stickers/skeleton.json' : '/stickers/duck_out.json'}
                  size={140}
                />
              </Placeholder>
            </div>
          )}

          {!loading && !error && displayedList.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {displayedList.map((b) => {
                const serviceName = b.service_name || b.slot.service?.name || 'Услуга';
                const masterName = b.master_name || b.slot.service?.master_name || 'Мастер';
                const timeStr = formatDateTime(b.slot.time);
                const isPast = segment === 'past';

                return (
                  <Banner
                    key={b.id}
                    type="inline"
                    before={<div style={{ padding: '8px' }}>{getBannerIcon(b.status, isPast)}</div>}
                    header={serviceName}
                    subheader={timeStr}
                    description={`Мастер: ${masterName} • ${getStatusText(b.status)}`}
                    style={{
                      backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                      borderRadius: '12px'
                    }}
                  >
                    {segment === 'upcoming' && b.status !== 'rejected' && (
                       <Button
                         size="s"
                         mode="bezeled"
                         loading={cancellingId === b.id}
                         onClick={() => handleCancel(b)}
                       >
                         Отменить запись
                       </Button>
                    )}

                    {segment === 'past' && b.status === 'confirmed' && (
                       <Button
                         size="s"
                         mode="bezeled"
                         onClick={() => {
                             if (onReview) onReview(b);
                             setReviewBooking(b);
                         }}
                         before={<Icon28FavoriteOutline width={16} height={16} />}
                       >
                         Оценить мастера
                       </Button>
                    )}
                  </Banner>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <RateBookingModal
         booking={reviewBooking}
         telegramId={telegramId}
         onClose={() => setReviewBooking(null)}
         onSuccess={() => {
            setReviewBooking(null);
         }}
      />
    </>
  );
};