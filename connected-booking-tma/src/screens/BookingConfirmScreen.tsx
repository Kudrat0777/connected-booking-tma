import React, { useEffect, useRef } from 'react';
import { List, Section, Cell, Text, Avatar } from '@telegram-apps/telegram-ui';
import {
    Icon28CalendarOutline,
    Icon28UserOutline,
    Icon28MoneyCircleOutline,
    Icon28ClockOutline
} from '@vkontakte/icons';
import { createBooking, Booking, Service, Slot } from '../helpers/api';

import { useLanguage } from '../helpers/LanguageContext';

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
  const { t, lang } = useLanguage();

  const isSubmittingRef = useRef(false);
  const onBackRef = useRef(onBack);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onBackRef.current = onBack;
    onSuccessRef.current = onSuccess;
  }, [onBack, onSuccess]);

  const slotDate = new Date(slot.time);

  // Локализуем дату в зависимости от выбранного языка
  const localeForDate = lang === 'uz' ? 'uz-UZ' : (lang === 'en' ? 'en-US' : 'ru-RU');

  const formattedDate = slotDate.toLocaleDateString(localeForDate, { weekday: 'long', day: 'numeric', month: 'long' });
  const formattedTime = slotDate.toLocaleTimeString(localeForDate, { hour: '2-digit', minute: '2-digit', hour12: false });

  const priceText = service.price ? `${service.price.toLocaleString('ru-RU')} UZS` : t('free');

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

        // Переведенные алерты
        if (tg.showAlert) tg.showAlert(t('error_slot_taken'));
        else alert(t('error_booking'));

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
        text: `${t('confirm_btn')} • ${priceText}`,
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
  }, [priceText, service.name, slot.id, user, t]);

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
                 border: '3px solid var(--tg-theme-bg-color)',
                 boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
             }}
          />
          <Text weight="1" style={{ fontSize: 24, display: 'block', marginBottom: 8, color: 'var(--tg-theme-text-color)' }}>
              {t('check_details_title')}
          </Text>
          <Text style={{ color: 'var(--tg-theme-hint-color)', fontSize: 15 }}>
              {t('check_details_desc')}
          </Text>
      </div>

      {/* СПИСОК ДЕТАЛЕЙ */}
      <List style={{ padding: '0 16px' }}>
        <Section header={t('booking_details_header')}>
          <Cell
             before={<Icon28CalendarOutline style={{ color: 'var(--tg-theme-button-color)' }}/>}
             subtitle={t('date_and_time')}
          >
             <span style={{ fontWeight: 500 }}>
                 {/* Формат: Пятница, 10 мая в 14:00 */}
                 {formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)} {t('at_time')} {formattedTime}
             </span>
          </Cell>

          <Cell
             before={<Icon28UserOutline style={{ color: 'var(--tg-theme-button-color)' }}/>}
             subtitle={t('master')}
          >
             <span style={{ fontWeight: 500 }}>{service.master_name || t('specialist')}</span>
          </Cell>

          <Cell
             before={<Icon28ClockOutline style={{ color: 'var(--tg-theme-button-color)' }}/>}
             subtitle={t('service')}
          >
             <span style={{ fontWeight: 500 }}>
                 {service.name} {service.duration ? `(${service.duration} ${t('min')})` : ''}
             </span>
          </Cell>

          <Cell
             before={<Icon28MoneyCircleOutline style={{ color: 'var(--tg-theme-button-color)' }}/>}
             subtitle={t('cost')}
          >
             <span style={{ fontWeight: 600, color: 'var(--tg-theme-text-color)' }}>{priceText}</span>
          </Cell>
        </Section>
      </List>
    </div>
  );
};