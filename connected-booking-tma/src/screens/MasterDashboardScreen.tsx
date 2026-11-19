import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Spinner, Tabbar } from '@telegram-apps/telegram-ui';
import { Icon28CalendarOutline, Icon28ServicesOutline, Icon28UserCircleOutline } from '@vkontakte/icons';

import {
  confirmBooking, deleteAccount, fetchCurrentMaster, fetchMasterBookings, fetchMyServices,
  rejectBooking, Booking, CurrentMaster, Service,
} from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { fill, pluralize } from '../helpers/translationsBusiness';
import { clientLink, shareToTelegram } from '../helpers/links';
import { Konnektik } from '../components/Konnektik';
import { Avatar, Badge, PrimaryButton, Sheet, card, localeFor, money, tashkent } from '../components/ui';
import { ManualBookingSheet, ServiceSheet } from '../components/MasterSheets';
import { MasterProfileTab } from '../components/MasterProfileTab';
import { useWhen } from './ClientHomeScreen';

type Props = {
  telegramId: number;
  onSwitchToClient: () => void;
  onOpenSchedule: () => void;
  onEditProfile: () => void;
  onOpenAnalytics: () => void;
  onOpenReviews: () => void;
  onLogout?: () => void;
  onOpenLinks?: () => void;
  onOpenTeam?: () => void;
  onOpenSalonCalendar?: () => void;
  onOpenClients?: () => void;
};

type Tab = 'bookings' | 'services' | 'profile';
type Period = 'today' | 'tomorrow' | 'week' | 'all';

const tgApp = () => (window as any).Telegram?.WebApp;
const say = (m: string) => (tgApp()?.showAlert ? tgApp().showAlert(m) : alert(m));
const confirmAsk = (m: string) => new Promise<boolean>((resolve) => {
  if (tgApp()?.showConfirm) tgApp().showConfirm(m, (ok: boolean) => resolve(ok));
  else resolve(window.confirm(m));
});

export const MasterDashboardScreen: React.FC<Props> = (props) => {
  const { telegramId, onLogout } = props;
  const { t, lang } = useLanguage();
  const when = useWhen();

  const [tab, setTab] = useState<Tab>('bookings');
  const [me, setMe] = useState<CurrentMaster | null>(null);

  const [period, setPeriod] = useState<Period>('today');
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [pending, setPending] = useState<Booking[]>([]);
  const [todayStats, setTodayStats] = useState<{ count: number; money: number } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [services, setServices] = useState<Service[] | null>(null);
  const [serviceSheet, setServiceSheet] = useState<Service | 'new' | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [newClient, setNewClient] = useState<string | null>(null);

  useEffect(() => {
    const tg = tgApp();
    tg?.BackButton?.hide();
    tg?.MainButton?.hide();
  }, [tab]);

  useEffect(() => { fetchCurrentMaster().then(setMe).catch(() => {}); }, []);

  const loadBookings = useCallback(() => {
    setBookings(null);
    fetchMasterBookings(telegramId, period as any)
      .then((d) => setBookings((d.items || []).filter((b: Booking) => b.status !== 'rejected')))
      .catch(() => setBookings([]));
    // Ждущие подтверждения — за всё будущее время, чтобы ни одна не потерялась
    fetchMasterBookings(telegramId, undefined, 'pending')
      .then((d) => setPending((d.items || []).filter((b: Booking) => new Date(b.slot.time).getTime() > Date.now())))
      .catch(() => setPending([]));
    fetchMasterBookings(telegramId, 'today').then((d) => {
      const items: Booking[] = (d.items || []).filter((b: Booking) => b.status !== 'rejected');
      setTodayStats({ count: items.length, money: items.reduce((s, b) => s + (b.slot.service.price || 0), 0) });
    }).catch(() => {});
  }, [telegramId, period]);

  const loadServices = useCallback(() => {
    fetchMyServices(telegramId).then(setServices).catch(() => setServices([]));
  }, [telegramId]);

  useEffect(() => { if (tab === 'bookings') loadBookings(); }, [tab, loadBookings]);
  useEffect(() => { loadServices(); }, [loadServices]);

  const act = async (b: Booking, action: 'confirm' | 'reject') => {
    if (action === 'reject' && !(await confirmAsk(b.status === 'pending' ? t('m_reject_confirm') : t('md_cancel_confirm')))) return;
    setBusyId(b.id);
    try {
      if (action === 'confirm') await confirmBooking(b.id); else await rejectBooking(b.id);
      tgApp()?.HapticFeedback?.notificationOccurred('success');
      loadBookings();
    } catch { say(t('m_confirm_error')); } finally { setBusyId(null); }
  };

  const handleLogout = async () => {
    if (await confirmAsk(t('m_logout_confirm'))) setTimeout(() => onLogout?.(), 10);
  };

  // Удаление аккаунта — два явных подтверждения вместо ввода «DELETE» (prompt не работает в Telegram на iOS)
  const handleDeleteAccount = async () => {
    if (!(await confirmAsk(t('md_delete_1')))) return;
    if (!(await confirmAsk(t('md_delete_2')))) return;
    try {
      await deleteAccount(telegramId, 'master');
      say(t('m_delete_account_success'));
      onLogout?.();
    } catch { say(t('m_delete_account_error')); }
  };

  const hour = Number(new Date().toLocaleString('en-GB', { timeZone: 'Asia/Tashkent', hour: '2-digit', hour12: false }));
  const greeting = fill(t(hour < 12 ? 'ch_morning' : hour < 18 ? 'ch_day' : 'ch_evening'), { name: me?.name.split(' ')[0] || '' });

  // ---------- вкладка «Записи» ----------
  const grouped = useMemo(() => {
    const g: Record<string, Booking[]> = {};
    (bookings || []).forEach((b) => { (g[tashkent.date(b.slot.time)] ||= []).push(b); });
    Object.values(g).forEach((list) => list.sort((a, b) => +new Date(a.slot.time) - +new Date(b.slot.time)));
    return g;
  }, [bookings]);

  const dayTitle = (d: string) => {
    if (d === tashkent.today()) return t('cal_today_full');
    return new Date(`${d}T12:00:00`).toLocaleDateString(localeFor(lang), { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const BookingCard: React.FC<{ b: Booking; compact?: boolean }> = ({ b }) => {
    const name = b.client_name || b.username || t('md_client');
    const svc = b.slot.service;
    const phone = b.client_phone;
    return (
      <div style={{ ...card, display: 'flex', gap: 12 }}>
        <div style={{ width: 48, flex: '0 0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{tashkent.time(b.slot.time)}</div>
          <div style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)' }}>{svc.duration ? `${svc.duration}′` : ''}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar src={b.photo_url} name={name} size={32} />
            <span style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>{name}</span>
            {b.status === 'pending' ? <Badge tone="wait">{t('status_pending')}</Badge> : <Badge tone="ok">✓</Badge>}
          </div>
          <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', marginTop: 6 }}>
            {svc.name}{svc.price ? ` · ${money(svc.price)}` : ''}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {b.status === 'pending' && (
              <>
                <button type="button" disabled={busyId === b.id} onClick={() => act(b, 'confirm')} style={pillBtn(true)}>✓ {t('cal_confirm')}</button>
                <button type="button" disabled={busyId === b.id} onClick={() => act(b, 'reject')} style={linkBtn}>{t('cal_reject')}</button>
              </>
            )}
            {phone && <a href={`tel:${phone}`} style={{ ...linkBtn, color: 'var(--brand-ink)', textDecoration: 'none' }}>📞 {t('mb_call')}</a>}
            {b.username && <a href={`https://t.me/${b.username}`} target="_blank" rel="noreferrer" style={{ ...linkBtn, color: 'var(--brand-ink)', textDecoration: 'none' }}>✈️ Telegram</a>}
            {b.status === 'confirmed' && (
              <button type="button" disabled={busyId === b.id} onClick={() => act(b, 'reject')} style={linkBtn}>{t('cal_cancel')}</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderBookings = () => (
    <div style={{ padding: '20px 16px 170px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15 }}>{greeting}</div>
          <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', marginTop: 4 }}>
            {new Date().toLocaleDateString(localeFor(lang), { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Tashkent' })}
          </div>
        </div>
        {me && (
          <button type="button" onClick={() => setTab('profile')} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }} aria-label={t('tab_profile')}>
            <Avatar src={me.avatar_url} name={me.name} size={48} radius={16} />
          </button>
        )}
      </div>

      {/* Сводка дня */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16 }}>
        <Stat label={t('md_today')} value={todayStats ? String(todayStats.count) : '…'} />
        <Stat label={t('md_waiting')} value={String(pending.length)} warn={pending.length > 0} />
        <Stat label={t('md_today_money')} value={todayStats ? new Intl.NumberFormat(localeFor(lang), { notation: 'compact', maximumFractionDigits: 1 }).format(todayStats.money) : '…'} />
      </div>

      {/* Ждут подтверждения */}
      {pending.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 17, fontWeight: 700, margin: '0 4px 10px', color: '#C46A00' }}>
            ⏳ {fill(t('md_pending_title'), { n: pending.length })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.slice(0, 5).map((b) => (
              <div key={b.id} style={{ ...card, border: '1px solid rgba(255,149,0,0.35)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar src={b.photo_url} name={b.client_name || t('md_client')} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{b.client_name || b.username || t('md_client')}</div>
                    <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>{when(b.slot.time)} · {b.slot.service.name}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <div style={{ flex: 2 }}><PrimaryButton loading={busyId === b.id} onClick={() => act(b, 'confirm')}>✓ {t('cal_confirm')}</PrimaryButton></div>
                  <div style={{ flex: 1 }}><PrimaryButton variant="danger" onClick={() => act(b, 'reject')}>{t('cal_reject')}</PrimaryButton></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Период */}
      <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, marginTop: 20, backgroundColor: 'rgba(127,127,127,0.12)' }}>
        {(['today', 'tomorrow', 'week', 'all'] as Period[]).map((p) => (
          <button key={p} type="button" onClick={() => { tgApp()?.HapticFeedback?.selectionChanged(); setPeriod(p); }} style={{
            flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
            backgroundColor: period === p ? 'var(--tg-theme-bg-color)' : 'transparent', color: 'var(--tg-theme-text-color)',
            boxShadow: period === p ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}>{t(`md_period_${p}`)}</button>
        ))}
      </div>

      {bookings === null ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size="l" /></div>
      ) : bookings.length === 0 ? (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 24, marginTop: 14 }}>
          <Konnektik mood="think" size={110} />
          <div style={{ fontWeight: 700, marginTop: 10 }}>{t('md_empty')}</div>
          <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', marginTop: 4, marginBottom: 14 }}>{t('md_empty_hint')}</div>
          <PrimaryButton variant="soft" onClick={props.onOpenLinks}>{t('prof_links')}</PrimaryButton>
        </div>
      ) : (
        Object.keys(grouped).sort().map((d) => (
          <div key={d}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tg-theme-hint-color)', textTransform: 'uppercase', margin: '18px 4px 8px' }}>
              {dayTitle(d)} · {pluralize(lang, grouped[d].length, t('p_bookings'))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {grouped[d].map((b) => <BookingCard key={b.id} b={b} />)}
            </div>
          </div>
        ))
      )}

      {/* Записать клиента */}
      <button type="button" onClick={() => setManualOpen(true)} aria-label={t('cal_new_booking')} style={{
        position: 'fixed', right: 16, bottom: 92, zIndex: 30, height: 52, padding: '0 20px', borderRadius: 26, border: 'none', cursor: 'pointer',
        backgroundColor: 'var(--brand-accent)', color: 'var(--brand-on-accent)', fontSize: 16, fontWeight: 700, fontFamily: 'inherit',
        boxShadow: '0 8px 24px rgba(80,200,120,0.45)',
      }}>+ {t('md_add_booking')}</button>
    </div>
  );

  // ---------- вкладка «Услуги» ----------
  const renderServices = () => (
    <div style={{ padding: '20px 16px 120px' }}>
      <div style={{ fontSize: 24, fontWeight: 800 }}>{t('md_services_title')}</div>
      <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', marginTop: 4 }}>{t('md_services_hint')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        {services === null ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size="l" /></div> :
          services.length === 0 ? (
            <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 24 }}>
              <Konnektik mood="explain" size={110} />
              <div style={{ fontWeight: 700, marginTop: 10 }}>{t('md_no_services')}</div>
              <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', marginTop: 4 }}>{t('md_no_services_hint')}</div>
            </div>
          ) : services.map((s) => (
            <button key={s.id} type="button" onClick={() => setServiceSheet(s)} style={{
              ...card, display: 'flex', alignItems: 'center', gap: 12, border: 'none', cursor: 'pointer', textAlign: 'left',
              color: 'var(--tg-theme-text-color)', fontFamily: 'inherit', width: '100%',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{s.name}</div>
                <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.duration ? `${s.duration} ${t('min')}` : ''}{s.description ? ` · ${s.description}` : ''}
                </div>
              </div>
              <div style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{money(s.price)}</div>
              <span aria-hidden="true" style={{ color: 'var(--tg-theme-hint-color)' }}>›</span>
            </button>
          ))}
      </div>
      <div style={{ marginTop: 14 }}><PrimaryButton onClick={() => setServiceSheet('new')}>+ {t('ms_new_title')}</PrimaryButton></div>
    </div>
  );

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--tg-theme-secondary-bg-color)', color: 'var(--tg-theme-text-color)' }}>
      <main style={{ height: '100%', overflowY: 'auto' }}>
        {tab === 'bookings' && renderBookings()}
        {tab === 'services' && renderServices()}
        {tab === 'profile' && (
          <MasterProfileTab
            me={me}
            servicesCount={services?.length ?? 0}
            onEditProfile={props.onEditProfile}
            onOpenSchedule={props.onOpenSchedule}
            onOpenAnalytics={props.onOpenAnalytics}
            onOpenReviews={props.onOpenReviews}
            onOpenLinks={props.onOpenLinks}
            onOpenTeam={props.onOpenTeam}
            onOpenSalonCalendar={props.onOpenSalonCalendar}
            onOpenClients={props.onOpenClients}
            onSwitchToClient={props.onSwitchToClient}
            onLogoutClick={handleLogout}
            onDeleteAccount={handleDeleteAccount}
          />
        )}
      </main>

      {!(serviceSheet || manualOpen || newClient) && (
      <Tabbar style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 }}>
        <Tabbar.Item text={t('md_tab_bookings')} selected={tab === 'bookings'} onClick={() => setTab('bookings')}><Icon28CalendarOutline /></Tabbar.Item>
        <Tabbar.Item text={t('m_tab_services')} selected={tab === 'services'} onClick={() => setTab('services')}><Icon28ServicesOutline /></Tabbar.Item>
        <Tabbar.Item text={t('tab_profile')} selected={tab === 'profile'} onClick={() => setTab('profile')}><Icon28UserCircleOutline /></Tabbar.Item>
      </Tabbar>
      )}

      {manualOpen && (
        <ManualBookingSheet
          services={services || []}
          onClose={() => setManualOpen(false)}
          onCreated={({ isNewClient, name }) => { setManualOpen(false); loadBookings(); if (isNewClient) setNewClient(name); else say(t('m_booking_created_notify')); }}
        />
      )}

      {serviceSheet && (
        <ServiceSheet telegramId={telegramId} service={serviceSheet === 'new' ? null : serviceSheet}
          onClose={() => setServiceSheet(null)} onSaved={() => { setServiceSheet(null); loadServices(); }} />
      )}

      {/* Новый клиент записан вручную — предложить отправить ему ссылку, чтобы он видел запись в Telegram */}
      {newClient && me && (
        <Sheet onClose={() => setNewClient(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <Konnektik mood="happy" size={100} />
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>{fill(t('md_new_client_title'), { name: newClient })}</div>
            <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', margin: '6px 0 16px' }}>{t('md_new_client_text')}</div>
            <PrimaryButton onClick={() => { shareToTelegram(clientLink('m', me.slug), t('links_share_master')); setNewClient(null); }}>
              {t('md_send_link')}
            </PrimaryButton>
          </div>
        </Sheet>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; warn?: boolean }> = ({ label, value, warn }) => (
  <div style={{ ...card, padding: 12, border: warn ? '1px solid rgba(255,149,0,0.4)' : 'none' }}>
    <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2, color: warn ? '#C46A00' : 'inherit' }}>{value}</div>
  </div>
);

const pillBtn = (primary: boolean): React.CSSProperties => ({
  padding: '6px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
  backgroundColor: primary ? 'var(--brand-accent)' : 'var(--brand-soft)', color: primary ? 'var(--brand-on-accent)' : 'var(--brand-ink)',
});
const linkBtn: React.CSSProperties = {
  padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
  color: 'var(--tg-theme-hint-color)',
};
