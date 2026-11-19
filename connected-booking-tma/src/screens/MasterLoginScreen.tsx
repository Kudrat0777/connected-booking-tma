// Вход мастера по телефону и паролю: для аккаунтов, которые создал администратор.
// После входа аккаунт привязывается к текущему Telegram.
import React, { useEffect, useRef, useState } from 'react';

import { loginMasterWithPhone } from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { PHONE_PLACEHOLDER, formatPhone, normalizePhone } from '../helpers/phone';
import { Konnektik } from '../components/Konnektik';
import { PrimaryButton, card, fieldLabel, inputStyle, page } from '../components/ui';

type Props = {
  telegramId: number;
  onBack: () => void;
  onComplete: () => void; // Переход в личный кабинет мастера
};

const haptic = (kind: 'success' | 'error') => (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred(kind);

export const MasterLoginScreen: React.FC<Props> = ({ telegramId, onBack, onComplete }) => {
  const { t } = useLanguage();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backRef = useRef(onBack);
  backRef.current = onBack;
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.BackButton) return;
    const h = () => backRef.current();
    tg.BackButton.show();
    tg.BackButton.onClick(h);
    tg.MainButton?.hide();
    return () => tg.BackButton.offClick(h);
  }, []);

  const submit = async () => {
    if (loading) return;
    if (normalizePhone(phone).length < 8 || !password) { haptic('error'); setError(t('ml_err_empty')); return; }
    setLoading(true);
    setError(null);
    try {
      await loginMasterWithPhone(normalizePhone(phone), password, telegramId);
      localStorage.setItem('is_master_logged_in', 'true');
      haptic('success');
      onComplete();
    } catch (e: any) {
      haptic('error');
      // Сервер отвечает по-русски — показываем свой перевод, кроме понятного конфликта аккаунтов
      const msg = String(e?.message || '');
      setError(msg.includes('Telegram') ? msg : t('ml_err'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ ...page, padding: '24px 16px 110px' }}>
      <div style={{ textAlign: 'center' }}>
        <Konnektik mood="explain" size={110} />
        <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{t('ml_title')}</div>
        <div style={{ fontSize: 15, color: 'var(--tg-theme-hint-color)', marginTop: 6, lineHeight: 1.4, maxWidth: 340, marginInline: 'auto' }}>
          {t('ml_desc')}
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ ...card, marginTop: 18, padding: '2px 14px 14px' }}>
        <div style={fieldLabel}>{t('cp_phone')}</div>
        <input style={inputStyle} type="tel" inputMode="tel" autoComplete="tel" value={phone} placeholder={PHONE_PLACEHOLDER}
          aria-label={t('cp_phone')}
          onFocus={() => { if (!phone) setPhone('+998 '); }}
          onChange={(e) => { setPhone(formatPhone(e.target.value)); setError(null); }} />

        <div style={fieldLabel}>{t('ml_password')}</div>
        <div style={{ position: 'relative' }}>
          <input style={{ ...inputStyle, paddingRight: 96 }} type={showPassword ? 'text' : 'password'} autoComplete="current-password"
            value={password} aria-label={t('ml_password')}
            onChange={(e) => { setPassword(e.target.value); setError(null); }} />
          <button type="button" onClick={() => setShowPassword((v) => !v)} style={{
            position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: 'var(--brand-ink)', padding: '6px 8px',
          }}>{showPassword ? t('ml_hide') : t('ml_show')}</button>
        </div>
        {/* Enter на клавиатуре отправляет форму */}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>

      {error && (
        <div role="alert" style={{ marginTop: 12, padding: '10px 14px', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#E0533D', backgroundColor: 'rgba(224, 83, 61, 0.1)' }}>
          {error}
        </div>
      )}

      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 20, padding: '10px 16px calc(10px + env(safe-area-inset-bottom))',
        backgroundColor: 'var(--tg-theme-secondary-bg-color)', boxShadow: '0 -6px 16px rgba(0,0,0,0.06)',
      }}>
        <PrimaryButton onClick={submit} loading={loading}>{t('ml_submit')}</PrimaryButton>
      </div>
    </div>
  );
};
