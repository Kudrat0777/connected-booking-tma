import React, { useState, useEffect } from 'react';
import {
  List,
  Section,
  Cell,
  Button,
  Input,
  Text,
  Placeholder,
  Spinner
} from '@telegram-apps/telegram-ui';
import { Icon28CheckCircleOutline } from '@vkontakte/icons';
import { fetchMyServices, bulkGenerateSlots } from '../helpers/api';
import type { Service } from '../helpers/api';
import { ScreenLayout } from '../components/ScreenLayout';

type Props = {
  telegramId: number;
  onBack: () => void;
};

const WEEKDAYS = [
  { id: 0, label: 'Пн' },
  { id: 1, label: 'Вт' },
  { id: 2, label: 'Ср' },
  { id: 3, label: 'Чт' },
  { id: 4, label: 'Пт' },
  { id: 5, label: 'Сб' },
  { id: 6, label: 'Вс' },
];

export const MasterScheduleScreen: React.FC<Props> = ({ telegramId, onBack }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Form State
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Дата через 7 дней по умолчанию
  const defaultEndDate = new Date();
  defaultEndDate.setDate(defaultEndDate.getDate() + 7);
  const [endDate, setEndDate] = useState(defaultEndDate.toISOString().split('T')[0]);

  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4]); // Пн-Пт default

  // Time range generation
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('19:00');
  const [intervalMinutes, setIntervalMinutes] = useState('60');

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchMyServices(telegramId)
      .then((data) => {
        setServices(data);
        if (data.length > 0) setSelectedServiceId(data[0].id);
      })
      .finally(() => setLoadingServices(false));
  }, [telegramId]);

  const toggleDay = (dayId: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  const generateTimesArray = () => {
    const times: string[] = [];
    // Используем условную дату для генерации времени
    const baseDate = '1970-01-01';
    let current = new Date(`${baseDate}T${startTime}:00`);
    const end = new Date(`${baseDate}T${endTime}:00`);
    const step = parseInt(intervalMinutes) || 60;

    while (current < end) { // < end, чтобы последний слот не вылезал за рамки, если нужно <= end - поменяй
      const hh = String(current.getHours()).padStart(2, '0');
      const mm = String(current.getMinutes()).padStart(2, '0');
      times.push(`${hh}:${mm}`);
      current.setMinutes(current.getMinutes() + step);
    }
    return times;
  };

  const handleSubmit = async () => {
    if (!selectedServiceId) return alert('Выберите услугу');

    setSubmitting(true);
    try {
      const times = generateTimesArray();
      if (times.length === 0) {
        alert('Проверьте время начала и конца.');
        return;
      }

      const res = await bulkGenerateSlots(
        selectedServiceId,
        startDate,
        endDate,
        times,
        selectedDays
      );
      setSuccessMsg(`Успешно создано слотов: ${res.created}`);
    } catch (e) {
      console.error(e);
      alert('Ошибка при создании расписания');
    } finally {
      setSubmitting(false);
    }
  };

  if (successMsg) {
    return (
      <Placeholder
        header="Расписание готово!"
        description={successMsg}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
           <Icon28CheckCircleOutline width={60} height={60} style={{ color: 'var(--tgui--section_header_text_color)' }} />
        </div>
        <Button size="l" stretched onClick={onBack}>
          Вернуться в кабинет
        </Button>
      </Placeholder>
    );
  }

  return (
    <ScreenLayout title="Генератор" onBack={onBack}>
      <List style={{ background: 'var(--tgui--secondary_bg_color)' }}>

        {/* 1. SERVICE SELECTOR */}
        <Section header="1. Выберите услугу">
          {loadingServices ? <Spinner size="s" /> : (
            services.map(s => (
              <Cell
                key={s.id}
                onClick={() => setSelectedServiceId(s.id)}
                after={selectedServiceId === s.id && <Icon28CheckCircleOutline style={{ color: 'var(--tgui--button_color)' }} />}
              >
                {s.name} ({s.duration} мин)
              </Cell>
            ))
          )}
          {!loadingServices && services.length === 0 && (
             <Cell disabled>Сначала добавьте услуги в кабинете</Cell>
          )}
        </Section>

        {/* 2. DATE RANGE */}
        <Section header="2. Период">
          <Input
            header="Дата начала"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
          <Input
            header="Дата окончания"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </Section>

        {/* 3. WEEKDAYS */}
        <Section header="3. Дни недели">
          <div style={{ padding: '10px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {WEEKDAYS.map(day => (
              <div
                key={day.id}
                onClick={() => toggleDay(day.id)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: selectedDays.includes(day.id) ? 'var(--tgui--button_color)' : 'var(--tgui--secondary_bg_color)',
                  color: selectedDays.includes(day.id) ? 'var(--tgui--button_text_color)' : 'var(--tgui--text_color)',
                  border: '1px solid var(--tgui--separator_color)',
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                {day.label}
              </div>
            ))}
          </div>
        </Section>

        {/* 4. TIME RANGE */}
        <Section header="4. Рабочее время">
          <div style={{ display: 'flex', gap: 10 }}>
            <Input
               header="C"
               type="time"
               value={startTime}
               onChange={e => setStartTime(e.target.value)}
            />
            <Input
               header="До"
               type="time"
               value={endTime}
               onChange={e => setEndTime(e.target.value)}
            />
          </div>
          <Input
             header="Интервал (мин)"
             type="number"
             value={intervalMinutes}
             onChange={e => setIntervalMinutes(e.target.value)}
             placeholder="Например, 60"
          />
          <Text style={{ padding: '0 16px 10px', fontSize: 13, color: 'var(--tgui--hint_color)' }}>
             Слоты будут созданы каждые {intervalMinutes} мин.
          </Text>
        </Section>

        <Section>
          <Button
            size="l"
            mode="filled"
            stretched
            loading={submitting}
            onClick={handleSubmit}
          >
            Сгенерировать слоты
          </Button>
        </Section>

      </List>
    </ScreenLayout>
  );
};