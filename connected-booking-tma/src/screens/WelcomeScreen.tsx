// src/screens/WelcomeScreen.tsx
import React from 'react';
import { Placeholder, Button } from '@telegram-apps/telegram-ui';

type Props = {
  onContinue: () => void;
};

export const WelcomeScreen: React.FC<Props> = ({ onContinue }) => {
  return (
    <div style={{ padding: 16, height: '100%', boxSizing: 'border-box' }}>
      <Placeholder
        header="Connected Booking"
        description="Добро пожаловать! Здесь позже появится запись к мастерам и список услуг."
      >
        <img
          alt="Telegram sticker"
          src="https://xelene.me/telegram.gif"
          style={{
            display: 'block',
            width: 144,
            height: 144,
            marginBottom: 16,
          }}
        />

        <Button size="l" mode="primary" onClick={onContinue}>
          Продолжить
        </Button>
      </Placeholder>
    </div>
  );
};