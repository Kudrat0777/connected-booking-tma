import React, { useEffect } from 'react';

import { Booking } from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { Konnektik } from '../components/Konnektik';
import { PrimaryButton, card, money } from '../components/ui';
import { useWhen } from './ClientHomeScreen';

type Props = {
  booking: Booking;
  onGoHome: () => void;        // «К моим записям»
  onBookMore?: () => void;     // «На главную»
};

export const BookingSuccessScreen: React.FC<Props> = ({ booking, onGoHome, onBookMore }) => {
  const { t } = useLanguage();
  const when = useWhen();

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;
    tg.BackButton.hide();
    tg.MainButton?.hide();
    tg.HapticFeedback?.notificationOccurred('success');
  }, []);

  const serviceName = booking.service_name || booking.slot?.service?.name || '';
  const masterName = booking.master_name || booking.slot?.service?.master_name || '';
  const info = booking.master_info;
  const pending = booking.status === 'pending';

  return (
    <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', minHeight: '100vh', padding: '40px 16px 32px', color: 'var(--tg-theme-text-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <Konnektik mood="happy" size={150} />
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 16 }}>{t('success_header')}</div>
      <div style={{ fontSize: 15, color: 'var(--tg-theme-hint-color)', marginTop: 6, maxWidth: 320 }}>
        {pending ? t('bs_pending') : t('bs_confirmed')}
      </div>

      <div style={{ ...card, width: '100%', boxSizing: 'border-box', marginTop: 24, textAlign: 'left' }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{when(booking.slot.time)}</div>
        <div style={{ fontSize: 15, marginTop: 4 }}>{serviceName}{info?.price ? ` · ${money(info.price)}` : ''}</div>
        <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', marginTop: 4 }}>
          {[masterName, info?.business, info?.address].filter(Boolean).join(' · ')}
        </div>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto', paddingTop: 24 }}>
        <PrimaryButton onClick={onGoHome}>{t('bs_my_bookings')}</PrimaryButton>
        {onBookMore && <PrimaryButton variant="soft" onClick={onBookMore}>{t('bs_home')}</PrimaryButton>}
      </div>
    </div>
  );
};
