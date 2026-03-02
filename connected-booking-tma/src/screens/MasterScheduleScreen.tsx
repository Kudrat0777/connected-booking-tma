import React, { useState, useEffect } from 'react';
import {
  Section,
  Input,
  Select,
  Button,
  Spinner,
  Placeholder
} from '@telegram-apps/telegram-ui';
import { ScreenLayout } from '../components/ScreenLayout';
import { fetchMyServices, bulkGenerateSlots, Service } from '../helpers/api';

type Props = {
  telegramId: number;
  onBack: () => void;
};

const DAYS = [
  { id: 0, label: 'Пн' },
  { id: 1, label: 'Вт' },
  { id: 2, label: 'Ср' },
  { id: 3, label: 'Чт' },
  { id: 4, label: 'Пт' },
  { id: 5, label: 'Сб' },
  { id: 6, label: 'Вс' },
];

export const MasterScheduleScreen: React.FC<Props> = ({ telegramId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [services, setServices] = useState<Service[]>([]);

  // Значения по умолчанию для дат (Сегодня -> через месяц)
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });

  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('19:00');
  const [step, setStep] = useState('30'); // Шаг в минутах
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4]); // Пн-Пт по умолчанию

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const data = await fetchMyServices(telegramId);
      setServices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (dayId: number) => {
    setSelectedDays(prev =>
      prev.includes(dayId) ? prev.filter(id => id !== dayId) : [...prev, dayId]
    );
  };

  // Функция для создания массива времени (например: ["10:00", "10:30", "11:00"...])
  const generateTimesArray = () => {
    const times: string[] = [];
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    let currentMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    const stepMins = parseInt(step);

    while (currentMins < endMins) {
      const h = Math.floor(currentMins / 60).toString().padStart(2, '0');
      const m = (currentMins % 60).toString().padStart(2, '0');
      times.push(`${h}:${m}`);
      currentMins += stepMins;
    }
    return times;
  };

  const handleGenerate = async () => {
    if (selectedDays.length === 0) {
      return alert('Выберите хотя бы один рабочий день');
    }
    if (new Date(startDate) > new Date(endDate)) {
      return alert('Дата начала не может быть позже даты окончания');
    }

    const times = generateTimesArray();
    if (times.length === 0) {
      return alert('Неверно указано время работы');
    }

    setGenerating(true);
    try {
      // Генерируем слоты для КАЖДОЙ услуги мастера,
      // чтобы клиенты видели свободное время независимо от выбранной процедуры.
      // (Наш "умный" бэкенд потом сам будет скрывать занятые слоты)
      let totalCreated = 0;
      for (const service of services) {
        const res = await bulkGenerateSlots(service.id, startDate, endDate, times, selectedDays);
        totalCreated += res.created || 0;
      }

      alert(`Расписание успешно создано! Сгенерировано слотов: ${totalCreated}`);
      onBack();
    } catch (e) {
      console.error(e);
      alert('Ошибка при генерации расписания');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <ScreenLayout title="Расписание" onBack={onBack}>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 50 }}><Spinner size="l" /></div>
      </ScreenLayout>
    );
  }

  if (services.length === 0) {
    return (
      <ScreenLayout title="Расписание" onBack={onBack}>
        <Placeholder
          header="Нет услуг"
          description="Сначала добавьте хотя бы одну услугу в меню, чтобы сгенерировать для неё слоты записи."
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Авто-расписание" onBack={onBack}>
      <div style={{ padding: '16px', paddingBottom: 100 }}>
        <p style={{ color: 'var(--tgui--hint_color)', fontSize: 14, marginBottom: 16 }}>
          Укажите ваш график работы. Система автоматически создаст пустые окна для записи на этот период.
        </p>

        <Section header="Период генерации">
          <Input
            header="С какого числа"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
          <Input
            header="По какое число"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </Section>

        <Section header="Рабочие дни недели">
          <div style={{ padding: '12px 16px', display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            {DAYS.map(day => {
              const isSelected = selectedDays.includes(day.id);
              return (
                <div
                  key={day.id}
                  onClick={() => toggleDay(day.id)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: '0.2s',
                    backgroundColor: isSelected ? 'var(--tgui--button_color)' : 'var(--tgui--secondary_bg_color)',
                    color: isSelected ? 'var(--tgui--button_text_color)' : 'var(--tgui--text_color)',
                  }}
                >
                  {day.label}
                </div>
              );
            })}
          </div>
        </Section>

        <Section header="Время работы">
          <Input
            header="Начало рабочего дня"
            type="time"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
          />
          <Input
            header="Конец рабочего дня"
            type="time"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
          />
          <Select
            header="Шаг записи (интервал слотов)"
            value={step}
            onChange={e => setStep(e.target.value)}
          >
            <option value="15">Каждые 15 минут</option>
            <option value="30">Каждые 30 минут</option>
            <option value="60">Каждый 1 час</option>
          </Select>
        </Section>

        <div style={{ marginTop: 24 }}>
          <Button
            size="l"
            mode="filled"
            stretched
            loading={generating}
            onClick={handleGenerate}
          >
            Сгенерировать расписание
          </Button>
        </div>
      </div>
    </ScreenLayout>
  );
};