import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  List,
  Section,
  Cell,
  Button,
  SegmentedControl,
  Placeholder,
  Spinner
} from '@telegram-apps/telegram-ui';
import { Icon20UserOutline, Icon20RecentOutline, Icon28FavoriteOutline } from '@vkontakte/icons';
import lottie from 'lottie-web';

import type { Booking } from '../helpers/api';
import { fetchMyBookings, cancelBooking } from '../helpers/api';
import { ScreenLayout } from '../components/ScreenLayout';
import { StatusBadge } from '../components/StatusBadge';

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

  // Состояния фильтров
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

  // Разделение на будущее/прошлое
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

  // Применение фильтра по статусу
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

  return (
    <ScreenLayout title="Мои записи" onBack={onBack}>
      <div>
        {/* 1. Основной переключатель (Предстоящие / Прошедшие) */}
        <div style={{ padding: '10px 16px 0' }}>
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

        {/* 2. Фильтр статусов (Чипсы) */}
        <div style={{
            padding: '12px 16px',
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
        }}>
            <Button
                size="s"
                mode={statusFilter === 'all' ? 'filled' : 'bezeled'}
                onClick={() => setStatusFilter('all')}
                style={{ flexShrink: 0 }}
            >
                Все
            </Button>
            <Button
                size="s"
                mode={statusFilter === 'confirmed' ? 'filled' : 'bezeled'}
                onClick={() => setStatusFilter('confirmed')}
                style={{ flexShrink: 0 }}
            >
                Подтверждено
            </Button>
            <Button
                size="s"
                mode={statusFilter === 'pending' ? 'filled' : 'bezeled'}
                onClick={() => setStatusFilter('pending')}
                style={{ flexShrink: 0 }}
            >
                Ожидание
            </Button>
            <Button
                size="s"
                mode={statusFilter === 'rejected' ? 'filled' : 'bezeled'}
                onClick={() => setStatusFilter('rejected')}
                style={{ flexShrink: 0 }}
            >
                Отменено
            </Button>
        </div>

        <div
          style={{
            height: 'calc(100vh - 240px)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 20
          }}
        >
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Spinner size="m" />
            </div>
          )}

          {!loading && error && (
            <Placeholder header="Ошибка" description={error}>
                <Button size="s" onClick={load}>Повторить</Button>
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
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <LottieIcon
                  src={segment === 'upcoming' ? '/stickers/skeleton.json' : '/stickers/duck_out.json'}
                  size={140}
                />
              </div>

              {segment === 'upcoming' && statusFilter === 'all' && onGoToServices && (
                <Button size="l" stretched onClick={onGoToServices} style={{ marginTop: 16 }}>
                  Записаться онлайн
                </Button>
              )}
            </Placeholder>
          )}

          {!loading && !error && displayedList.length > 0 && (
            <List style={{ background: 'var(--tgui--secondary_bg_color)', minHeight: '100%' }}>
              {displayedList.map((b) => {
                const serviceName = b.service_name || b.slot.service?.name || 'Услуга';
                const masterName = b.master_name || b.slot.service?.master_name || 'Мастер';
                const timeStr = formatDateTime(b.slot.time);

                return (
                  <Section key={b.id}>
                    <Cell
                      before={<Icon20RecentOutline />}
                      description={timeStr}
                      multiline
                    >
                      {serviceName}
                    </Cell>
                    <Cell
                      before={<Icon20UserOutline />}
                    >
                      {masterName}
                    </Cell>

                    <Cell>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>Статус:</span>
                          <StatusBadge status={b.status} />
                        </div>
                    </Cell>

                    {segment === 'upcoming' && b.status !== 'rejected' && (
                      <Cell>
                        <Button
                            mode="bezeled"
                            size="m"
                            stretched
                            disabled={cancellingId === b.id}
                            onClick={() => handleCancel(b)}
                            style={{ color: 'var(--tgui--destructive_text_color)' }}
                        >
                          {cancellingId === b.id ? 'Отмена...' : 'Отменить запись'}
                        </Button>
                      </Cell>
                    )}

                    {segment === 'past' && b.status === 'confirmed' && onReview && (
                        <Cell>
                          <Button
                            mode="filled"
                            size="m"
                            stretched
                            before={<Icon28FavoriteOutline />}
                            onClick={() => onReview(b)}
                          >
                            Оценить мастера
                          </Button>
                        </Cell>
                    )}

                  </Section>
                );
              })}
              <div style={{ height: 40 }} />
            </List>
          )}
        </div>
      </div>
    </ScreenLayout>
  );
};