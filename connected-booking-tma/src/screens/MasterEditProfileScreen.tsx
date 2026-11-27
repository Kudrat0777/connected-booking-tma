// Редактирование профиля мастера: фото, основное, контакты, примеры работ.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

import {
  updateMasterProfile, uploadMasterAvatar, fetchPortfolio, uploadPortfolioPhoto, deletePortfolioPhoto,
  PortfolioItem, useTunnelImage,
} from '../helpers/api';
import { PROFESSIONS, Profession, professionOf } from '../helpers/professions';
import { ProfessionGlyph } from '../components/ProfessionIcon';
import { useLanguage } from '../helpers/LanguageContext';
import { fill } from '../helpers/translationsBusiness';
import {
  Avatar, Badge, Chip, PrimaryButton, card, fieldLabel, inputStyle, page, tgAlert, tgConfirm,
} from '../components/ui';

const CITIES: { value: string; key: string }[] = [
  { value: 'Ургенч', key: 'city_urgench' }, { value: 'Ташкент', key: 'city_tashkent' },
  { value: 'Самарканд', key: 'city_samarkand' }, { value: 'Бухара', key: 'city_bukhara' },
  { value: 'Хива', key: 'city_khiva' },
];
const PORTFOLIO_MAX = 10;
const BIO_MAX = 500;

type Form = { name: string; bio: string; phone: string; city: string; address: string; experience: number; profession: Profession };

type Props = {
  telegramId: number;
  initialData?: {
    name: string;
    bio: string;
    avatarUrl?: string;
    phone: string;
    city?: string;
    address?: string;
    experience_years?: number;
    category?: string;
    profession?: string;
  };
  onBack: () => void;
  onSaved: () => void;
};

const haptic = (kind: 'select' | 'light' | 'success' | 'error' = 'select') => {
  const h = (window as any).Telegram?.WebApp?.HapticFeedback;
  if (!h) return;
  if (kind === 'select') h.selectionChanged();
  else if (kind === 'light') h.impactOccurred('light');
  else h.notificationOccurred(kind);
};

const PortfolioThumb: React.FC<{ path: string; onDelete: () => void }> = ({ path, onDelete }) => {
  const src = useTunnelImage(path);
  return (
    <div style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 12, overflow: 'hidden', backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size="s" /></div>}
      <button type="button" aria-label="×" onClick={onDelete} style={{
        position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
        backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 16, lineHeight: '28px', padding: 0,
      }}>✕</button>
    </div>
  );
};

export const MasterEditProfileScreen: React.FC<Props> = ({ telegramId, initialData, onBack, onSaved }) => {
  const { t } = useLanguage();

  const initial = useMemo<Form>(() => ({
    name: initialData?.name || '',
    bio: initialData?.bio || '',
    phone: initialData?.phone || '',
    city: initialData?.city || '',
    address: initialData?.address || '',
    experience: initialData?.experience_years ?? 0,
    profession: professionOf(initialData),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);
  const [form, setForm] = useState<Form>(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const dirty = (Object.keys(initial) as (keyof Form)[]).some((k) => initial[k] !== form[k]);

  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatarUrl || '');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioItem[] | null>(null);
  const [portfolioBusy, setPortfolioBusy] = useState(false);

  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  // «Назад» в Telegram: не теряем изменения молча
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const backRef = useRef(onBack);
  backRef.current = onBack;
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.BackButton) return;
    const h = async () => {
      if (dirtyRef.current && !(await tgConfirm(t('ep_leave_confirm')))) return;
      backRef.current();
    };
    tg.MainButton?.hide();
    tg.BackButton.show();
    tg.BackButton.onClick(h);
    return () => tg.BackButton.offClick(h);
  }, [t]);

  const loadPortfolio = () => fetchPortfolio(undefined, telegramId).then(setPortfolio).catch(() => setPortfolio([]));
  useEffect(() => { loadPortfolio(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telegramId]);

  const save = async () => {
    if (!form.name.trim()) { haptic('error'); tgAlert(t('ep_name_required')); return; }
    setSaving(true);
    try {
      await updateMasterProfile(telegramId, {
        name: form.name.trim(), bio: form.bio.trim(), phone: form.phone.trim(), address: form.address.trim(),
        experience_years: form.experience,
        // Пустые сфера/город не отправляем, чтобы не стереть то, что уже есть в базе
        ...(form.city ? { city: form.city } : {}),
        profession: form.profession,
      });
      haptic('success');
      onSaved();
    } catch {
      haptic('error');
      tgAlert(t('ep_save_error'));
    } finally { setSaving(false); }
  };

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ''; // чтобы можно было выбрать тот же файл ещё раз
    return f;
  };

  const changeAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = pickFile(e);
    if (!f) return;
    haptic('light');
    setAvatarBusy(true);
    try { setAvatarUrl((await uploadMasterAvatar(telegramId, f)).avatar_url); }
    catch { tgAlert(t('ep_upload_error')); }
    finally { setAvatarBusy(false); }
  };

  const addPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = pickFile(e);
    if (!f) return;
    if ((portfolio?.length ?? 0) >= PORTFOLIO_MAX) { tgAlert(fill(t('ep_portfolio_full'), { max: PORTFOLIO_MAX })); return; }
    haptic('light');
    setPortfolioBusy(true);
    try { await uploadPortfolioPhoto(telegramId, f); await loadPortfolio(); }
    catch { tgAlert(t('ep_upload_error')); }
    finally { setPortfolioBusy(false); }
  };

  const removePhoto = async (id: number) => {
    haptic('light');
    if (!(await tgConfirm(t('ep_photo_delete_confirm')))) return;
    try { await deletePortfolioPhoto(id); setPortfolio((p) => (p || []).filter((x) => x.id !== id)); }
    catch { tgAlert(t('ep_save_error')); }
  };

  const cityOptions = form.city && !CITIES.some((c) => c.value === form.city) ? [...CITIES, { value: form.city, key: '' }] : CITIES;

  const section = (title: string, children: React.ReactNode, hint?: React.ReactNode) => (
    <div style={{ ...card, marginTop: 12, padding: '4px 14px 14px' }}>
      <div style={{ fontSize: 17, fontWeight: 700, margin: '12px 2px 0' }}>{title}</div>
      {hint && <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', margin: '4px 2px 0' }}>{hint}</div>}
      {children}
    </div>
  );

  const count = portfolio?.length ?? 0;

  return (
    <div style={{ ...page, padding: '16px 16px 110px' }}>
      {/* Фото */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 16, padding: 16 }}>
        <label style={{ position: 'relative', cursor: 'pointer', flex: '0 0 auto' }}>
          <Avatar src={avatarUrl} name={form.name || '…'} size={84} radius={26} />
          <span style={{
            position: 'absolute', right: -4, bottom: -4, width: 30, height: 30, borderRadius: 15, display: 'flex',
            alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--brand-accent, #50C878)',
            color: 'var(--brand-on-accent, #14261B)', fontSize: 15, border: '3px solid var(--tg-theme-bg-color)',
          }}>{avatarBusy ? '…' : '📷'}</span>
          <input type="file" hidden accept="image/*" onChange={changeAvatar} disabled={avatarBusy} />
        </label>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis' }}>{form.name || t('ep_title')}</div>
          <label style={{ display: 'inline-block', marginTop: 4, color: 'var(--brand-ink)', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            {t('ep_photo_change')}
            <input type="file" hidden accept="image/*" onChange={changeAvatar} disabled={avatarBusy} />
          </label>
          <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginTop: 2 }}>{t('ep_photo_hint')}</div>
        </div>
      </div>

      {section(t('ep_main'), <>
        <div style={fieldLabel}>{t('ep_name')}</div>
        <input style={inputStyle} value={form.name} onChange={(e) => set('name', e.target.value)}
          placeholder={t('ep_name_ph')} aria-label={t('ep_name')} />

        <div style={fieldLabel}>{t('pf_profession')}</div>
        <div role="radiogroup" aria-label={t('pf_profession')} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PROFESSIONS.map((c) => (
            <Chip onCard key={c} active={form.profession === c} onClick={() => { haptic(); set('profession', c); }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ProfessionGlyph name={c} size={18} />{t(`pf_${c}`)}</span>
            </Chip>
          ))}
        </div>

        <div style={fieldLabel}>{t('ep_experience')}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {[-1, 1].map((d) => (
            <button key={d} type="button" aria-label={d < 0 ? '−' : '+'} onClick={() => { haptic(); set('experience', Math.min(60, Math.max(0, form.experience + d))); }}
              style={{ width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 22, fontWeight: 700,
                backgroundColor: 'var(--brand-soft)', color: 'var(--brand-ink)', order: d < 0 ? 0 : 2 }}>
              {d < 0 ? '−' : '+'}
            </button>
          ))}
          <div style={{ order: 1, minWidth: 48, textAlign: 'center', fontSize: 22, fontWeight: 800 }}>{form.experience}</div>
        </div>

        <div style={fieldLabel}>{t('ep_about')}</div>
        <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 96, lineHeight: 1.4 }} value={form.bio} maxLength={BIO_MAX}
          onChange={(e) => set('bio', e.target.value)} placeholder={t('ep_about_ph')} aria-label={t('ep_about')} />
        <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', textAlign: 'right', marginTop: 4 }}>{form.bio.length} / {BIO_MAX}</div>
      </>)}

      {section(t('ep_contacts'), <>
        <div style={fieldLabel}>{t('ep_phone')}</div>
        <input style={inputStyle} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
          placeholder="+998 90 000 00 00" aria-label={t('ep_phone')} />

        <div style={fieldLabel}>{t('ep_city')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {cityOptions.map((c) => (
            <Chip onCard key={c.value} active={form.city === c.value} onClick={() => { haptic(); set('city', c.value); }}>{c.key ? t(c.key) : c.value}</Chip>
          ))}
        </div>

        <div style={fieldLabel}>{t('ep_address')}</div>
        <textarea style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.4 }} rows={2} value={form.address}
          onChange={(e) => set('address', e.target.value)} placeholder={t('ep_address_ph')} aria-label={t('ep_address')} />
      </>)}

      {section(t('ep_portfolio'), (
        portfolio === null ? <div style={{ padding: 16, textAlign: 'center' }}><Spinner size="s" /></div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
            {portfolio.map((p) => <PortfolioThumb key={p.id} path={p.image_url} onDelete={() => removePhoto(p.id)} />)}
            {count < PORTFOLIO_MAX && (
              <label style={{
                aspectRatio: '1 / 1', borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4,
                alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--brand-accent, #50C878)',
                backgroundColor: 'var(--brand-soft)', color: 'var(--brand-ink)', fontWeight: 700, fontSize: 13,
              }}>
                {portfolioBusy ? <Spinner size="s" /> : <><span style={{ fontSize: 26, lineHeight: 1 }}>+</span>{t('ep_portfolio_add')}</>}
                <input type="file" hidden accept="image/*" onChange={addPhoto} disabled={portfolioBusy} />
              </label>
            )}
          </div>
        )
      ), fill(t('ep_portfolio_hint'), { n: count, max: PORTFOLIO_MAX }))}

      {/* TON — пока заготовка на будущее, поэтому внизу и компактно */}
      <div style={{ ...card, marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#0098EA', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" />
            <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, whiteSpace: 'nowrap' }}>{t('ep_wallet')} <Badge tone="wait">{t('ep_soon')}</Badge></div>
          <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginTop: 2 }}>{t('ep_wallet_hint')}</div>
        </div>
        <button type="button" onClick={() => { haptic(); if (wallet) tonConnectUI.disconnect(); else tonConnectUI.openModal(); }}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
            color: wallet ? 'var(--tg-theme-hint-color)' : 'var(--brand-ink)', padding: 4 }}>
          {wallet ? `${wallet.account.address.slice(0, 4)}…${wallet.account.address.slice(-4)}` : t('ep_wallet_connect')}
        </button>
      </div>

      {/* Сохранение — всегда под рукой */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 20, padding: '10px 16px calc(10px + env(safe-area-inset-bottom))',
        backgroundColor: 'var(--tg-theme-secondary-bg-color)', boxShadow: '0 -6px 16px rgba(0,0,0,0.06)',
      }}>
        <PrimaryButton onClick={save} loading={saving} disabled={!dirty}>{t('ep_save')}</PrimaryButton>
      </div>
    </div>
  );
};
