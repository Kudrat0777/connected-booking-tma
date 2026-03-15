import React, { useEffect, useRef } from 'react';
import { Placeholder } from '@telegram-apps/telegram-ui';
import lottie from 'lottie-web';
import { Booking } from '../helpers/api';

// ИМПОРТИРУЕМ ХУК ЛОКАЛИЗАЦИИ
import { useLanguage } from '../helpers/LanguageContext';

const LottieSuccess: React.FC<{ size?: number }> = ({ size = 140 }) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;

    try {
      const anim = lottie.loadAnimation({
        container: container.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: '/stickers/duck_small.json',
      });
      return () => anim.destroy();
    } catch (e) {
      console.error(e);
    }
  }, []);

  return (
    <div
        ref={container}
        style={{ width: size, height: size, margin: '0 auto 24px' }}
    />
  );
};

type Props = {
  booking: Booking;
  onGoHome: () => void;
};

export const BookingSuccessScreen: React.FC<Props> = ({ booking, onGoHome }) => {
  // ПОДКЛЮЧАЕМ ПЕРЕВОДЫ
  const { t, lang } = useLanguage();

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;

    tg.BackButton.hide();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

    tg.MainButton.setParams({
        text: t('btn_to_main'), // ПЕРЕВОД КНОПКИ
        color: tg.themeParams?.button_color || '#3390ec',
        text_color: tg.themeParams?.button_text_color || '#ffffff',
        is_active: true,
        is_visible: true
    });
    tg.MainButton.onClick(onGoHome);
    tg.MainButton.show();

    return () => {
      tg.MainButton.offClick(onGoHome);
      tg.MainButton.hide();
    };
  }, [onGoHome, t]);

  const serviceName = booking.service_name || booking.slot?.service?.name || t('service');
  const masterName = booking.master_name || booking.slot?.service?.master_name || t('specialist');

  const d = new Date(booking.slot?.time || new Date());

  // Форматируем дату в зависимости от выбранного языка
  const localeForDate = lang === 'uz' ? 'uz-UZ' : (lang === 'en' ? 'en-US' : 'ru-RU');

  const dateStr = d.toLocaleDateString(localeForDate, { day: 'numeric', month: 'long' });
  const timeStr = d.toLocaleTimeString(localeForDate, { hour: '2-digit', minute: '2-digit', hour12: false });

  // Собираем фразу описания (немного отличается порядок слов для английского)
  let descriptionText = '';
  if (lang === 'en') {
      descriptionText = `${t('waiting_for_you')} ${dateStr} ${t('at_time')} ${timeStr} ${t('with_master')} ${masterName} ${t('for_service')} ${serviceName}.`;
  } else if (lang === 'uz') {
      // Sizni 10 May soat 14:00 da usta Master xizmatiga kutamiz
      descriptionText = `${t('waiting_for_you')} ${dateStr} ${t('at_time')} ${timeStr} ${masterName} ${t('with_master')} ${serviceName} ${t('for_service')}.`;
  } else {
      // Ждем вас 10 мая в 14:00 у мастера Name на услугу Service
      descriptionText = `${t('waiting_for_you')} ${dateStr} ${t('at_time')} ${timeStr} ${t('with_master')} ${masterName} ${t('for_service')} ${serviceName}.`;
  }

  return (
    <div style={{
        backgroundColor: 'var(--tg-theme-bg-color)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: '80px'
    }}>
      <Placeholder
        header={t('success_header')}
        description={descriptionText}
      >
        <LottieSuccess />
      </Placeholder>
    </div>
  );
};