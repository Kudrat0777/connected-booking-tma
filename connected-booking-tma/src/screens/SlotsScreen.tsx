import React, { useEffect, useMemo, useState } from 'react';
import {
  List,
  Section,
  Cell,
  Spinner,
  Placeholder,
  Button,
  Text,
  Banner
} from '@telegram-apps/telegram-ui';
import {
  Icon28CalendarOutline,
  Icon28ClockOutline,
  Icon28CoinsOutline,
  Icon28UserOutline
} from '@vkontakte/icons';
import type { Service, Slot } from '../helpers/api';
import { fetchSlotsForService } from '../helpers/api';
import { ScreenLayout } from '../components/ScreenLayout';

type Props = {
  service: Service;
  onBack: () => void;
  onSlotSelected: (slot: Slot) => void;
};

// Helper to group slots by date
const groupSlotsByDate = (slots: Slot[]) => {
  const groups: Record<string, Slot[]> = {};

  slots.forEach((slot) => {
    const d = new Date(slot.time);
    // Format key like "25 October"
    const dateKey = d.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long'
    });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(slot);
  });

  return groups;
};

export const SlotsScreen: React.FC<Props> = ({
  service,
  onBack,
  onSlotSelected,
}) => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSlotsForService(service.id);
      // Filter only non-booked slots
      setSlots(data.filter((s) => !s.is_booked));
    } catch (e) {
      console.error(e);
      setError('Не удалось загрузить расписание.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [service.id]);

  const groupedSlots = useMemo(() => groupSlotsByDate(slots), [slots]);
  const dates = Object.keys(groupedSlots);

  return (
    <ScreenLayout title={service.name} onBack={onBack}>
      <List style={{ background: 'var(--tgui--secondary_bg_color)', minHeight: '100%' }}>

        {/* Service Details Section */}
        <Section header="Информация об услуге">
          {service.master_name && (
            <Cell before={<Icon28UserOutline />}>
              Мастер: <span style={{ color: 'var(--tgui--text_color)' }}>{service.master_name}</span>
            </Cell>
          )}
          {service.duration && (
            <Cell before={<Icon28ClockOutline />}>
              Длительность: <span style={{ color: 'var(--tgui--text_color)' }}>{service.duration} мин</span>
            </Cell>
          )}
          {service.price != null && (
            <Cell before={<Icon28CoinsOutline />}>
              Стоимость: <span style={{ color: 'var(--tgui--link_color)', fontWeight: '600' }}>{service.price} ₽</span>
            </Cell>
          )}
        </Section>

        {/* Slots State Handling */}
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

        {!loading && !error && slots.length === 0 && (
           <Banner
             header="Нет свободного времени"
             description="К сожалению, на эту услугу пока нет свободных слотов. Попробуйте выбрать другого мастера или дату."
             type="section" // or 'list'
           >
             {/* Optional illustration or icon could go here */}
           </Banner>
        )}

        {/* Available Slots Grouped by Date */}
        {!loading && !error && dates.map((date) => (
          <Section key={date} header={date}>
            <div style={{ padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {groupedSlots[date].map((slot) => {
                const timeStr = new Date(slot.time).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <Button
                    key={slot.id}
                    mode="bezeled" // 'bezeled' looks like a time chip
                    size="s"
                    onClick={() => onSlotSelected(slot)}
                    style={{ minWidth: '70px' }}
                  >
                    {timeStr}
                  </Button>
                );
              })}
            </div>
          </Section>
        ))}

      </List>
    </ScreenLayout>
  );
};