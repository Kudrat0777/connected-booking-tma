import React, { useState } from 'react';
import { List, Section, Input, Button, Text, Title } from '@telegram-apps/telegram-ui';
import { loginMasterWithPhone } from '../helpers/api';

type Props = {
  telegramId: number;
  onBack: () => void;
  onComplete: () => void; // Переход в личный кабинет мастера
};

export const MasterLoginScreen: React.FC<Props> = ({ telegramId, onBack, onComplete }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      setError('Введите телефон и пароль');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await loginMasterWithPhone(phone, password, telegramId);

      // СОХРАНЯЕМ "СЕССИЮ" В ПАМЯТЬ ТЕЛЕФОНА
      localStorage.setItem('is_master_logged_in', 'true');

      onComplete(); // Успешно вошли
    } catch (e: any) {
      setError(e.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <Title level="1" weight="1" style={{ marginBottom: 8 }}>Вход для мастера</Title>
      <Text style={{ marginBottom: 24, color: 'var(--tgui--hint_color)' }}>
        Введите данные, которые вам выдал администратор.
      </Text>

      <List>
        <Section>
          <Input
            header="Номер телефона"
            placeholder="+7 999 000 00 00"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            header="Пароль"
            placeholder="Ваш пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Section>
      </List>

      {error && (
        <Text style={{ color: 'var(--tgui--destructive_text_color)', marginTop: 10, display: 'block', textAlign: 'center' }}>
          {error}
        </Text>
      )}

      <div style={{ marginTop: 24 }}>
        <Button size="l" stretched loading={loading} onClick={handleLogin}>
          Войти
        </Button>
        <Button size="l" mode="plain" stretched onClick={onBack} style={{ marginTop: 8 }}>
          Назад
        </Button>
      </div>
    </div>
  );
};