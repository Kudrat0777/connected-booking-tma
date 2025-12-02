import React, { useState } from 'react';
import {
  List,
  Section,
  Input,
  Button,
  Text,
  Placeholder,
  Title,
  Cell,
  Multiline
} from '@telegram-apps/telegram-ui';
import { Icon28CheckCircleOutline } from '@vkontakte/icons';
import { registerMaster, createServiceByMaster } from '../helpers/api';

type Props = {
  telegramId: number;
  initialName?: string;
  onBack: () => void;
  onComplete: () => void; // Переход в личный кабинет мастера
};

type Step = 'info' | 'service' | 'finish';

export const MasterRegistrationScreen: React.FC<Props> = ({
  telegramId,
  initialName = '',
  onBack,
  onComplete,
}) => {
  const [step, setStep] = useState<Step>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState('');

  const [serviceName, setServiceName] = useState('Стрижка');
  const [servicePrice, setServicePrice] = useState('1000');
  const [serviceDuration, setServiceDuration] = useState('60');

  // --- Step 1: Register Master ---
  const handleInfoSubmit = async () => {
    if (!name.trim()) {
      setError('Пожалуйста, введите имя.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Регистрируем мастера в базе
      await registerMaster(name, telegramId);
      // (Опционально можно сразу и био обновить через patch, но пока пропустим для простоты)
      setStep('service');
    } catch (e) {
      console.error(e);
      setError('Ошибка регистрации. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2: Add First Service ---
  const handleServiceSubmit = async () => {
    if (!serviceName || !servicePrice || !serviceDuration) {
      setError('Заполните все поля услуги.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createServiceByMaster(
        telegramId,
        serviceName,
        Number(servicePrice),
        Number(serviceDuration)
      );
      setStep('finish');
    } catch (e) {
      console.error(e);
      setError('Не удалось создать услугу.');
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERERS ---

  if (step === 'info') {
    return (
      <div style={{ padding: 16 }}>
        <Title level="1" weight="1" style={{ marginBottom: 8 }}>Знакомство</Title>
        <Text style={{ marginBottom: 24, color: 'var(--tgui--hint_color)' }}>
          Как вас будут видеть клиенты?
        </Text>

        <List>
          <Section>
            <Input
              header="Имя и Фамилия"
              placeholder="Иван Иванов"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              header="О себе (кратко)"
              placeholder="Опыт 5 лет, люблю сложные стрижки..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </Section>
        </List>

        {error && <Text style={{ color: 'var(--tgui--destructive_text_color)', marginTop: 10 }}>{error}</Text>}

        <div style={{ marginTop: 24 }}>
          <Button size="l" stretched loading={loading} onClick={handleInfoSubmit}>
            Продолжить
          </Button>
          <Button size="l" mode="plain" stretched onClick={onBack} style={{ marginTop: 8 }}>
            Назад
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'service') {
    return (
      <div style={{ padding: 16 }}>
        <Title level="1" weight="1" style={{ marginBottom: 8 }}>Первая услуга</Title>
        <Text style={{ marginBottom: 24, color: 'var(--tgui--hint_color)' }}>
          Добавьте хотя бы одну услугу, чтобы клиенты могли к вам записаться.
        </Text>

        <List>
          <Section header="Параметры услуги">
            <Input
              header="Название"
              placeholder="Например: Мужская стрижка"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
            />
            <Input
              header="Цена (₽)"
              type="number"
              placeholder="1000"
              value={servicePrice}
              onChange={(e) => setServicePrice(e.target.value)}
            />
            <Input
              header="Длительность (мин)"
              type="number"
              placeholder="60"
              value={serviceDuration}
              onChange={(e) => setServiceDuration(e.target.value)}
            />
          </Section>
        </List>

        {error && <Text style={{ color: 'var(--tgui--destructive_text_color)', marginTop: 10 }}>{error}</Text>}

        <Button size="l" stretched loading={loading} onClick={handleServiceSubmit} style={{ marginTop: 24 }}>
          Создать услугу
        </Button>
      </div>
    );
  }

  if (step === 'finish') {
    return (
      <Placeholder
        header="Вы в команде!"
        description="Ваш профиль мастера создан. Теперь вы можете настраивать расписание и управлять записями."
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
           <Icon28CheckCircleOutline width={64} height={64} style={{ color: 'var(--tgui--section_header_text_color)' }} />
        </div>
        <Button size="l" stretched onClick={onComplete}>
          Перейти в кабинет
        </Button>
      </Placeholder>
    );
  }

  return null;
};