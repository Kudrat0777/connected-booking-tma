// Регистрация мастера в три шага: профессия → сам или команда (словами профессии) → данные.
// По ссылке-приглашению сразу последний шаг: вступление в команду заведения, профессия — как у заведения.
import React, { useEffect, useRef, useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';

import { onboardMaster, fetchInviteInfo, BusinessShort } from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { fill } from '../helpers/translationsBusiness';
import { PHONE_PLACEHOLDER, formatPhone, isValidPhone, normalizePhone } from '../helpers/phone';
import { CLASS_FIRST, PROFESSIONS, Profession, professionOf, soloKind } from '../helpers/professions';
import { Konnektik } from '../components/Konnektik';
import { ProfessionGlyph, ProfessionIcon } from '../components/ProfessionIcon';
import { Chip, PrimaryButton, card, fieldLabel, inputStyle, page, tgAlert } from '../components/ui';

const CITIES = ['Ургенч', 'Ташкент', 'Самарканд', 'Бухара', 'Хива'];
const CITY_KEYS = ['city_urgench', 'city_tashkent', 'city_samarkand', 'city_bukhara', 'city_khiva'];
const EXPERIENCE = [0, 1, 3, 5]; // «до года», «1–3», «3–5», «5+»

type Mode = 'solo' | 'team' | 'join';
type Step = 'profession' | 'mode' | 'details';

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

const stepLabel: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--tg-theme-hint-color)' };
const title: React.CSSProperties = { fontSize: 26, fontWeight: 800, margin: '6px 0 0', letterSpacing: -0.2 };
const subtitle: React.CSSProperties = { fontSize: 15, color: 'var(--tg-theme-hint-color)', margin: '6px 0 0', lineHeight: 1.4 };

const selectable = (on: boolean): React.CSSProperties => ({
  ...card, display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left', cursor: 'pointer',
  fontFamily: 'inherit', color: 'var(--tg-theme-text-color)', boxSizing: 'border-box',
  border: `2px solid ${on ? 'var(--brand-accent, #50C878)' : 'transparent'}`,
  backgroundColor: on ? 'var(--brand-soft, #E9F7EF)' : 'var(--tg-theme-bg-color)', transition: 'background-color .15s, border-color .15s',
});

export const MasterRegistrationScreen: React.FC<Props> = ({ inviteCode, onBack, onComplete }) => {
  const { lang, t, setProfession: setWords } = useLanguage();
  const tg = (window as any).Telegram?.WebApp;
  const tgUser = tg?.initDataUnsafe?.user;

  const [mode, setMode] = useState<Mode>(inviteCode ? 'join' : 'solo');
  const [step, setStep] = useState<Step>(inviteCode ? 'details' : 'profession');
  const [loading, setLoading] = useState(false);

  const [invite, setInvite] = useState<BusinessShort | null>(null);
  const [inviteState, setInviteState] = useState<'idle' | 'loading' | 'ok' | 'bad'>(inviteCode ? 'loading' : 'idle');

  const [profession, setProfession] = useState<Profession | null>(null);
  const [name, setName] = useState([tgUser?.first_name, tgUser?.last_name].filter(Boolean).join(' '));
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState(CITIES[0]);
  const [experience, setExperience] = useState(0);

  // Слова профессии («ученики», «пациенты») — сразу, как только она выбрана
  useEffect(() => { setWords(profession); }, [profession, setWords]);
  useEffect(() => () => setWords(null), [setWords]); // ушёл с регистрации — общие слова

  useEffect(() => {
    if (!inviteCode) return;
    fetchInviteInfo(inviteCode).then((b) => {
      setInvite(b);
      setInviteState(b ? 'ok' : 'bad');
      if (b) { setProfession(professionOf(b)); setCity(b.city || CITIES[0]); }
    }).catch(() => setInviteState('bad'));
  }, [inviteCode]);

  // Кнопка «Назад» Telegram: шаг назад, с первого шага — выход
  const backRef = useRef<() => void>(() => {});
  backRef.current = () => {
    if (inviteCode && mode === 'join') onBack();
    else if (step === 'details') setStep('mode');
    else if (step === 'mode') setStep('profession');
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
  const p: Profession = profession ?? 'other';
  const classFirst = CLASS_FIRST.has(p);

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
        profession: p,
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

  // ---------- Шаг 1: профессия ----------
  if (step === 'profession') {
    return (
      <div style={{ ...page, padding: '24px 16px 140px' }}>
        <div style={stepLabel}>{fill(t('pf_step'), { n: 1 })}</div>
        <h1 style={title}>{t('pf_title')}</h1>
        <p style={subtitle}>{t('pf_sub')}</p>

        <div role="radiogroup" aria-label={t('pf_title')}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 18 }}>
          {PROFESSIONS.map((key) => {
            const on = profession === key;
            return (
              <button key={key} type="button" role="radio" aria-checked={on} onClick={() => { haptic(); setProfession(key); }}
                style={{ ...selectable(on), gap: 10, minHeight: 62, padding: '8px 10px', borderRadius: 16, fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>
                <ProfessionIcon name={key} />
                <span style={{ minWidth: 0 }}>{t(`pf_${key}`)}</span>
              </button>
            );
          })}
        </div>

        <div style={stickyBar}>
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 8, minHeight: 17 }}>
            {profession && fill(t('pf_chosen'), { name: t(`pf_${profession}`) })}
          </div>
          <PrimaryButton disabled={!profession} onClick={() => { haptic(); setStep('mode'); }}>{t('btn_next')}</PrimaryButton>
        </div>
      </div>
    );
  }

  // ---------- Шаг 2: сам или команда, словами профессии ----------
  if (step === 'mode') {
    const kind = soloKind(p);
    const option = (m: Mode, glyph: 'solo' | 'team', head: string, desc: string) => {
      const on = mode === m;
      return (
        <button type="button" role="radio" aria-checked={on} onClick={() => { haptic(); setMode(m); }}
          style={{ ...selectable(on), gap: 14, padding: 16, borderRadius: 18 }}>
          <ProfessionIcon name={glyph} size={32} tile={52} />
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 17 }}>{head}</span>
            <span style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', lineHeight: 1.35 }}>{desc}</span>
          </span>
          <span aria-hidden="true" style={{
            width: 24, height: 24, borderRadius: 12, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxSizing: 'border-box', border: on ? 'none' : '2px solid var(--tg-theme-hint-color)', opacity: on ? 1 : 0.5,
            backgroundColor: on ? 'var(--brand-accent, #50C878)' : 'transparent',
          }}>
            {on && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand-on-accent, #14261B)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
          </span>
        </button>
      );
    };

    return (
      <div style={{ ...page, padding: '24px 16px 110px' }}>
        <div style={stepLabel}>{fill(t('pf_step'), { n: 2 })}</div>
        <button type="button" onClick={() => { haptic(); setStep('profession'); }} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 10, height: 36, padding: '0 12px 0 6px', borderRadius: 999,
          border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
          backgroundColor: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-text-color)',
        }}>
          <ProfessionIcon name={p} size={18} tile={26} />
          {t(`pf_${p}`)}
          <span style={{ color: 'var(--brand-ink, #1D7A46)', fontWeight: 700 }}>· {t('pf_change')}</span>
        </button>
        <h1 style={{ ...title, marginTop: 12 }}>{classFirst ? t('pf_how_classes') : t('reg_how_title')}</h1>
        <p style={subtitle}>{t('reg_how_desc')}</p>

        <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
          {option('solo', 'solo', t(`pf_solo_${kind}`), t(`pf_solo_${kind}_desc`))}
          {option('team', 'team', fill(t('pf_team'), { place: t(`pt_${p}`) }), t('pf_team_desc'))}
        </div>

        <div style={{ textAlign: 'center', color: 'var(--tg-theme-hint-color)', fontSize: 13, padding: '16px 12px 0', lineHeight: 1.45 }}>
          {t('pf_invite_hint')}
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
          <PrimaryButton variant="soft" onClick={() => { setMode('solo'); setProfession(null); setStep('profession'); }}>{t('reg_register_self')}</PrimaryButton>
        </div>
      </div>
    );
  }

  // ---------- Шаг 3: данные ----------
  const heading = mode === 'join' ? fill(t('reg_join_heading'), { name: invite?.name ?? '' })
    : mode === 'team' ? t('reg_team_heading') : t('reg_solo_heading');
  const subheading = mode === 'join' ? t('reg_join_sub') : mode === 'team' ? t('reg_team_sub') : t('reg_solo_sub');
  const showPhoneError = phoneTouched && !!normalizePhone(phone) && !phoneOk;
  const features: [string, string][] = classFirst
    ? [['calendar', t('pf_f_groups')], ['solo', t('pf_f_signups')], ['bell', t('pf_f_reminders_classes')]]
    : [['calendar', t('pf_f_booking')], ['solo', t('pf_f_clients')], ['bell', t('pf_f_reminders')]];

  const section = (head: string, body: React.ReactNode) => (
    <div style={{ ...card, marginTop: 12, padding: '4px 14px 14px' }}>
      <div style={{ fontSize: 17, fontWeight: 700, margin: '12px 2px 0' }}>{head}</div>
      {body}
    </div>
  );

  return (
    <div style={{ ...page, padding: '24px 16px 110px' }}>
      {mode === 'join' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Konnektik mood="happy" size={84} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{heading}</div>
            <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', marginTop: 4, lineHeight: 1.35 }}>{subheading}</div>
          </div>
        </div>
      ) : (
        <>
          <div style={stepLabel}>{fill(t('pf_step'), { n: 3 })}</div>
          <h1 style={title}>{heading}</h1>
          <p style={subtitle}>{subheading}</p>
        </>
      )}

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

        <div style={fieldLabel}>{t('pf_exp')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EXPERIENCE.map((y) => <Chip onCard key={y} active={experience === y} onClick={() => { haptic(); setExperience(y); }}>{t(`pf_exp_${y}`)}</Chip>)}
        </div>

        {mode !== 'join' && <>
          <div style={fieldLabel}>{t('reg_city')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CITIES.map((c, i) => <Chip onCard key={c} active={city === c} onClick={() => { haptic(); setCity(c); }}>{t(CITY_KEYS[i])}</Chip>)}
          </div>
        </>}
      </>)}

      <div style={{ ...card, marginTop: 12, backgroundColor: 'var(--brand-soft, #E9F7EF)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--brand-ink, #1D7A46)' }}>{t('pf_feat_title')}</div>
        {features.map(([icon, text]) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, lineHeight: 1.3 }}>
            <FeatureIcon name={icon} />
            <span>{text}</span>
          </div>
        ))}
      </div>

      <div style={stickyBar}>
        <PrimaryButton onClick={submit} loading={loading}>{mode === 'join' ? t('reg_btn_join') : t('reg_btn_create')}</PrimaryButton>
      </div>
    </div>
  );
};

/** Маленькие иконки блока «Что будет в кабинете»: тот же стиль, что у профессий */
const FeatureIcon: React.FC<{ name: string }> = ({ name }) => {
  const box = (children: React.ReactNode) => (
    <span aria-hidden="true" style={{
      width: 30, height: 30, borderRadius: 9, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-text-color)',
    }}>{children}</span>
  );
  const svg = (paths: string[], dot: [number, number, number]) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((d) => <path key={d} d={d} />)}
      <circle cx={dot[0]} cy={dot[1]} r={dot[2]} fill="var(--brand-accent, #50C878)" stroke="none" />
    </svg>
  );
  if (name === 'calendar') return box(svg(['M4 6.5h16v13H4z', 'M4 10.5h16M8.5 4v4M15.5 4v4'], [12, 15, 1.7]));
  if (name === 'bell') return box(svg(['M6 10a6 6 0 0 1 12 0v4l2 3H4l2-3z', 'M10 20.5a2 2 0 0 0 4 0'], [18, 5.5, 2]));
  return box(<ProfessionGlyph name={name as Profession} size={18} strokeWidth={1.8} />);
};
