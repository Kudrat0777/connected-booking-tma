import React, { useState } from 'react';
import { ScreenLayout } from '../components/ScreenLayout';
import { List, Section, Cell, Button, Switch } from '@telegram-apps/telegram-ui';
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
      <List
        style={{
          background: 'var(--tgui--secondary_bg_color)',
          minHeight: '100%'
        }}
      >
        <Section header="Аккаунт">
          <Cell
            after={String(telegramId)}
            disabled
          >
            Telegram ID
          </Cell>
          <Cell
            onClick={() => { /* Navigate to profile if needed */ }}
            // Add "before" icon here if you have one, e.g. <Icon28User />
          >
            Открыть профиль
          </Cell>
        </Section>

        <Section
          header="Уведомления"
          footer="Включите уведомления, чтобы не пропускать записи и напоминания."
        >
          <Cell
            after={
              <Switch
                checked={notificationsEnabled}
                onChange={handleToggleNotifications}
              />
            }
            onClick={handleToggleNotifications}
          >
            Push-уведомления
          </Cell>
        </Section>

        <Section header="Язык">
          <Cell
            onClick={() => handleSelectLanguage('ru')}
            after={language === 'ru' && <div style={{ color: 'var(--tgui--link_color)' }}>✓</div>}
          >
            Русский
          </Cell>
          <Cell
            onClick={() => handleSelectLanguage('en')}
            after={language === 'en' && <div style={{ color: 'var(--tgui--link_color)' }}>✓</div>}
          >
            English
          </Cell>
        </Section>

        <Section header="Конфиденциальность">
          <Cell onClick={() => { /* Open Terms */ }}>
            Общие условия
          </Cell>
          <Cell onClick={() => { /* Open Privacy */ }}>
            Политика конфиденциальности
          </Cell>
        </Section>

        <Section>
          <Cell>
            <Button
              mode="bezeled"
              size="m"
              stretched
              onClick={() => onLogout?.()}
              style={{ color: 'var(--tgui--destructive_text_color)' }}
            >
              Выйти
            </Button>
          </Cell>
        </Section>
      </List>
    </ScreenLayout>
  );
};

export default SettingsScreen;