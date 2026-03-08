import React, { useState } from 'react';
import {
  List,
  Input,
  Button,
  Section,
  Cell
} from '@telegram-apps/telegram-ui';
import { Icon28PhoneOutline } from '@vkontakte/icons';
import { registerClient } from '../helpers/api';
import '../css/ClientRegistrationScreen.css';

type Props = {
  telegramId: number;
  onBack: () => void;
  onComplete: () => void; // Переход в профиль после успешной регистрации
};

export const ClientRegistrationScreen: React.FC<Props> = ({
  telegramId,
  onBack,
  onComplete,
}) => {
  const tg = (window as any).Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Нативная функция Telegram для запроса номера телефона
  const requestPhone = () => {
    if (tg && tg.requestContact) {
      tg.requestContact((ok: boolean, result: any) => {
        if (ok && result?.response?.contact?.phone_number) {
          let p = result.response.contact.phone_number;
          if (!p.startsWith('+')) p = '+' + p;
          setPhone(p);
        } else if (ok && result?.contact?.phone_number) {
          let p = result.contact.phone_number;
          if (!p.startsWith('+')) p = '+' + p;
          setPhone(p);
        } else {
          setError('Не удалось получить номер. Введите его вручную.');
        }
      });
    } else {
      setError('Запрос контакта работает только на телефоне. Введите номер вручную.');
    }
  };

  const handleRegister = async () => {
    if (!firstName.trim()) {
      setError('Пожалуйста, введите ваше имя.');
      return;
    }
    if (!phone.trim()) {
      setError('Пожалуйста, укажите номер телефона.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await registerClient({
        telegram_id: telegramId,
        first_name: firstName,
        last_name: lastName,
        username: user?.username || '',
        phone: phone,
      });
      onComplete(); // Идем в профиль
    } catch (e: any) {
      setError(e.message || 'Ошибка регистрации. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="client-registration-root">
      <div className="client-registration-container">
        <div className="client-registration-header">
          <h1 className="client-registration-title">Давайте знакомиться!</h1>
          <p className="client-registration-description">
            Укажите свои данные, чтобы мастера могли связаться с вами, а вы — управлять своими записями.
          </p>
        </div>

        <div className="client-registration-form">
          <List>
            <Section header="Контактные данные">
              <Input
                header="Имя"
                placeholder="Иван"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <Input
                header="Фамилия (необязательно)"
                placeholder="Иванов"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              <Input
                header="Номер телефона"
                placeholder="+7 999 000 00 00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <Cell>
                <Button
                  mode="bezeled"
                  before={<Icon28PhoneOutline />}
                  stretched
                  onClick={requestPhone}
                >
                  Поделиться контактом из Telegram
                </Button>
              </Cell>
            </Section>
          </List>

          {error && (
            <span className="client-registration-error">
              {error}
            </span>
          )}
        </div>

        <div className="client-registration-actions">
          <Button size="l" stretched loading={loading} onClick={handleRegister}>
            Сохранить и продолжить
          </Button>
          <Button size="l" mode="plain" stretched onClick={onBack} style={{ color: 'var(--tgui--hint_color)' }}>
            Назад
          </Button>
        </div>
      </div>
    </div>
  );
};