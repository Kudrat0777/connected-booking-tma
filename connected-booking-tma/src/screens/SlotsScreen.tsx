import React, { useEffect, useMemo, useState } from 'react';
import {
  List,
  Section,
  Cell,
  Spinner,
  Placeholder,
  Title,
  Text
} from '@telegram-apps/telegram-ui';
import {
  Icon28ClockOutline,
  Icon28MoneyCircleOutline,
  Icon28UserOutline
} from '@vkontakte/icons';
import type { Service, Slot } from '../helpers/api';
import { fetchSlotsForService } from '../helpers/api';

type Props = {
  service: Service;
  onBack: () => void;
  onSlotSelected: (slot: Slot) => void;
};

// Функция для группировки слотов по датам (YYYY-MM-DD)
const groupSlotsByDateStr = (slots: Slot[]) => {
  const groups: Record<string, Slot[]> = {};
  slots.forEach((slot) => {
    const d = new Date(slot.time);
    // Получаем локальную дату в формате YYYY-MM-DD для ключа
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(slot);
  });
  return groups;
};

const DAYS_OF_WEEK = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export const SlotsScreen: React.FC<Props> = ({
  service,
  onBack,
  onSlotSelected,
}) => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Подключение нативной кнопки Назад
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;

    tg.BackButton.onClick(onBack);
    tg.BackButton.show();

    return () => {
      tg.BackButton.offClick(onBack);
      tg.BackButton.hide();
    };
  }, [onBack]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSlotsForService(service.id);
      const freeSlots = data.filter((s) => !s.is_booked);
      setSlots(freeSlots);
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

  const groupedSlots = useMemo(() => groupSlotsByDateStr(slots), [slots]);
  const availableDates = useMemo(() => Object.keys(groupedSlots).sort(), [groupedSlots]);

  // Автоматически выбираем первую доступную дату при загрузке
  useEffect(() => {
      if (availableDates.length > 0 && !selectedDate) {
          setSelectedDate(availableDates[0]);
      }
  }, [availableDates, selectedDate]);

  const triggerHaptic = (type: 'selection' | 'light' = 'selection') => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
        if (type === 'selection') tg.HapticFeedback.selectionChanged();
        else tg.HapticFeedback.impactOccurred('light');
    }
  };

  const handleSlotClick = (slot: Slot) => {
      triggerHaptic('light');
      onSlotSelected(slot);
  };

  return (
    <div style={{
        backgroundColor: 'var(--tg-theme-secondary-bg-color)',
        minHeight: '100vh',
        paddingBottom: 40
    }}>

      {/* ИНФОРМАЦИЯ ОБ УСЛУГЕ */}
      <div style={{ paddingTop: 16 }}>
          <List>
            <Section header="ВЫБРАННАЯ УСЛУГА">
              <Cell
                 subtitle={service.description}
                 after={
                   <span style={{ fontWeight: 600, color: 'var(--tg-theme-text-color)' }}>
                     {service.price ? `${service.price.toLocaleString('ru-RU')} UZS` : ''}
                   </span>
                 }
              >
                  <span style={{ fontWeight: 600 }}>{service.name}</span>
              </Cell>
              {service.master_name && (
                <Cell before={<Icon28UserOutline style={{ color: 'var(--tg-theme-button-color)' }}/>}>
                  Мастер: {service.master_name}
                </Cell>
              )}
              {service.duration && (
                <Cell before={<Icon28ClockOutline style={{ color: 'var(--tg-theme-button-color)' }}/>}>
                  Длительность: {service.duration} мин
                </Cell>
              )}
            </Section>
          </List>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Spinner size="l" />
        </div>
      ) : error ? (
        <div style={{ marginTop: 20 }}>
            <Placeholder header="Ошибка" description={error}>
              <div
                  onClick={load}
                  style={{ color: 'var(--tg-theme-button-color)', fontWeight: 500, cursor: 'pointer', padding: '10px 20px', backgroundColor: 'var(--tg-theme-bg-color)', borderRadius: 8 }}
              >
                  Повторить
              </div>
            </Placeholder>
        </div>
      ) : availableDates.length === 0 ? (
        <div style={{ marginTop: 20 }}>
            <Placeholder
              header="Нет свободного времени"
              description="К сожалению, на эту услугу пока нет свободных слотов. Попробуйте выбрать другого мастера."
            >
               <div style={{ fontSize: 48 }}>🗓️</div>
            </Placeholder>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>

          <Title level="3" weight="2" style={{ marginLeft: 16, marginBottom: 12, color: 'var(--tg-theme-hint-color)', textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.5px' }}>
              Выберите дату
          </Title>

          {/* ГОРИЗОНТАЛЬНЫЙ КАЛЕНДАРЬ */}
          <div style={{
              display: 'flex',
              overflowX: 'auto',
              padding: '0 16px 12px',
              gap: 12,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
          }}>
             {availableDates.map(dateStr => {
                 const d = new Date(dateStr);
                 const dayOfWeek = DAYS_OF_WEEK[d.getDay()];
                 const dayOfMonth = d.getDate();
                 const monthName = MONTHS[d.getMonth()];
                 const isSelected = selectedDate === dateStr;

                 return (
                     <div
                         key={dateStr}
                         onClick={() => {
                             triggerHaptic('selection');
                             setSelectedDate(dateStr);
                         }}
                         style={{
                             display: 'flex',
                             flexDirection: 'column',
                             alignItems: 'center',
                             justifyContent: 'center',
                             minWidth: 64,
                             height: 72,
                             borderRadius: 16,
                             backgroundColor: isSelected ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-bg-color)',
                             color: isSelected ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-text-color)',
                             transition: 'all 0.2s ease',
                             cursor: 'pointer',
                             boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.05)'
                         }}
                     >
                         <span style={{ fontSize: 13, opacity: isSelected ? 0.9 : 0.6, marginBottom: 4 }}>
                             {monthName.slice(0, 3)}
                         </span>
                         <span style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
                             {dayOfMonth}
                         </span>
                         <span style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>
                             {dayOfWeek}
                         </span>
                     </div>
                 );
             })}
          </div>

          {/* СЕТКА СВОБОДНОГО ВРЕМЕНИ */}
          {selectedDate && groupedSlots[selectedDate] && (
              <div style={{ marginTop: 16 }}>
                 <Title level="3" weight="2" style={{ marginLeft: 16, marginBottom: 12, color: 'var(--tg-theme-hint-color)', textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.5px' }}>
                    Доступное время
                 </Title>

                 <div style={{
                     display: 'grid',
                     gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                     gap: 12,
                     padding: '0 16px'
                 }}>
                    {groupedSlots[selectedDate].map(slot => {
                        const timeStr = new Date(slot.time).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                        });

                        return (
                            <div
                                key={slot.id}
                                onClick={() => handleSlotClick(slot)}
                                style={{
                                    backgroundColor: 'var(--tg-theme-bg-color)',
                                    color: 'var(--tg-theme-text-color)',
                                    padding: '12px 0',
                                    borderRadius: 12,
                                    textAlign: 'center',
                                    fontWeight: 600,
                                    fontSize: 16,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                    border: '1px solid var(--tg-theme-secondary-bg-color)'
                                }}
                            >
                                {timeStr}
                            </div>
                        );
                    })}
                 </div>
              </div>
          )}

        </div>
      )}
    </div>
  );
};