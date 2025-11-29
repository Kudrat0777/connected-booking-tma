// src/screens/WelcomeScreen.tsx
import React from 'react';
import { Button, Placeholder } from '@telegram-apps/telegram-ui';

type Props = {
  onContinue: () => void;
  onOpenMyBookings?: () => void;
};

export const WelcomeScreen: React.FC<Props> = ({
  onContinue,
  onOpenMyBookings,
}) => {
  return (
    <div style={{ padding: 20 }}>
      <Placeholder
        header="Сервис записи"
        action={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button size="l" mode="primary" onClick={onContinue}>
              Записаться к мастеру
            </Button>
            {onOpenMyBookings && (
              <Button
                size="l"
                mode="outline"
                onClick={onOpenMyBookings}
              >
                Мои записи
              </Button>
            )}
          </div>
        }
      >
        Добро пожаловать! Здесь можно выбрать услугу и забронировать удобное
        время.
      </Placeholder>
    </div>
  );
};