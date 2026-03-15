import React, { useState, useEffect, useRef } from 'react';
import {
  Section,
  Input,
  Select,
  Spinner,
  Placeholder,
  Title,
  Text,
  List
} from '@telegram-apps/telegram-ui';
import lottie from 'lottie-web';
import { fetchMyServices, bulkGenerateSlots, Service } from '../helpers/api';

import { useLanguage } from '../helpers/LanguageContext';

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
};

export const MasterScheduleScreen: React.FC<Props> = ({ telegramId, onBack }) => {
  const { t } = useLanguage();

  const DAYS = [
    { id: 1, label: t('day_1') },
    { id: 2, label: t('day_2') },
    { id: 3, label: t('day_3') },
    { id: 4, label: t('day_4') },
    { id: 5, label: t('day_5') },
    { id: 6, label: t('day_6') },
    { id: 0, label: t('day_0') }, // 0 - это Воскресенье
  ];

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [services, setServices] = useState<Service[]>([]);

  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });

  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('19:00');
  const [step, setStep] = useState('30');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Пн-Пт

  // Ref для доступа к актуальным состояниям из замыкания Telegram кнопки
  const payloadRef = useRef({ startDate, endDate, startTime, endTime, step, selectedDays, services });
  useEffect(() => {
    payloadRef.current = { startDate, endDate, startTime, endTime, step, selectedDays, services };
  }, [startDate, endDate, startTime, endTime, step, selectedDays, services]);

  const triggerHaptic = (type: 'light' | 'selection' | 'success' | 'warning' | 'error' = 'selection') => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
        if (['success', 'warning', 'error'].includes(type)) tg.HapticFeedback.notificationOccurred(type);
        else if (type === 'light') tg.HapticFeedback.impactOccurred('light');
        else tg.HapticFeedback.selectionChanged();
    }
  };

  // --- НАСТРОЙКА НАТИВНЫХ КНОПОК ---
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;

    tg.BackButton.onClick(onBack);
    tg.BackButton.show();

    const handleMainClick = async () => {
      if (generating) return;
      const payload = payloadRef.current;

      if (payload.selectedDays.length === 0) {
        triggerHaptic('error');
        if (tg.showAlert) tg.showAlert(t('m_schedule_error_days'));
        else alert(t('m_schedule_error_days'));
        return;
      }
      if (new Date(payload.startDate) > new Date(payload.endDate)) {
        triggerHaptic('error');
        if (tg.showAlert) tg.showAlert(t('m_schedule_error_dates'));
        else alert(t('m_schedule_error_dates'));
        return;
      }

      const times: string[] = [];
      const [startH, startM] = payload.startTime.split(':').map(Number);
      const [endH, endM] = payload.endTime.split(':').map(Number);

      let currentMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;
      const stepMins = parseInt(payload.step);

      while (currentMins < endMins) {
        const h = Math.floor(currentMins / 60).toString().padStart(2, '0');
        const m = (currentMins % 60).toString().padStart(2, '0');
        times.push(`${h}:${m}`);
        currentMins += stepMins;
      }

      if (times.length === 0) {
        triggerHaptic('error');
        if (tg.showAlert) tg.showAlert(t('m_schedule_error_time'));
        else alert(t('m_schedule_error_time'));
        return;
      }

      setGenerating(true);
      tg.MainButton.showProgress();
      tg.MainButton.disable();

      try {
        let totalCreated = 0;
        for (const service of payload.services) {
          const res = await bulkGenerateSlots(service.id, payload.startDate, payload.endDate, times, payload.selectedDays);
          totalCreated += res.created || 0;
        }

        triggerHaptic('success');
        if (tg.showAlert) {
            tg.showAlert(`${t('m_schedule_success_1')} ${totalCreated}`, () => onBack());
        } else {
            alert(`${t('m_schedule_success_2')} ${totalCreated}`);
            onBack();
        }
      } catch (e) {
        console.error(e);
        triggerHaptic('error');
        alert(t('m_schedule_error_gen'));
        setGenerating(false);
        tg.MainButton.hideProgress();
        tg.MainButton.enable();
      }
    };

    tg.MainButton.setParams({
        text: t('m_btn_generate_schedule'),
        color: tg.themeParams?.button_color || '#3390ec',
        text_color: tg.themeParams?.button_text_color || '#ffffff',
        is_active: true,
    });
    tg.MainButton.onClick(handleMainClick);

    return () => {
      tg.BackButton.offClick(onBack);
      tg.BackButton.hide();
      tg.MainButton.offClick(handleMainClick);
      tg.MainButton.hide();
    };
  }, [onBack, generating, t]);

  // Скрываем/показываем MainButton в зависимости от статуса загрузки и наличия услуг
  useEffect(() => {
      const tg = (window as any).Telegram?.WebApp;
      if (!tg) return;

      if (!loading && services.length > 0) {
          tg.MainButton.show();
      } else {
          tg.MainButton.hide();
      }
  }, [loading, services.length]);

  useEffect(() => {
    loadServices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadServices = async () => {
    try {
      const data = await fetchMyServices(telegramId);
      setServices(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleDay = (dayId: number) => {
    triggerHaptic('light');
    setSelectedDays(prev =>
      prev.includes(dayId) ? prev.filter(id => id !== dayId) : [...prev, dayId]
    );
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="l" />
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', minHeight: '100vh', paddingTop: 60 }}>
        <Placeholder
          header={t('m_no_services')}
          description={t('m_schedule_no_services_desc')}
        >
            <LottieIcon src="/stickers/duck_out.json" size={140} />
        </Placeholder>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', minHeight: '100vh', paddingBottom: 80 }}>

      {/* ШАПКА */}
      <div style={{ padding: '32px 20px 16px' }}>
          <Title level="1" weight="2" style={{ marginBottom: 8, color: 'var(--tg-theme-text-color)' }}>
              {t('m_schedule_title')}
          </Title>
          <Text style={{ color: 'var(--tg-theme-hint-color)', fontSize: 15, lineHeight: '1.4' }}>
              {t('m_schedule_desc')}
          </Text>
      </div>

      <List style={{ padding: '0 16px' }}>

        {/* ПЕРИОД */}
        <Section header={t('m_schedule_period')}>
          <Input
            header={t('m_schedule_start_date')}
            type="date"
            value={startDate}
            onChange={e => { triggerHaptic('selection'); setStartDate(e.target.value); }}
          />
          <Input
            header={t('m_schedule_end_date')}
            type="date"
            value={endDate}
            onChange={e => { triggerHaptic('selection'); setEndDate(e.target.value); }}
          />
        </Section>

        {/* ДНИ НЕДЕЛИ */}
        <Section header={t('m_schedule_working_days')}>
          <div style={{ padding: '16px 12px', display: 'flex', gap: 8, justifyContent: 'space-between', backgroundColor: 'var(--tg-theme-bg-color)' }}>
            {DAYS.map(day => {
              const isSelected = selectedDays.includes(day.id);
              return (
                <div
                  key={day.id}
                  onClick={() => toggleDay(day.id)}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor: isSelected ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)',
                    color: isSelected ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-text-color)',
                    boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
                  }}
                >
                  {/* Берем только первые две буквы, если строка длинная */}
                  {day.label.slice(0, 2)}
                </div>
              );
            })}
          </div>
        </Section>

        {/* ВРЕМЯ РАБОТЫ */}
        <Section header={t('m_schedule_working_hours')}>
          <Input
            header={t('m_schedule_start_time')}
            type="time"
            value={startTime}
            onChange={e => { triggerHaptic('selection'); setStartTime(e.target.value); }}
          />
          <Input
            header={t('m_schedule_end_time')}
            type="time"
            value={endTime}
            onChange={e => { triggerHaptic('selection'); setEndTime(e.target.value); }}
          />
          <Select
            header={t('m_schedule_interval')}
            value={step}
            onChange={e => { triggerHaptic('selection'); setStep(e.target.value); }}
          >
            <option value="15">{t('m_every_15_min')}</option>
            <option value="30">{t('m_every_30_min')}</option>
            <option value="60">{t('m_every_60_min')}</option>
            <option value="90">{t('m_every_90_min')}</option>
            <option value="120">{t('m_every_120_min')}</option>
          </Select>
        </Section>

      </List>
    </div>
  );
};