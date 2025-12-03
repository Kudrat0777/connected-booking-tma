import React, { useState } from 'react';
import {
  List,
  Section,
  Input,
  Button,
  Cell,
  Avatar
} from '@telegram-apps/telegram-ui';
import { ScreenLayout } from '../components/ScreenLayout';
import { Icon28PhoneOutline, Icon28UserCircleOutline } from '@vkontakte/icons';

type Props = {
  telegramId: number;
  onBack: () => void;
  onLogout: () => void;
};

export const SettingsScreen: React.FC<Props> = ({ telegramId, onBack, onLogout }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <ScreenLayout title="Настройки" onBack={onBack}>
       {/*
           Ограничиваем высоту контента.
           100vh (весь экран) - 60px (хедер) - 60px (таббар) ≈ 120px.
           Оставляем запас.
       */}
       <div style={{
           height: 'calc(100vh - 120px)',
           overflowY: 'auto',
           WebkitOverflowScrolling: 'touch', // Плавный скролл на iOS
           paddingBottom: 40 // Отступ снизу
       }}>
          <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
             <Avatar size={96} fallbackIcon={<Icon28UserCircleOutline />} />
          </div>

          <List>
            <Section header="Личные данные">
              <Input
                header="Имя"
                placeholder="Ваше имя"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <Input
                header="Фамилия"
                placeholder="Ваше фамилия"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </Section>

            <Section header="Контакты">
               <Input
                 header="Телефон"
                 placeholder="+7 999 000-00-00"
                 value={phone}
                 onChange={(e) => setPhone(e.target.value)}
               />
               <Cell>
                 <Button
                    mode="bezeled"
                    before={<Icon28PhoneOutline />}
                    stretched
                    onClick={() => alert('Функция запроса номера в разработке')}
                 >
                    Обновить из Telegram
                 </Button>
               </Cell>
            </Section>

            <Section>
               <Cell>
                 <Button
                    mode="filled"
                    size="l"
                    stretched
                    onClick={() => alert('Сохранение...')}
                 >
                    Сохранить изменения
                 </Button>
               </Cell>
            </Section>

            <Section>
                <Cell>
                    <Button mode="bezeled" size="m" stretched onClick={onLogout} style={{color: 'var(--tgui--destructive_text_color)'}}>
                        Выйти
                    </Button>
                </Cell>
            </Section>
          </List>
      </div>
    </ScreenLayout>
  );
};