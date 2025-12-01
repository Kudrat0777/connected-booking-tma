import React, { useEffect, useMemo, useState } from 'react';
import {
  List,
  Section,
  Cell,
  Button,
  SegmentedControl,
  Placeholder,
  Text,
  Spinner
} from '@telegram-apps/telegram-ui';
import { Icon20UserOutline, Icon20RecentOutline } from '@vkontakte/icons';

import type { Booking } from '../helpers/api';
import { fetchMyBookings, cancelBooking } from '../helpers/api';
import { ScreenLayout } from '../components/ScreenLayout';
import { StatusBadge } from '../components/StatusBadge';

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
    // Сортируем
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
        <SegmentedControl
          size="m"
        >
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
        <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
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
          header={segment === 'upcoming' ? 'Нет записей' : 'История пуста'}
          description={
            segment === 'upcoming'
              ? 'У вас нет предстоящих визитов.'
              : 'Здесь появятся ваши завершенные услуги.'
          }
        >
          {segment === 'upcoming' && onGoToServices && (
             <Button size="m" onClick={onGoToServices}>Записаться</Button>
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
                   before={<Icon20RecentOutline />} /* Иконка часов/календаря */
                   description={timeStr}
                   multiline
                 >
                   {serviceName}
                 </Cell>
                 <Cell
                   before={<Icon20UserOutline />} /* Иконка пользователя */
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