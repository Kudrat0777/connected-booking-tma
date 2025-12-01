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
import { Icon20UserOutline, Icon20RecentOutline } from '@vkontakte/icons';
import lottie from 'lottie-web'; // Импортируем lottie

import type { Booking } from '../helpers/api';
import { fetchMyBookings, cancelBooking } from '../helpers/api';
import { ScreenLayout } from '../components/ScreenLayout';
import { StatusBadge } from '../components/StatusBadge';

// --- Мини-компонент для Lottie ---
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
// ---------------------------------

type Props = {
  telegramId: number;
  onBack: () => void;
  onGoToServices?: () => void;
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

export const MyBookingsScreen: React.FC<Props> = ({
  telegramId,
  onBack,
  onGoToServices,
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [segment, setSegment] = useState<Segment>('upcoming');

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

  const currentList = segment === 'upcoming' ? upcoming : past;

  return (
    <ScreenLayout title="Мои записи" onBack={onBack}>
      <div style={{ padding: '10px 16px' }}>
        <SegmentedControl size="m">
          <SegmentedControl.Item
            selected={segment === 'upcoming'}
            onClick={() => setSegment('upcoming')}
          >
            Предстоящие
          </SegmentedControl.Item>
          <SegmentedControl.Item
            selected={segment === 'past'}
            onClick={() => setSegment('past')}
          >
            Прошедшие
          </SegmentedControl.Item>
        </SegmentedControl>
      </div>

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

      {!loading && !error && currentList.length === 0 && (
        <Placeholder
          // Вставляем Lottie как дочерний элемент Placeholder
          // Это стандартный паттерн в UI Kit для кастомных иконок/иллюстраций
          header={segment === 'upcoming' ? 'Нет записей' : 'История пуста'}
          description={
            segment === 'upcoming'
              ? 'У вас пока нет запланированных визитов. Самое время записаться!'
              : 'Здесь будут храниться ваши завершенные услуги.'
          }
        >
          {/* Анимация сверху */}
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <LottieIcon
              src={segment === 'upcoming' ? '/stickers/skeleton.json' : '/stickers/favorites.json'}
              size={140}
            />
          </div>

          {/* Кнопка действия (только для предстоящих) */}
          {segment === 'upcoming' && onGoToServices && (
             <Button size="l" stretched onClick={onGoToServices} style={{ marginTop: 16 }}>
               Записаться онлайн
             </Button>
          )}
        </Placeholder>
      )}

      {!loading && !error && currentList.length > 0 && (
        <List style={{ background: 'var(--tgui--secondary_bg_color)', minHeight: '100%' }}>
          {currentList.map((b) => {
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

                 {segment === 'upcoming' && b.status !== 'canceled' && (
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
               </Section>
             );
          })}
        </List>
      )}
    </ScreenLayout>
  );
};