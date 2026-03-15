import React, { useState, useEffect } from 'react';
import { Title, Text, Input, Button, Select, Section, List, Spinner } from '@telegram-apps/telegram-ui';
import { registerMaster } from '../helpers/api';

const CATEGORIES = [
  'Барбершоп', 'Салон красоты', 'Массаж',
  'Маникюр / Педикюр', 'Брови и Ресницы',
  'Медицина', 'Спорт / Фитнес', 'Автосервис', 'Другое'
];

const CITIES = ['Ургенч', 'Ташкент', 'Самарканд', 'Бухара', 'Хива'];

type Props = {
  telegramId: number;
  onBack: () => void;
  onComplete: () => void; // Вызывается после успешной регистрации
};

export const MasterRegistrationScreen: React.FC<Props> = ({ telegramId, onBack, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Данные формы
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [city, setCity] = useState(CITIES[0]);
  const [experience, setExperience] = useState('');

  const tg = (window as any).Telegram?.WebApp;

  useEffect(() => {
    if (tg) {
      tg.BackButton.show();
      tg.BackButton.onClick(handleBackClick);
    }
    return () => {
      if (tg) tg.BackButton.offClick(handleBackClick);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleBackClick = () => {
    if (step === 1) {
      onBack();
    } else {
      setStep(step - 1);
    }
  };

  const triggerHaptic = (type: 'light' | 'success' | 'error' = 'light') => {
    if (tg?.HapticFeedback) {
        if (type === 'light') tg.HapticFeedback.impactOccurred('light');
        else tg.HapticFeedback.notificationOccurred(type);
    }
  };

  const nextStep = () => {
    triggerHaptic('light');

    if (step === 1) {
      if (!name || !phone || !password) {
        triggerHaptic('error');
        if (tg?.showAlert) tg.showAlert('Заполните все поля');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      submitRegistration();
    }
  };

  const submitRegistration = async () => {
    setLoading(true);
    try {
      await registerMaster({
        telegram_id: telegramId,
        name,
        phone,
        password,
        category,
        city,
        experience_years: parseInt(experience) || 0
      });
      triggerHaptic('success');
      onComplete(); // Успешно зарегались!
    } catch (e: any) {
      triggerHaptic('error');
      alert(e.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', minHeight: '100vh', paddingBottom: 60 }}>

      {/* Прогресс-бар */}
      <div style={{ display: 'flex', gap: 8, padding: '16px 20px', backgroundColor: 'var(--tg-theme-bg-color)' }}>
         <div style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: step >= 1 ? 'var(--tg-theme-button-color)' : 'rgba(0,0,0,0.1)' }} />
         <div style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: step >= 2 ? 'var(--tg-theme-button-color)' : 'rgba(0,0,0,0.1)' }} />
      </div>

      <div style={{ padding: '24px 20px' }}>
         <Title level="1" weight="1" style={{ color: 'var(--tg-theme-text-color)', marginBottom: 8 }}>
            {step === 1 ? 'Личные данные' : 'О специалисте'}
         </Title>
         <Text style={{ color: 'var(--tg-theme-hint-color)' }}>
            {step === 1 ? 'Эта информация нужна для входа и связи с клиентами.' : 'Выберите сферу, чтобы клиентам было проще вас найти.'}
         </Text>
      </div>

      <List style={{ padding: '0 16px' }}>
        {step === 1 && (
          <Section>
            <Input
              header="Имя и Фамилия"
              placeholder="Как к вам обращаться?"
              value={name} onChange={e => setName(e.target.value)}
            />
            <Input
              header="Номер телефона"
              placeholder="+998 90 000 00 00"
              type="tel"
              value={phone} onChange={e => setPhone(e.target.value)}
            />
            <Input
              header="Придумайте пароль"
              placeholder="Для входа в кабинет"
              type="password"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </Section>
        )}

        {step === 2 && (
          <Section>
            <Select header="Сфера деятельности" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select header="Город" value={city} onChange={e => setCity(e.target.value)}>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Input
              header="Опыт работы (лет)"
              placeholder="Например: 5"
              type="number" inputMode="numeric"
              value={experience} onChange={e => setExperience(e.target.value)}
            />
          </Section>
        )}
      </List>

      <div style={{ padding: '24px 16px' }}>
        <Button size="l" stretched mode="filled" onClick={nextStep} loading={loading}>
          {step === 1 ? 'Далее' : 'Завершить регистрацию'}
        </Button>
      </div>
    </div>
  );
};