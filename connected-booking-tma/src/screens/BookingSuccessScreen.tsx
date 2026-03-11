import React, { useEffect, useRef } from 'react';
import { Placeholder } from '@telegram-apps/telegram-ui';
import lottie from 'lottie-web';
import { Booking } from '../helpers/api';

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

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;

    tg.BackButton.hide();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

    tg.MainButton.setParams({
        text: 'НА ГЛАВНЫЙ ЭКРАН',
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
  }, [onGoHome]);

  const serviceName = booking.service_name || booking.slot?.service?.name || 'услугу';
  const masterName = booking.master_name || booking.slot?.service?.master_name || 'Специалист';

  const d = new Date(booking.slot?.time || new Date());
  const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  const timeStr = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

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
        header="Вы успешно записаны!"
        description={`Ждем вас ${dateStr} в ${timeStr} у мастера ${masterName} на ${serviceName}.`}
      >
        <LottieSuccess />
      </Placeholder>
    </div>
  );
};