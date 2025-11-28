// src/App.tsx
import React from 'react';
import {
  AppRoot,
  Panel,
  Group,
  Header,
  Title,
  Caption,
} from '@telegram-apps/telegram-ui';

function App() {
  return (
    <AppRoot>
      <Panel>
        <Group header={<Header>Connected Booking — тест</Header>}>
          <Title level="2" weight="2">
            Если ты видишь этот текст — React работает.
          </Title>
          <Caption level="1" style={{ marginTop: 8 }}>
            Потом сюда вернём загрузку услуг и бронирование.
          </Caption>
        </Group>
      </Panel>
    </AppRoot>
  );
}

export default App;