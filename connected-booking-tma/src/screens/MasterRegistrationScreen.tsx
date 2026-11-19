// Регистрация мастера: шаг 1 — как вы работаете (сам или салон), шаг 2 — данные.
// По ссылке-приглашению сразу второй шаг: вступление в команду заведения.
import React, { useEffect, useRef, useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';

import { onboardMaster, fetchInviteInfo, BusinessShort } from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { fill } from '../helpers/translationsBusiness';
import { PHONE_PLACEHOLDER, formatPhone, isValidPhone, normalizePhone } from '../helpers/phone';
import { Konnektik } from '../components/Konnektik';
import { Chip, PrimaryButton, card, fieldLabel, inputStyle, page, tgAlert } from '../components/ui';

// Значения хранятся в базе по-русски (по ним работает поиск), подписи — на языке пользователя
const CATEGORIES = [
  'Барбершоп', 'Салон красоты', 'Массаж',
  'Маникюр / Педикюр', 'Брови и Ресницы',
  'Медицина', 'Спорт / Фитнес', 'Автосервис', 'Другое',
];
const CITIES = ['Ургенч', 'Ташкент', 'Самарканд', 'Бухара', 'Хива'];
const CITY_KEYS = ['city_urgench', 'city_tashkent', 'city_samarkand', 'city_bukhara', 'city_khiva'];

type Mode = 'solo' | 'team' | 'join';
type Step = 'mode' | 'details';

type Props = {
  telegramId: number;
  /** Код из ссылки-приглашения: регистрация сразу в команду заведения */
  inviteCode?: string | null;
  onBack: () => void;
  onComplete: () => void;
};

const haptic = (type: 'select' | 'success' | 'error' = 'select') => {
  const h = (window as any).Telegram?.WebApp?.HapticFeedback;
  if (!h) return;
  if (type === 'select') h.selectionChanged();
  else h.notificationOccurred(type);
};

const stickyBar: React.CSSProperties = {
  position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 20, padding: '10px 16px calc(10px + env(safe-area-inset-bottom))',
  backgroundColor: 'var(--tg-theme-secondary-bg-color)', boxShadow: '0 -6px 16px rgba(0,0,0,0.06)',
};

export const MasterRegistrationScreen: React.FC<Props> = ({ inviteCode, onBack, onComplete }) => {
  const { lang, t } = useLanguage();
  const tg = (window as any).Telegram?.WebApp;
  const tgUser = tg?.initDataUnsafe?.user;

  const [mode, setMode] = useState<Mode>(inviteCode ? 'join' : 'solo');
  const [step, setStep] = useState<Step>(inviteCode ? 'details' : 'mode');
  const [loading, setLoading] = useState(false);

  const [invite, setInvite] = useState<BusinessShort | null>(null);
  const [inviteState, setInviteState] = useState<'idle' | 'loading' | 'ok' | 'bad'>(inviteCode ? 'loading' : 'idle');

  const [name, setName] = useState([tgUser?.first_name, tgUser?.last_name].filter(Boolean).join(' '));
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [city, setCity] = useState(CITIES[0]);
  const [experience, setExperience] = useState(0);

  useEffect(() => {
    if (!inviteCode) return;
    fetchInviteInfo(inviteCode).then((b) => {
      setInvite(b);
      setInviteState(b ? 'ok' : 'bad');
      if (b) { setCategory(CATEGORIES.includes(b.category) ? b.category : CATEGORIES[0]); setCity(b.city || CITIES[0]); }
    }).catch(() => setInviteState('bad'));
  }, [inviteCode]);

  // Кнопка «Назад» Telegram: на шаге данных возвращаемся к выбору режима
  const backRef = useRef<() => void>(() => {});
  backRef.current = () => {
    if (step === 'details' && !inviteCode) setStep('mode');
    else onBack();
  };
  useEffect(() => {
    if (!tg?.BackButton) return;
    const handler = () => backRef.current();
    tg.BackButton.show();
    tg.BackButton.onClick(handler);
    tg.MainButton?.hide();
    return () => tg.BackButton.offClick(handler);
  }, [tg]);

  const phoneOk = isValidPhone(phone);

  const submit = async () => {
    if (!name.trim() || !normalizePhone(phone)) { haptic('error'); setPhoneTouched(true); tgAlert(t('reg_err_name_phone')); return; }
    if (!phoneOk) { haptic('error'); setPhoneTouched(true); return; }
    if (mode === 'team' && !businessName.trim()) { haptic('error'); tgAlert(t('reg_err_business')); return; }

    setLoading(true);
    try {
      await onboardMaster({
        mode,
        name: name.trim(),
        phone: normalizePhone(phone),
        category,
        city,
        experience_years: experience,
        business_name: mode === 'team' ? businessName.trim() : undefined,
        address: mode === 'team' ? address.trim() : undefined,
        invite_code: mode === 'join' ? inviteCode || undefined : undefined,
        language: lang,
      });
      haptic('success');
      onComplete();
    } catch (e: any) {
      haptic('error');
      tgAlert(e.message || t('reg_err_generic'));
    } finally {
      setLoading(false);
    }
  };

  // ---------- Шаг 1: как вы работаете ----------
  if (step === 'mode') {
    const option = (m: Mode, emoji: string, title: string, desc: string) => {
      const on = mode === m;
      return (
        <button type="button" role="radio" aria-checked={on} onClick={() => { haptic(); setMode(m); }} style={{
          ...card, display: 'flex', alignItems: 'center', gap: 14, padding: 16, width: '100%', textAlign: 'left', cursor: 'pointer',
          fontFamily: 'inherit', color: 'var(--tg-theme-text-color)',
          border: `2px solid ${on ? 'var(--brand-accent, #50C878)' : 'transparent'}`,
          backgroundColor: on ? 'var(--brand-soft, #E9F7EF)' : 'var(--tg-theme-bg-color)', transition: 'background-color .15s, border-color .15s',
        }}>
          <div aria-hidden="true" style={{ fontSize: 30, flex: '0 0 auto' }}>{emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{title}</div>
            <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', lineHeight: 1.35, marginTop: 3 }}>{desc}</div>
          </div>
          <span aria-hidden="true" style={{
            width: 22, height: 22, borderRadius: 11, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800,
            border: on ? 'none' : '2px solid var(--tg-theme-hint-color)', opacity: on ? 1 : 0.4,
            backgroundColor: on ? 'var(--brand-accent, #50C878)' : 'transparent', color: 'var(--brand-on-accent, #14261B)',
          }}>{on ? '✓' : ''}</span>
        </button>
      );
    };

    return (
      <div style={{ ...page, padding: '24px 16px 110px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tg-theme-hint-color)' }}>{fill(t('reg_step'), { n: 1 })}</div>
          <Konnektik mood="hello" size={120} />
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{t('reg_how_title')}</div>
          <div style={{ fontSize: 15, color: 'var(--tg-theme-hint-color)', marginTop: 6, lineHeight: 1.4 }}>{t('reg_how_desc')}</div>
        </div>

        <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
          {option('solo', '✂️', t('reg_solo_title'), t('reg_solo_desc'))}
          {option('team', '🏠', t('reg_team_title'), t('reg_team_desc'))}
        </div>

        <div style={{ textAlign: 'center', color: 'var(--tg-theme-hint-color)', fontSize: 13, padding: '16px 12px 0', lineHeight: 1.4 }}>
          {t('reg_invite_hint')}
        </div>

        <div style={stickyBar}>
          <PrimaryButton onClick={() => { haptic(); setStep('details'); }}>{t('btn_next')}</PrimaryButton>
        </div>
      </div>
    );
  }

  // ---------- Приглашение ----------
  if (mode === 'join' && inviteState === 'loading') {
    return <div style={{ ...page, display: 'flex', justifyContent: 'center', paddingTop: 120 }}><Spinner size="l" /></div>;
  }
  if (mode === 'join' && inviteState === 'bad') {
    return (
      <div style={{ ...page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <Konnektik mood="think" size={130} />
        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 12 }}>{t('reg_invite_bad_title')}</div>
        <div style={{ fontSize: 15, color: 'var(--tg-theme-hint-color)', marginTop: 6, marginBottom: 20, lineHeight: 1.4 }}>{t('reg_invite_bad_desc')}</div>
        <div style={{ width: '100%', maxWidth: 320 }}>
          <PrimaryButton variant="soft" onClick={() => { setMode('solo'); setStep('mode'); }}>{t('reg_register_self')}</PrimaryButton>
        </div>
      </div>
    );
  }

  // ---------- Шаг 2: данные ----------
  const heading = mode === 'join' ? fill(t('reg_join_heading'), { name: invite?.name ?? '' })
    : mode === 'team' ? t('reg_team_heading') : t('reg_solo_heading');
  const subheading = mode === 'join' ? t('reg_join_sub') : mode === 'team' ? t('reg_team_sub') : t('reg_solo_sub');
  const showPhoneError = phoneTouched && !!normalizePhone(phone) && !phoneOk;

  const section = (title: string, body: React.ReactNode) => (
    <div style={{ ...card, marginTop: 12, padding: '4px 14px 14px' }}>
      <div style={{ fontSize: 17, fontWeight: 700, margin: '12px 2px 0' }}>{title}</div>
      {body}
    </div>
  );

  return (
    <div style={{ ...page, padding: '20px 16px 110px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Konnektik mood={mode === 'join' ? 'happy' : 'explain'} size={84} />
        <div style={{ minWidth: 0 }}>
          {!inviteCode && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tg-theme-hint-color)' }}>{fill(t('reg_step'), { n: 2 })}</div>}
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{heading}</div>
          <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', marginTop: 4, lineHeight: 1.35 }}>{subheading}</div>
        </div>
      </div>

      {mode === 'team' && section(t('reg_section_business'), <>
        <div style={fieldLabel}>{t('reg_business_name')}</div>
        <input style={inputStyle} value={businessName} maxLength={120} placeholder={t('reg_business_name_ph')}
          aria-label={t('reg_business_name')} onChange={(e) => setBusinessName(e.target.value)} />
        <div style={fieldLabel}>{t('reg_address')}</div>
        <input style={inputStyle} value={address} placeholder={t('reg_address_ph')}
          aria-label={t('reg_address')} onChange={(e) => setAddress(e.target.value)} />
      </>)}

      {section(mode === 'team' ? t('reg_section_owner') : t('reg_section_about'), <>
        <div style={fieldLabel}>{t('reg_name')}</div>
        <input style={inputStyle} value={name} maxLength={100} placeholder={t('reg_name_ph')} autoComplete="name"
          aria-label={t('reg_name')} onChange={(e) => setName(e.target.value)} />

        <div style={fieldLabel}>{t('reg_phone')}</div>
        <input style={{ ...inputStyle, boxShadow: showPhoneError ? 'inset 0 0 0 1.5px #E0533D' : 'none' }}
          type="tel" inputMode="tel" autoComplete="tel" value={phone} placeholder={PHONE_PLACEHOLDER}
          aria-label={t('reg_phone')} aria-invalid={showPhoneError}
          onFocus={() => { if (!phone) setPhone('+998 '); }}
          onBlur={() => { setPhoneTouched(true); if (normalizePhone(phone) === '+998') setPhone(''); }}
          onChange={(e) => setPhone(formatPhone(e.target.value))} />
        {showPhoneError && <div style={{ fontSize: 13, color: '#E0533D', marginTop: 6 }}>{t('cp_phone_bad')}</div>}

        <div style={fieldLabel}>{t('reg_experience')}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {[-1, 1].map((d) => (
            <button key={d} type="button" aria-label={d < 0 ? '−' : '+'} onClick={() => { haptic(); setExperience((x) => Math.min(60, Math.max(0, x + d))); }}
              style={{ width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 22, fontWeight: 700, fontFamily: 'inherit',
                backgroundColor: 'var(--brand-soft)', color: 'var(--brand-ink)', order: d < 0 ? 0 : 2 }}>
              {d < 0 ? '−' : '+'}
            </button>
          ))}
          <div style={{ order: 1, minWidth: 48, textAlign: 'center', fontSize: 22, fontWeight: 800 }}>{experience}</div>
        </div>
      </>)}

      {mode !== 'join' && section(t('reg_section_sphere'), <>
        <div style={fieldLabel}>{t('reg_category')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CATEGORIES.map((c, i) => <Chip onCard key={c} active={category === c} onClick={() => { haptic(); setCategory(c); }}>{t(`cat_${i}`)}</Chip>)}
        </div>
        <div style={fieldLabel}>{t('reg_city')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CITIES.map((c, i) => <Chip onCard key={c} active={city === c} onClick={() => { haptic(); setCity(c); }}>{t(CITY_KEYS[i])}</Chip>)}
        </div>
      </>)}

      <div style={stickyBar}>
        <PrimaryButton onClick={submit} loading={loading}>{mode === 'join' ? t('reg_btn_join') : t('reg_btn_create')}</PrimaryButton>
      </div>
    </div>
  );
};
