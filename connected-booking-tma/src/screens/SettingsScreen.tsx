// Профиль клиента: имя и телефон для мастеров, язык приложения, выход и удаление профиля.
import React, { useEffect, useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';

import { deleteAccount, fetchUserProfile, updateMasterProfile, updateUserProfile } from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { LangCode } from '../helpers/translations';
import { PHONE_PLACEHOLDER, formatPhone, isValidPhone, normalizePhone, requestTelegramPhone } from '../helpers/phone';
import { Avatar, PrimaryButton, card, fieldLabel, inputStyle, page, tgAlert, tgConfirm } from '../components/ui';

type Props = {
  telegramId: number;
  onBack: () => void;
  onLogout: () => void;
};

type Form = { first: string; last: string; phone: string };

const LANGS: { code: LangCode; flag: string; label: string }[] = [
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'uz', flag: '🇺🇿', label: "O'zbekcha" },
  { code: 'en', flag: '🇬🇧', label: 'English' },
];

const haptic = (kind: 'select' | 'success' | 'error' | 'warning' = 'select') => {
  const h = (window as any).Telegram?.WebApp?.HapticFeedback;
  if (!h) return;
  if (kind === 'select') h.selectionChanged();
  else h.notificationOccurred(kind);
};

export const SettingsScreen: React.FC<Props> = ({ telegramId, onLogout }) => {
  const { lang, setLang, t } = useLanguage();
  const tg = (window as any).Telegram?.WebApp;
  const tgUser = tg?.initDataUnsafe?.user;
  const canAskContact = !!tg?.requestContact && tg?.platform !== 'unknown';

  const [saved, setSaved] = useState<Form>({ first: '', last: '', phone: '' });
  const [form, setForm] = useState<Form>(saved);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  useEffect(() => {
    let alive = true;
    const fallback: Form = { first: tgUser?.first_name || '', last: tgUser?.last_name || '', phone: '' };
    fetchUserProfile(telegramId)
      .then((u) => {
        if (!alive) return;
        const f = {
          first: u?.first_name || fallback.first,
          last: u?.last_name || fallback.last,
          phone: formatPhone(u?.phone || ''),
        };
        setSaved(f);
        setForm(f);
      })
      .catch(() => { if (alive) { setSaved(fallback); setForm(fallback); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telegramId]);

  const set = (k: keyof Form, v: string) => { setJustSaved(false); setForm((f) => ({ ...f, [k]: v })); };

  // «+998 » без цифр номера — то же, что пустое поле (его подставляем при фокусе)
  const phoneValue = (p: string) => { const n = normalizePhone(p); return n === '+998' || n === '+' ? '' : n; };
  const phoneOk = !phoneValue(form.phone) || isValidPhone(form.phone);
  const nameOk = !!form.first.trim();
  const dirty = form.first.trim() !== saved.first.trim() || form.last.trim() !== saved.last.trim()
    || phoneValue(form.phone) !== phoneValue(saved.phone);

  const save = async () => {
    if (!nameOk) { haptic('error'); tgAlert(t('cp_name_req')); return; }
    if (!phoneOk) { haptic('error'); setPhoneTouched(true); return; }
    setSaving(true);
    try {
      const next = { first: form.first.trim(), last: form.last.trim(), phone: formatPhone(phoneValue(form.phone)) };
      await updateUserProfile(telegramId, { first_name: next.first, last_name: next.last, phone: phoneValue(next.phone) });
      setSaved(next);
      setForm(next);
      setJustSaved(true);
      haptic('success');
    } catch {
      haptic('error');
      tgAlert(t('cp_save_err'));
    } finally { setSaving(false); }
  };

  const fillFromTelegram = async () => {
    haptic();
    const p = await requestTelegramPhone(telegramId);
    if (p) { set('phone', p); setPhoneTouched(true); haptic('success'); }
  };

  const changeLang = async (code: LangCode) => {
    if (code === lang) return;
    haptic();
    setLang(code);
    // Язык нужен и боту — уведомления придут на нём же. Мастер-профиля может не быть: ошибку не показываем.
    updateUserProfile(telegramId, { language: code }).catch(() => {});
    updateMasterProfile(telegramId, { language: code }).catch(() => {});
  };

  const logout = async () => {
    if (await tgConfirm(t('cp_logout_confirm'))) onLogout();
  };

  const remove = async () => {
    haptic('warning');
    if (!(await tgConfirm(t('cp_delete_confirm')))) return;
    try {
      // Только профиль клиента: кабинет мастера с тем же Telegram остаётся
      await deleteAccount(telegramId, 'client');
      onLogout();
    } catch {
      haptic('error');
      tgAlert(t('cp_delete_err'));
    }
  };

  if (loading) {
    return <div style={{ ...page, display: 'flex', justifyContent: 'center', paddingTop: 120 }}><Spinner size="l" /></div>;
  }

  const fullName = `${saved.first} ${saved.last}`.trim() || tgUser?.first_name || '';
  const subline = saved.phone || (tgUser?.username ? `@${tgUser.username}` : '');
  const showPhoneError = phoneTouched && !phoneOk;

  const row = (label: string, onClick: () => void, danger = false, last = false) => (
    <button type="button" onClick={onClick} style={{
      display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: '14px 2px',
      border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, fontWeight: 600,
      color: danger ? '#E0533D' : 'var(--tg-theme-text-color)',
      borderBottom: last ? 'none' : '1px solid var(--tg-theme-secondary-bg-color)',
    }}>
      {label}
      <span aria-hidden="true" style={{ color: 'var(--tg-theme-hint-color)', fontSize: 18 }}>›</span>
    </button>
  );

  return (
    <div style={{ ...page, padding: '16px 16px 120px' }}>
      {/* Кто я */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, padding: 16 }}>
        <Avatar src={tgUser?.photo_url} name={fullName || '?'} size={64} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName}</div>
          {subline && <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', marginTop: 2 }}>{subline}</div>}
        </div>
      </div>

      {/* Личные данные */}
      <div style={{ ...card, marginTop: 12, padding: '4px 14px 14px' }}>
        <div style={{ fontSize: 17, fontWeight: 700, margin: '12px 2px 0' }}>{t('cp_personal')}</div>

        <div style={fieldLabel}>{t('cp_first')}</div>
        <input style={inputStyle} value={form.first} maxLength={150} autoComplete="given-name"
          onChange={(e) => set('first', e.target.value)} aria-label={t('cp_first')} />

        <div style={fieldLabel}>{t('cp_last')}</div>
        <input style={inputStyle} value={form.last} maxLength={150} autoComplete="family-name"
          onChange={(e) => set('last', e.target.value)} aria-label={t('cp_last')} />

        <div style={fieldLabel}>{t('cp_phone')}</div>
        <input style={{ ...inputStyle, boxShadow: showPhoneError ? 'inset 0 0 0 1.5px #E0533D' : 'none' }}
          type="tel" inputMode="tel" autoComplete="tel" value={form.phone} placeholder={PHONE_PLACEHOLDER}
          aria-label={t('cp_phone')} aria-invalid={showPhoneError}
          onFocus={() => { if (!form.phone) set('phone', '+998 '); }}
          onBlur={() => { setPhoneTouched(true); if (!phoneValue(form.phone)) set('phone', ''); }}
          onChange={(e) => set('phone', formatPhone(e.target.value))} />
        <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.35, color: showPhoneError ? '#E0533D' : 'var(--tg-theme-hint-color)' }}>
          {showPhoneError ? t('cp_phone_bad') : t('cp_phone_hint')}
        </div>
        {canAskContact && (
          <button type="button" onClick={fillFromTelegram} style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 14, fontWeight: 600, backgroundColor: 'var(--brand-soft, #E9F7EF)', color: 'var(--brand-ink, #1D7A46)',
          }}>📱 {t('cp_phone_tg')}</button>
        )}

        <div style={{ marginTop: 16 }}>
          <PrimaryButton onClick={dirty ? save : undefined} loading={saving} disabled={!dirty && !justSaved}>
            {justSaved && !dirty ? `✓ ${t('cp_saved')}` : t('cp_save')}
          </PrimaryButton>
        </div>
      </div>

      {/* Язык */}
      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{t('cp_lang')}</div>
        <div role="radiogroup" aria-label={t('cp_lang')} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {LANGS.map((l) => {
            const on = lang === l.code;
            return (
              <button key={l.code} type="button" role="radio" aria-checked={on} onClick={() => changeLang(l.code)} style={{
                padding: '10px 4px', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600,
                backgroundColor: on ? 'var(--brand-accent, #50C878)' : 'var(--tg-theme-secondary-bg-color)',
                color: on ? 'var(--brand-on-accent, #14261B)' : 'var(--tg-theme-text-color)',
              }}>
                <span aria-hidden="true" style={{ fontSize: 22, lineHeight: 1 }}>{l.flag}</span>
                {l.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Аккаунт */}
      <div style={{ ...card, marginTop: 12, padding: '2px 14px' }}>
        {row(t('cp_logout'), logout)}
        {row(t('cp_delete'), remove, true, true)}
      </div>
    </div>
  );
};
