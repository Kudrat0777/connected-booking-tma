// Регистрация клиента: имя и телефон, чтобы мастер знал, кто записался, и мог позвонить.
import React, { useEffect, useRef, useState } from 'react';

import { registerClient } from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { PHONE_PLACEHOLDER, formatPhone, isValidPhone, normalizePhone, requestTelegramPhone } from '../helpers/phone';
import { Konnektik } from '../components/Konnektik';
import { PrimaryButton, card, fieldLabel, inputStyle, page } from '../components/ui';

type Props = {
  telegramId: number;
  onBack: () => void;
  onComplete: () => void; // Переход в профиль после успешной регистрации
};

const haptic = (kind: 'select' | 'success' | 'error' = 'select') => {
  const h = (window as any).Telegram?.WebApp?.HapticFeedback;
  if (!h) return;
  if (kind === 'select') h.selectionChanged();
  else h.notificationOccurred(kind);
};

export const ClientRegistrationScreen: React.FC<Props> = ({ telegramId, onBack, onComplete }) => {
  const { t, lang } = useLanguage();
  const tg = (window as any).Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;
  const canAskContact = !!tg?.requestContact && tg?.platform !== 'unknown';

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backRef = useRef(onBack);
  backRef.current = onBack;
  useEffect(() => {
    if (!tg?.BackButton) return;
    const h = () => backRef.current();
    tg.BackButton.show();
    tg.BackButton.onClick(h);
    return () => tg.BackButton.offClick(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasPhone = normalizePhone(phone).length > 4; // больше, чем «+998»

  const fillFromTelegram = async () => {
    haptic();
    const p = await requestTelegramPhone();
    if (p) { setPhone(p); setError(null); haptic('success'); }
    else setError(t('cr_tg_only'));
  };

  const submit = async () => {
    if (!firstName.trim()) { haptic('error'); setError(t('cp_name_req')); return; }
    if (!hasPhone) { haptic('error'); setError(t('cr_phone_req')); return; }
    if (!isValidPhone(phone)) { haptic('error'); setError(t('cp_phone_bad')); return; }
    setLoading(true);
    setError(null);
    try {
      await registerClient({
        telegram_id: telegramId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: user?.username || '',
        phone: normalizePhone(phone),
        language: lang,
      });
      haptic('success');
      onComplete();
    } catch {
      haptic('error');
      setError(t('cp_save_err'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ ...page, padding: '20px 16px 110px' }}>
      <div style={{ textAlign: 'center' }}>
        <Konnektik mood="hello" size={110} />
        <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{t('cr_title')}</div>
        <div style={{ fontSize: 15, color: 'var(--tg-theme-hint-color)', marginTop: 6, lineHeight: 1.4, maxWidth: 340, marginInline: 'auto' }}>
          {t('cr_desc')}
        </div>
      </div>

      <div style={{ ...card, marginTop: 18, padding: '2px 14px 14px' }}>
        <div style={fieldLabel}>{t('cp_first')}</div>
        <input style={inputStyle} value={firstName} maxLength={150} autoComplete="given-name"
          onChange={(e) => { setFirstName(e.target.value); setError(null); }} aria-label={t('cp_first')} />

        <div style={fieldLabel}>{t('cp_last_opt')}</div>
        <input style={inputStyle} value={lastName} maxLength={150} autoComplete="family-name"
          onChange={(e) => setLastName(e.target.value)} aria-label={t('cp_last_opt')} />

        <div style={fieldLabel}>{t('cp_phone')}</div>
        <input style={inputStyle} type="tel" inputMode="tel" autoComplete="tel" value={phone} placeholder={PHONE_PLACEHOLDER}
          aria-label={t('cp_phone')}
          onFocus={() => { if (!phone) setPhone('+998 '); }}
          onBlur={() => { if (!hasPhone) setPhone(''); }}
          onChange={(e) => { setPhone(formatPhone(e.target.value)); setError(null); }} />
        <div style={{ fontSize: 13, marginTop: 6, color: 'var(--tg-theme-hint-color)', lineHeight: 1.35 }}>{t('cp_phone_hint')}</div>
        {canAskContact && (
          <button type="button" onClick={fillFromTelegram} style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 14, fontWeight: 600, backgroundColor: 'var(--brand-soft, #E9F7EF)', color: 'var(--brand-ink, #1D7A46)',
          }}>📱 {t('cp_phone_tg')}</button>
        )}
      </div>

      {error && (
        <div role="alert" style={{ marginTop: 12, padding: '10px 14px', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#E0533D', backgroundColor: 'rgba(224, 83, 61, 0.1)' }}>
          {error}
        </div>
      )}

      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 20, padding: '10px 16px calc(10px + env(safe-area-inset-bottom))',
        backgroundColor: 'var(--tg-theme-secondary-bg-color)', boxShadow: '0 -6px 16px rgba(0,0,0,0.06)',
      }}>
        <PrimaryButton onClick={submit} loading={loading}>{t('cr_submit')}</PrimaryButton>
      </div>
    </div>
  );
};
