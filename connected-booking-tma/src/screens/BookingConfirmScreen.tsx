import React, { useEffect, useRef } from 'react';
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
  const isSubmittingRef = useRef(false);
  const onBackRef = useRef(onBack);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onBackRef.current = onBack;
    onSuccessRef.current = onSuccess;
  }, [onBack, onSuccess]);

  const slotDate = new Date(slot.time);
  const formattedDate = slotDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  const formattedTime = slotDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const priceText = service.price ? `${service.price.toLocaleString('ru-RU')} UZS` : 'Бесплатно';

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg || !tg.MainButton) return;

    const handleBackClick = () => onBackRef.current();

    const handleMainClick = async () => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;

      tg.MainButton.showProgress();
      tg.MainButton.disable();

      try {
        const booking = await createBooking({
          name: service.name,
          slot_id: slot.id,
          telegram_id: user?.id,
          username: user?.username,
          photo_url: user?.photo_url,
        });

        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        tg.MainButton.hideProgress();
        onSuccessRef.current(booking);

      } catch (e: any) {
        console.error(e);
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        if (tg.showAlert) tg.showAlert('К сожалению, это время уже заняли. Пожалуйста, выберите другое.');
        else alert('Ошибка при создании брони.');

        isSubmittingRef.current = false;
        tg.MainButton.hideProgress();
        tg.MainButton.enable();
      }
    };

    tg.BackButton.onClick(handleBackClick);
    tg.BackButton.show();

    const btnColor = tg.themeParams?.button_color || '#3390ec';
    const textColor = tg.themeParams?.button_text_color || '#ffffff';

    tg.MainButton.setParams({
        text: `ПОДТВЕРДИТЬ ЗАПИСЬ • ${priceText}`,
        color: btnColor,
        text_color: textColor,
        is_active: true,
        is_visible: true
    });
    tg.MainButton.onClick(handleMainClick);
    tg.MainButton.show();

    return () => {
      tg.BackButton.offClick(handleBackClick);
      tg.BackButton.hide();
      tg.MainButton.offClick(handleMainClick);
      tg.MainButton.hide();
    };
  }, [priceText, service.name, slot.id, user]);

  return (
    <div style={{
        paddingBottom: 40,
        backgroundColor: 'var(--tg-theme-secondary-bg-color)',
        minHeight: '100vh'
    }}>
      {/* ШАПКА С АВАТАРКОЙ */}
      <div style={{ padding: '40px 20px 24px', textAlign: 'center' }}>
          <Avatar
             size={88}
             src={user?.photo_url}
             fallbackIcon={<Icon28UserOutline width={44} height={44}/>}
             style={{
                 margin: '0 auto 16px',
                 border: '3px solid var(--tg-theme-bg-color)', // Красивая обводка в цвет карточек
                 boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
             }}
          />
          <Text weight="1" style={{ fontSize: 24, display: 'block', marginBottom: 8, color: 'var(--tg-theme-text-color)' }}>
              Проверьте данные
          </Text>
          <Text style={{ color: 'var(--tg-theme-hint-color)', fontSize: 15 }}>
              Вы почти записаны! Проверьте детали бронирования ниже.
          </Text>
      </div>

      {/* СПИСОК ДЕТАЛЕЙ */}
      <List style={{ padding: '0 16px' }}>
        <Section header="ДЕТАЛИ ЗАПИСИ">
          <Cell
             before={<Icon28CalendarOutline style={{ color: 'var(--tg-theme-button-color)' }}/>}
             subtitle="Дата и время"
          >
             <span style={{ fontWeight: 500 }}>
                 {formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)} в {formattedTime}
             </span>
          </Cell>

          <Cell
             before={<Icon28UserOutline style={{ color: 'var(--tg-theme-button-color)' }}/>}
             subtitle="Мастер"
          >
             <span style={{ fontWeight: 500 }}>{service.master_name || 'Специалист'}</span>
          </Cell>

          <Cell
             before={<Icon28ClockOutline style={{ color: 'var(--tg-theme-button-color)' }}/>}
             subtitle="Услуга"
          >
             <span style={{ fontWeight: 500 }}>
                 {service.name} {service.duration ? `(${service.duration} мин)` : ''}
             </span>
          </Cell>

          <Cell
             before={<Icon28MoneyCircleOutline style={{ color: 'var(--tg-theme-button-color)' }}/>}
             subtitle="Стоимость"
          >
             <span style={{ fontWeight: 600, color: 'var(--tg-theme-text-color)' }}>{priceText}</span>
          </Cell>
        </Section>
      </List>
    </div>
  );
};