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

import '../css/MyBookings.css';

const LottieIcon: React.FC<{ src: string; size?: number }> = ({ src, size = 120 }) => {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    try {
      const anim = lottie.loadAnimation({
        container: container.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: src,
      });
      return () => anim.destroy();
    } catch (e) { console.error(e); }
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
    if (isPast) {
      return (
        <div className="banner-status-icon past">
          <Icon24ClockOutline />
        </div>
      );
    }

    switch (status) {
      case 'confirmed':
        return (
          <div className="banner-status-icon confirmed">
            <Icon24CheckCircleOutline />
          </div>
        );
      case 'pending':
        return (
          <div className="banner-status-icon pending">
            <Icon24ClockOutline />
          </div>
        );
      case 'rejected':
        return (
          <div className="banner-status-icon rejected">
            <Icon24CancelOutline />
          </div>
        );
      default:
        return (
          <div className="banner-status-icon">
             <Icon24ClockOutline />
          </div>
        );
    }
  };

  const getStatusText = (status: string) => {
      switch (status) {
          case 'confirmed': return 'Подтверждено';
          case 'pending': return 'Ожидает';
          case 'rejected': return 'Отменено';
          default: return 'Неизвестно';
      }
  };

  return (
    <>
      <div className="bookings-container">

        {/* Шапка с фильтрами */}
        <div className="bookings-header">
          <div className="bookings-segment-wrapper">
            <SegmentedControl size="m">
              <SegmentedControl.Item
                selected={segment === 'upcoming'}
                onClick={() => { setSegment('upcoming'); setStatusFilter('all'); }}
              >
                Предстоящие
              </SegmentedControl.Item>
              <SegmentedControl.Item
                selected={segment === 'past'}
                onClick={() => { setSegment('past'); setStatusFilter('all'); }}
              >
                Прошедшие
              </SegmentedControl.Item>
            </SegmentedControl>
          </div>

          <div className="bookings-filters">
              <Button
                  size="s"
                  mode={statusFilter === 'all' ? 'filled' : 'bezeled'}
                  onClick={() => setStatusFilter('all')}
                  style={{ flexShrink: 0, borderRadius: 100 }}
              >
                  Все
              </Button>
              <Button
                  size="s"
                  mode={statusFilter === 'confirmed' ? 'filled' : 'bezeled'}
                  onClick={() => setStatusFilter('confirmed')}
                  style={{ flexShrink: 0, borderRadius: 100 }}
              >
                  Подтверждено
              </Button>
              <Button
                  size="s"
                  mode={statusFilter === 'pending' ? 'filled' : 'bezeled'}
                  onClick={() => setStatusFilter('pending')}
                  style={{ flexShrink: 0, borderRadius: 100 }}
              >
                  Ожидание
              </Button>
              <Button
                  size="s"
                  mode={statusFilter === 'rejected' ? 'filled' : 'bezeled'}
                  onClick={() => setStatusFilter('rejected')}
                  style={{ flexShrink: 0, borderRadius: 100 }}
              >
                  Отменено
              </Button>
          </div>
        </div>

        {/* Контейнер для списков и плейсхолдеров */}
        <div className="bookings-content">
          {loading && (
            <div className="bookings-loader">
              <Spinner size="l" />
            </div>
          )}

          {!loading && error && (
            <Placeholder header="Ошибка" description={error}>
                <Button size="m" mode="filled" onClick={load}>Повторить</Button>
            </Placeholder>
          )}

          {!loading && !error && displayedList.length === 0 && (
            <Placeholder
              header={statusFilter === 'all' ? 'Список пуст' : 'Ничего не найдено'}
              description={
                statusFilter === 'all'
                  ? (segment === 'upcoming' ? 'Нет предстоящих записей' : 'История записей пуста')
                  : 'Записей с таким статусом нет'
              }
            >
              <LottieIcon
                src={segment === 'upcoming' ? '/stickers/skeleton.json' : '/stickers/duck_out.json'}
                size={140}
              />
              {segment === 'upcoming' && statusFilter === 'all' && onGoToServices && (
                <Button size="l" stretched onClick={onGoToServices} style={{ marginTop: 24 }}>
                  Записаться онлайн
                </Button>
              )}
            </Placeholder>
          )}

          {!loading && !error && displayedList.length > 0 && (
            <div className="bookings-banner-list">
              {displayedList.map((b) => {
                const serviceName = b.service_name || b.slot.service?.name || 'Услуга';
                const masterName = b.master_name || b.slot.service?.master_name || 'Мастер';
                const timeStr = formatDateTime(b.slot.time);
                const isPast = segment === 'past';

                return (
                  <Banner
                    key={b.id}
                    type="inline"
                    before={getBannerIcon(b.status, isPast)}
                    header={serviceName}
                    subheader={timeStr}
                    description={`Мастер: ${masterName} • ${getStatusText(b.status)}`}
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