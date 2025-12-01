import React, { useState } from 'react';
import { ScreenLayout } from '../components/ScreenLayout';
import { List, Button } from '@telegram-apps/telegram-ui';
import '../css/SettingsScreen.css';

type Props = {
  telegramId: number;
  onBack: () => void;
  onLogout?: () => void;
  onChangeLanguage?: (lang: string) => void;
};

export const SettingsScreen: React.FC<Props> = ({ telegramId, onBack, onLogout, onChangeLanguage }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [language, setLanguage] = useState<string>('ru');

  const handleToggleNotifications = () => {
    setNotificationsEnabled((s) => !s);
    // TODO: persist setting to backend/localStorage if needed
  };

  const handleSelectLanguage = (lang: string) => {
    setLanguage(lang);
    onChangeLanguage?.(lang);
  };

  return (
    <ScreenLayout title="Настройки" onBack={onBack}>
      <div className="ss-container">
        <List style={{ marginBottom: 12 }}>
          <div className="ss-section">
            <div className="ss-section__title">Аккаунт</div>
            <div className="ss-row">
              <div className="ss-row__label">Telegram ID</div>
              <div className="ss-row__value">{telegramId}</div>
            </div>
            <div className="ss-row">
              <div className="ss-row__label">Профиль</div>
              <div className="ss-row__value ss-link">Открыть профиль</div>
            </div>
          </div>
        </List>

        <List style={{ marginBottom: 12 }}>
          <div className="ss-section">
            <div className="ss-section__title">Уведомления</div>
            <div className="ss-row ss-toggle-row" onClick={handleToggleNotifications} role="button" tabIndex={0}>
              <div className="ss-row__label">Push‑уведомления</div>
              <div className={`ss-toggle ${notificationsEnabled ? 'ss-toggle_on' : 'ss-toggle_off'}`}>
                <div className="ss-toggle__knob" />
              </div>
            </div>
            <div className="ss-note">Включите уведомления, чтобы не пропускать записи и напоминания.</div>
          </div>
        </List>

        <List style={{ marginBottom: 12 }}>
          <div className="ss-section">
            <div className="ss-section__title">Язык</div>
            <div className="ss-row ss-select-row">
              <button
                type="button"
                className={`ss-lang ${language === 'ru' ? 'ss-lang_active' : ''}`}
                onClick={() => handleSelectLanguage('ru')}
              >
                Русский
              </button>
              <button
                type="button"
                className={`ss-lang ${language === 'en' ? 'ss-lang_active' : ''}`}
                onClick={() => handleSelectLanguage('en')}
              >
                English
              </button>
            </div>
          </div>
        </List>

        <List style={{ marginBottom: 12 }}>
          <div className="ss-section">
            <div className="ss-section__title">Конфиденциальность</div>
            <div className="ss-row">
              <div className="ss-row__label">Общие условия</div>
              <div className="ss-row__value ss-link">Просмотреть</div>
            </div>
            <div className="ss-row">
              <div className="ss-row__label">Политика конфиденциальности</div>
              <div className="ss-row__value ss-link">Просмотреть</div>
            </div>
          </div>
        </List>

        <div style={{ padding: '8px 12px' }}>
          <Button mode="outline" size="m" onClick={() => onLogout?.()}>
            Выйти
          </Button>
        </div>
      </div>
    </ScreenLayout>
  );
};

export default SettingsScreen;