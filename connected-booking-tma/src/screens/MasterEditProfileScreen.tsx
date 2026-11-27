// Редактирование профиля мастера (по макету): фото, основное, контакты и место на карте, фото работ.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';

import {
  updateMasterProfile, uploadMasterAvatar, fetchPortfolio, uploadPortfolioPhoto, deletePortfolioPhoto, makePortfolioCover,
  PortfolioItem, useTunnelImage,
} from '../helpers/api';
import { CLASS_FIRST, Profession, professionOf } from '../helpers/professions';
import { cityLabel } from '../helpers/cities';
import { ProfessionIcon } from '../components/ProfessionIcon';
import { BrandIcon } from '../components/BrandIcon';
import { CitySheet, ProfessionSheet } from '../components/ProfilePickers';
import { MapPicker, Place } from '../components/MapPicker';
import { useLanguage } from '../helpers/LanguageContext';
import { fill } from '../helpers/translationsBusiness';
import {
  Avatar, Chip, PrimaryButton, Sheet, card, fieldLabel, inputStyle, page, tgAlert, tgConfirm,
} from '../components/ui';

const PORTFOLIO_MAX = 10;
const BIO_MAX = 500;

type Form = {
  name: string; bio: string; phone: string; city: string; address: string; experience: number; profession: Profession;
  lat: number | null; lon: number | null; note: string;
};
const EXPERIENCE = [0, 1, 3, 5]; // «до года», «1–3», «3–5», «5+»
const bucket = (y: number) => (y >= 5 ? 5 : y >= 3 ? 3 : y >= 1 ? 1 : 0);

type Props = {
  telegramId: number;
  initialData?: {
    name: string;
    bio: string;
    avatarUrl?: string;
    phone: string;
    city?: string;
    address?: string;
    address_note?: string;
    latitude?: number | null;
    longitude?: number | null;
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

const PortfolioThumb: React.FC<{ path: string; cover: boolean; coverLabel: string; onOpen: () => void }> = ({ path, cover, coverLabel, onOpen }) => {
  const src = useTunnelImage(path);
  return (
    <button type="button" onClick={onOpen} style={{
      position: 'relative', aspectRatio: '1 / 1', borderRadius: 12, overflow: 'hidden', padding: 0, border: 'none', cursor: 'pointer',
      backgroundColor: 'var(--tg-theme-secondary-bg-color)',
    }}>
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <span style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size="s" /></span>}
      {cover && (
        <span style={{
          position: 'absolute', left: 6, top: 6, padding: '2px 7px', borderRadius: 999, fontSize: 11, fontWeight: 800,
          backgroundColor: 'var(--brand-accent)', color: 'var(--brand-on-accent)',
        }}>{coverLabel}</span>
      )}
    </button>
  );
};

export const MasterEditProfileScreen: React.FC<Props> = ({ telegramId, initialData, onBack, onSaved }) => {
  const { t, lang } = useLanguage();

  const initial = useMemo<Form>(() => ({
    name: initialData?.name || '',
    bio: initialData?.bio || '',
    phone: initialData?.phone || '',
    city: initialData?.city || '',
    address: initialData?.address || '',
    experience: initialData?.experience_years ?? 0,
    profession: professionOf(initialData),
    lat: initialData?.latitude ?? null,
    lon: initialData?.longitude ?? null,
    note: initialData?.address_note || '',
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

  const [sheet, setSheet] = useState<'profession' | 'city' | 'map' | null>(null);
  const [photoMenu, setPhotoMenu] = useState<PortfolioItem | null>(null);

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
        latitude: form.lat, longitude: form.lon, address_note: form.note.trim(),
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

  // Можно выбрать несколько фото сразу: загружаем по очереди, пока есть место
  const addPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const room = PORTFOLIO_MAX - (portfolio?.length ?? 0);
    if (room <= 0) { tgAlert(fill(t('ep_portfolio_full'), { max: PORTFOLIO_MAX })); return; }
    haptic('light');
    setPortfolioBusy(true);
    try {
      for (const f of files.slice(0, room)) await uploadPortfolioPhoto(telegramId, f);
      if (files.length > room) tgAlert(fill(t('ep_portfolio_full'), { max: PORTFOLIO_MAX }));
    } catch { tgAlert(t('ep_upload_error')); }
    finally { await loadPortfolio(); setPortfolioBusy(false); }
  };

  const makeCover = async (id: number) => {
    setPhotoMenu(null);
    try { await makePortfolioCover(id); haptic('success'); await loadPortfolio(); }
    catch { tgAlert(t('ep_save_error')); }
  };

  const removePhoto = async (id: number) => {
    setPhotoMenu(null);
    haptic('light');
    if (!(await tgConfirm(t('ep_photo_delete_confirm')))) return;
    try { await deletePortfolioPhoto(id); setPortfolio((p) => (p || []).filter((x) => x.id !== id)); }
    catch { tgAlert(t('ep_save_error')); }
  };

  const classes = CLASS_FIRST.has(form.profession);
  const savePlace = (p: Place) => {
    setForm((f) => ({ ...f, lat: p.lat, lon: p.lon, address: p.address || f.address, note: p.note }));
    setSheet(null);
  };
  const selectRow: React.CSSProperties = {
    ...inputStyle, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: 'none', textAlign: 'left', minHeight: 50,
  };

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
          }}>{avatarBusy ? '…' : <BrandIcon name="camera" size={15} strokeWidth={2.2} />}</span>
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
        <button type="button" onClick={() => { haptic(); setSheet('profession'); }} style={selectRow}>
          <ProfessionIcon name={form.profession} size={22} tile={34} />
          <span style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>{t(`pf_${form.profession}`)}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand-ink)' }}>{t('ep_change')}</span>
        </button>

        <div style={fieldLabel}>{t('pf_exp')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EXPERIENCE.map((y) => (
            <Chip onCard key={y} active={bucket(form.experience) === y} onClick={() => { haptic(); set('experience', y); }}>{t(`pf_exp_${y}`)}</Chip>
          ))}
        </div>

        <div style={fieldLabel}>{t('ep_about')}</div>
        <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 96, lineHeight: 1.4 }} value={form.bio} maxLength={BIO_MAX}
          onChange={(e) => set('bio', e.target.value)} placeholder={t('ep_about_ph')} aria-label={t('ep_about')} />
        <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', textAlign: 'right', marginTop: 4 }}>{form.bio.length} / {BIO_MAX}</div>
      </>)}

      {section(t('ep_contacts_place'), <>
        <div style={fieldLabel}>{t('ep_phone')}</div>
        <input style={inputStyle} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
          placeholder="+998 90 000 00 00" aria-label={t('ep_phone')} />

        <div style={fieldLabel}>{t('ep_city')}</div>
        <button type="button" onClick={() => { haptic(); setSheet('city'); }} style={selectRow}>
          <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: form.city ? 'inherit' : 'var(--tg-theme-hint-color)' }}>
            {form.city ? cityLabel(form.city, lang) : t('ep_city_pick')}
          </span>
          <span style={{ color: 'var(--tg-theme-hint-color)', display: 'flex', transform: 'rotate(90deg)' }}><BrandIcon name="chevron" size={16} strokeWidth={2.2} /></span>
        </button>

        <div style={fieldLabel}>{t('ep_place')}</div>
        <button type="button" onClick={() => { haptic(); setSheet('map'); }} style={{ ...selectRow, alignItems: 'flex-start', padding: 14 }}>
          <span style={{ color: 'var(--brand-ink)', display: 'flex', marginTop: 2 }}><BrandIcon name="pin" size={24} /></span>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{form.lat != null ? (form.address || t('ep_place_set')) : t('ep_place_empty')}</span>
            {form.lat != null && form.note && <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>{form.note}</span>}
            {form.lat == null && form.address && <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>{form.address}</span>}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand-ink)', whiteSpace: 'nowrap' }}>{t('ep_on_map')}</span>
        </button>
        <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', marginTop: 6, lineHeight: 1.4 }}>{t('ep_place_hint')}</div>
      </>)}

      {section(classes ? t('ep_photos_classes') : t('ep_portfolio'), (
        portfolio === null ? <div style={{ padding: 16, textAlign: 'center' }}><Spinner size="s" /></div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6, marginTop: 12 }}>
            {portfolio.map((p, i) => (
              <PortfolioThumb key={p.id} path={p.image_url} cover={i === 0} coverLabel={t('ep_cover')} onOpen={() => { haptic(); setPhotoMenu(p); }} />
            ))}
            {count < PORTFOLIO_MAX && (
              <label style={{
                aspectRatio: '1 / 1', borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4,
                alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(127,127,127,0.35)',
                color: 'var(--brand-ink)', fontWeight: 700, fontSize: 13,
              }}>
                {portfolioBusy ? <Spinner size="s" /> : <><BrandIcon name="plus" size={24} strokeWidth={2} />{t('ep_portfolio_add')}</>}
                <input type="file" hidden multiple accept="image/*" onChange={addPhotos} disabled={portfolioBusy} />
              </label>
            )}
          </div>
        )
      ), <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span>{t('ep_cover_hint')}</span><span style={{ whiteSpace: 'nowrap' }}>{fill(t('ep_count'), { n: count, max: PORTFOLIO_MAX })}</span>
      </span>)}

      {sheet === 'profession' && <ProfessionSheet value={form.profession} onPick={(v) => set('profession', v)} onClose={() => setSheet(null)} />}
      {sheet === 'city' && <CitySheet value={form.city} onPick={(v) => set('city', v)} onClose={() => setSheet(null)} />}
      {sheet === 'map' && (
        <MapPicker initial={{ lat: form.lat ?? undefined, lon: form.lon ?? undefined, address: form.address, note: form.note }}
          city={form.city} onSave={savePlace} onClose={() => setSheet(null)} />
      )}
      {photoMenu && (
        <Sheet onClose={() => setPhotoMenu(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {portfolio && portfolio[0]?.id !== photoMenu.id && (
              <PrimaryButton variant="soft" onClick={() => makeCover(photoMenu.id)}>{t('ep_make_cover')}</PrimaryButton>
            )}
            <PrimaryButton variant="danger" onClick={() => removePhoto(photoMenu.id)}>{t('ep_photo_delete')}</PrimaryButton>
          </div>
        </Sheet>
      )}

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
