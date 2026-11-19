import React, { useEffect, useRef, useState } from 'react';
import { Title, Text, Input, Button, Select, Section, List, Spinner } from '@telegram-apps/telegram-ui';

import { onboardMaster, fetchInviteInfo, BusinessShort } from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { fill } from '../helpers/translationsBusiness';
import { Konnektik } from '../components/Konnektik';

const CATEGORIES = [
  'Барбершоп', 'Салон красоты', 'Массаж',
  'Маникюр / Педикюр', 'Брови и Ресницы',
  'Медицина', 'Спорт / Фитнес', 'Автосервис', 'Другое'
];

// Значения хранятся в базе по-русски (по ним работает поиск), подписи — на языке пользователя
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

const cardStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: 16,
  borderRadius: 16,
  backgroundColor: 'var(--tg-theme-bg-color)',
  border: `2px solid ${active ? 'var(--tg-theme-button-color)' : 'transparent'}`,
  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
  cursor: 'pointer',
  transition: 'border-color .15s ease, transform .15s ease',
  transform: active ? 'scale(1.01)' : 'none',
  textAlign: 'left',
  width: '100%',
  color: 'var(--tg-theme-text-color)',
  font: 'inherit',
});

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
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [city, setCity] = useState(CITIES[0]);
  const [experience, setExperience] = useState('');

  useEffect(() => {
    if (!inviteCode) return;
    fetchInviteInfo(inviteCode).then((b) => {
      setInvite(b);
      setInviteState(b ? 'ok' : 'bad');
      if (b) { setCategory(CATEGORIES.includes(b.category) ? b.category : CATEGORIES[0]); setCity(b.city || CITIES[0]); }
    });
  }, [inviteCode]);

  // Кнопка «Назад» Telegram: на шаге деталей возвращаемся к выбору режима
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
    return () => tg.BackButton.offClick(handler);
  }, [tg]);

  const haptic = (type: 'light' | 'success' | 'error' = 'light') => {
    if (!tg?.HapticFeedback) return;
    if (type === 'light') tg.HapticFeedback.impactOccurred('light');
    else tg.HapticFeedback.notificationOccurred(type);
  };

  const alertMsg = (msg: string) => (tg?.showAlert ? tg.showAlert(msg) : alert(msg));

  const submit = async () => {
    if (!name.trim() || !phone.trim()) { haptic('error'); alertMsg(t('reg_err_name_phone')); return; }
    if (mode === 'team' && !businessName.trim()) { haptic('error'); alertMsg(t('reg_err_business')); return; }

    setLoading(true);
    try {
      await onboardMaster({
        mode,
        name: name.trim(),
        phone: phone.trim(),
        category,
        city,
        experience_years: parseInt(experience, 10) || 0,
        business_name: mode === 'team' ? businessName.trim() : undefined,
        address: mode === 'team' ? address.trim() : undefined,
        invite_code: mode === 'join' ? inviteCode || undefined : undefined,
        language: lang,
      });
      haptic('success');
      onComplete();
    } catch (e: any) {
      haptic('error');
      alertMsg(e.message || t('reg_err_generic'));
    } finally {
      setLoading(false);
    }
  };

  const page: React.CSSProperties = {
    backgroundColor: 'var(--tg-theme-secondary-bg-color)',
    minHeight: '100vh',
    paddingBottom: 40,
    color: 'var(--tg-theme-text-color)',
  };

  // ---------- Шаг 1: как вы работаете ----------
  if (step === 'mode') {
    return (
      <div style={page}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px 8px', textAlign: 'center' }}>
          <Konnektik mood="hello" size={150} />
          <Title level="1" weight="1" style={{ marginTop: 16, marginBottom: 8 }}>{t('reg_how_title')}</Title>
          <Text style={{ color: 'var(--tg-theme-hint-color)' }}>
            {t('reg_how_desc')}
          </Text>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 16px' }}>
          <button type="button" style={cardStyle(mode === 'solo')} onClick={() => { haptic(); setMode('solo'); }}>
            <div style={{ fontSize: 32 }}>✂️</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{t('reg_solo_title')}</div>
              <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', lineHeight: 1.35 }}>
                {t('reg_solo_desc')}
              </div>
            </div>
          </button>

          <button type="button" style={cardStyle(mode === 'team')} onClick={() => { haptic(); setMode('team'); }}>
            <div style={{ fontSize: 32 }}>🏠</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{t('reg_team_title')}</div>
              <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', lineHeight: 1.35 }}>
                {t('reg_team_desc')}
              </div>
            </div>
          </button>
        </div>

        <div style={{ padding: '8px 16px' }}>
          <Button size="l" stretched mode="filled" onClick={() => { haptic(); setStep('details'); }}>
            {t('btn_next')}
          </Button>
        </div>
        <Text style={{ display: 'block', textAlign: 'center', color: 'var(--tg-theme-hint-color)', fontSize: 13, padding: '8px 24px' }}>
          {t('reg_invite_hint')}
        </Text>
      </div>
    );
  }

  // ---------- Приглашение недействительно ----------
  if (mode === 'join' && inviteState === 'bad') {
    return (
      <div style={{ ...page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <Konnektik mood="think" size={150} />
        <Title level="2" weight="1" style={{ marginTop: 16, marginBottom: 8 }}>{t('reg_invite_bad_title')}</Title>
        <Text style={{ color: 'var(--tg-theme-hint-color)', marginBottom: 24 }}>
          {t('reg_invite_bad_desc')}
        </Text>
        <Button size="l" mode="bezeled" onClick={() => { setMode('solo'); setStep('mode'); }}>
          {t('reg_register_self')}
        </Button>
      </div>
    );
  }

  if (mode === 'join' && inviteState === 'loading') {
    return <div style={{ ...page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size="l" /></div>;
  }

  // ---------- Шаг 2: данные ----------
  const heading = mode === 'join' ? fill(t('reg_join_heading'), { name: invite?.name ?? '' })
    : mode === 'team' ? t('reg_team_heading') : t('reg_solo_heading');
  const subheading = mode === 'join' ? t('reg_join_sub') : mode === 'team' ? t('reg_team_sub') : t('reg_solo_sub');

  return (
    <div style={page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '24px 20px 12px' }}>
        <Konnektik mood={mode === 'join' ? 'happy' : 'explain'} size={92} />
        <div>
          <Title level="2" weight="1" style={{ marginBottom: 6 }}>{heading}</Title>
          <Text style={{ color: 'var(--tg-theme-hint-color)', fontSize: 14, lineHeight: 1.35 }}>{subheading}</Text>
        </div>
      </div>

      <List style={{ padding: '0 16px' }}>
        {mode === 'team' && (
          <Section header={t('reg_section_business')}>
            <Input header={t('reg_business_name')} placeholder={t('reg_business_name_ph')} value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            <Input header={t('reg_address')} placeholder={t('reg_address_ph')} value={address} onChange={(e) => setAddress(e.target.value)} />
          </Section>
        )}

        <Section header={mode === 'team' ? t('reg_section_owner') : t('reg_section_about')}>
          <Input header={t('reg_name')} placeholder={t('reg_name_ph')} value={name} onChange={(e) => setName(e.target.value)} />
          <Input header={t('reg_phone')} placeholder="+998 90 000 00 00" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input header={t('reg_experience')} placeholder={t('reg_experience_ph')} type="number" inputMode="numeric" value={experience} onChange={(e) => setExperience(e.target.value)} />
        </Section>

        {mode !== 'join' && (
          <Section header={t('reg_section_sphere')}>
            <Select header={t('reg_category')} value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c, i) => <option key={c} value={c}>{t(`cat_${i}`)}</option>)}
            </Select>
            <Select header={t('reg_city')} value={city} onChange={(e) => setCity(e.target.value)}>
              {CITIES.map((c, i) => <option key={c} value={c}>{t(CITY_KEYS[i])}</option>)}
            </Select>
          </Section>
        )}
      </List>

      <div style={{ padding: '24px 16px' }}>
        <Button size="l" stretched mode="filled" onClick={submit} loading={loading}>
          {mode === 'join' ? t('reg_btn_join') : t('reg_btn_create')}
        </Button>
      </div>
    </div>
  );
};
