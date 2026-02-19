import React, { useState } from 'react';
import {
  List,
  Section,
  Cell,
  Button,
  Input,
  Text,
  Avatar
} from '@telegram-apps/telegram-ui';
import {
  Icon28CalendarOutline,
  Icon28ServicesOutline,
  Icon28UserOutline,
  Icon28CoinsOutline
} from '@vkontakte/icons';

import type { Service, Slot, Booking } from '../helpers/api';
import { createBooking } from '../helpers/api';
import { ScreenLayout } from '../components/ScreenLayout';

type TelegramUser = {
  id: number;
  username?: string;
  photo_url?: string;
  first_name?: string;
  last_name?: string;
};

type Props = {
  service: Service;
  slot: Slot;
  onBack: () => void;
  onSuccess: (booking: Booking) => void;
  user: TelegramUser | null;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  // Format: "25 October, 14:30"
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const BookingConfirmScreen: React.FC<Props> = ({
  service,
  slot,
  onBack,
  onSuccess,
  user,
}) => {
  const defaultName =
    user?.first_name ||
    user?.username ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    '';

  const [name, setName] = useState(defaultName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Пожалуйста, укажи своё имя.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const booking = await createBooking({
        name: name.trim(),
        slot_id: slot.id,
        telegram_id: user?.id ?? null,
        username: user?.username ?? null,
        photo_url: user?.photo_url ?? null,
      });

      onSuccess(booking);
    } catch (err) {
      console.error(err);
      setError('Не удалось создать бронь. Попробуйте позже.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenLayout title="Подтверждение" onBack={onBack}>
      <List style={{ background: 'var(--tgui--secondary_bg_color)', minHeight: '100%' }}>

        {/* Booking Details Section */}
        <Section header="Детали записи">
          <Cell
            before={<Icon28ServicesOutline />}
            multiline
            description={service.duration ? `Длительность: ${service.duration} мин` : undefined}
          >
            {service.name}
          </Cell>

          {service.master_name && (
            <Cell before={<Icon28UserOutline />}>
              {service.master_name}
            </Cell>
          )}

          <Cell before={<Icon28CalendarOutline />}>
            {formatTime(slot.time)}
          </Cell>

          {service.price != null && (
             <Cell
               before={<Icon28CoinsOutline />}
               after={
                 <Text weight="2" style={{ color: 'var(--tgui--link_color)' }}>
                   {service.price} ₽
                 </Text>
               }
             >
               Стоимость
             </Cell>
          )}
        </Section>

        {/* User Info Form Section */}
        <Section
           header="Ваши данные"
           footer={error ? <span style={{ color: 'var(--tgui--destructive_text_color)' }}>{error}</span> : "Мы используем это имя для записи."}
        >
          <Input
            header="Имя"
            placeholder="Как к вам обращаться?"
            value={name}
            onChange={(e) => setName(e.target.value)}
            status={error ? 'error' : 'default'}
          />

          {user?.username && (
            <Cell
               before={user.photo_url ? <Avatar src={user.photo_url} size={28} /> : undefined}
               description="Telegram аккаунт привязан"
               interactive={false}
            >
              @{user.username}
            </Cell>
          )}
        </Section>

        {/* Action Button Section */}
        <Section>
          <Cell>
            <Button
              size="l"
              mode="filled" // Primary action
              stretched
              loading={submitting}
              onClick={handleSubmit}
            >
              Подтвердить запись
            </Button>
          </Cell>
        </Section>

      </List>
    </ScreenLayout>
  );
};