import React, { useEffect, useState } from 'react';
import { List, Section, Cell, Text, Avatar } from '@telegram-apps/telegram-ui';
import {
    Icon28CalendarOutline,
    Icon28UserOutline,
    Icon28MoneyCircleOutline,
    Icon28ClockOutline
} from '@vkontakte/icons';
import { createBooking, Booking, Service, Slot } from '../helpers/api';

type Props = {
  service: Service;
  slot: Slot;
  onBack: () => void;
  onSuccess: (booking: Booking) => void;
  user: any;
};

export const BookingConfirmScreen: React.FC<Props> = ({
  service,
  slot,
  onBack,
  onSuccess,
  user,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Форматируем дату для красивого отображения
  const slotDate = new Date(slot.time);
  const formattedDate = slotDate.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const formattedTime = slotDate.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;

    // 1. ВКЛЮЧАЕМ НАТИВНУЮ КНОПКУ "НАЗАД" В ШАПКЕ TELEGRAM
    tg.BackButton.show();
    tg.BackButton.onClick(onBack);

    // 2. НАСТРАИВАЕМ ГЛАВНУЮ КНОПКУ TELEGRAM (MainButton)
    const priceText = service.price ? `${service.price.toLocaleString('ru-RU')} UZS` : 'Бесплатно';
    tg.MainButton.setText(`Подтвердить • ${priceText}`);
    tg.MainButton.color = tg.themeParams?.button_color || '#3390ec';
    tg.MainButton.textColor = tg.themeParams?.button_text_color || '#ffffff';
    tg.MainButton.show();

    // Функция, которая сработает при нажатии на MainButton
    const handleConfirm = async () => {
      if (isSubmitting) return; // Защита от двойного клика

      setIsSubmitting(true);
      tg.MainButton.showProgress(); // Включаем крутилку загрузки прямо на кнопке Telegram
      tg.MainButton.disable();

      try {
        const booking = await createBooking({
          name: service.name,
          slot_id: slot.id,
          telegram_id: user?.id,
          username: user?.username,
          photo_url: user?.photo_url,
        });

        // Вибрация успеха!
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }

        onSuccess(booking);
      } catch (e: any) {
        console.error(e);
        // Вибрация ошибки!
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }

        // НАТИВНОЕ ВСПЛЫВАЮЩЕЕ ОКНО (Alert) вместо браузерного
        if (tg.showAlert) {
            tg.showAlert('К сожалению, это время уже заняли. Пожалуйста, выберите другое.');
        } else {
            alert('Ошибка при создании брони.');
        }
      } finally {
        tg.MainButton.hideProgress(); // Выключаем лоадер
        tg.MainButton.enable();
        setIsSubmitting(false);
      }
    };

    tg.MainButton.onClick(handleConfirm);

    // ОЧИСТКА: прячем кнопки, когда уходим с этого экрана
    return () => {
      tg.BackButton.offClick(onBack);
      tg.BackButton.hide();

      tg.MainButton.offClick(handleConfirm);
      tg.MainButton.hide();
    };
  }, [service, slot, onBack, onSuccess, user, isSubmitting]);

  return (
    <div style={{
        paddingBottom: 40,
        backgroundColor: 'var(--tg-theme-secondary-bg-color)',
        minHeight: '100vh'
    }}>

      <div style={{ padding: '32px 20px 20px', textAlign: 'center' }}>
          <Avatar
             size={80}
             src={user?.photo_url}
             fallbackIcon={<Icon28UserOutline width={40} height={40}/>}
             style={{ margin: '0 auto 16px' }}
          />
          <Text weight="1" style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>
              Проверьте данные
          </Text>
          <Text style={{ color: 'var(--tg-theme-hint-color)' }}>
              Вы почти записаны! Проверьте детали бронирования ниже.
          </Text>
      </div>

      {/* Красивый список деталей в стиле Telegram */}
      <List>
        <Section header="ДЕТАЛИ ЗАПИСИ">
          <Cell
             before={<Icon28CalendarOutline style={{ color: 'var(--tg-theme-link-color)' }}/>}
             subtitle="Дата и время"
          >
             {formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)} в {formattedTime}
          </Cell>

          <Cell
             before={<Icon28UserOutline style={{ color: 'var(--tg-theme-link-color)' }}/>}
             subtitle="Мастер"
          >
             {service.master_name || 'Специалист'}
          </Cell>

          <Cell
             before={<Icon28ClockOutline style={{ color: 'var(--tg-theme-link-color)' }}/>}
             subtitle="Услуга"
          >
             {service.name} {service.duration ? `(${service.duration} мин)` : ''}
          </Cell>

          <Cell
             before={<Icon28MoneyCircleOutline style={{ color: 'var(--tg-theme-link-color)' }}/>}
             subtitle="Стоимость"
          >
             {service.price ? `${service.price.toLocaleString('ru-RU')} UZS` : 'Не указана'}
          </Cell>
        </Section>
      </List>

    </div>
  );
};