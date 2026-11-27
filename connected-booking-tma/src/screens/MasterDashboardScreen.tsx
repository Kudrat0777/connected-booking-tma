import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Spinner, Tabbar } from '@telegram-apps/telegram-ui';
import { Icon28CalendarOutline, Icon28ServicesOutline, Icon28StatisticsOutline, Icon28UserCircleOutline, Icon28Users3Outline } from '@vkontakte/icons';

import {
  confirmBooking, deleteAccount, fetchCurrentMaster, fetchMasterBookings, fetchMyServices,
  rejectBooking, updateMasterProfile, Booking, CurrentMaster, Service,
} from '../helpers/api';
import { CLASS_FIRST, professionOf } from '../helpers/professions';
import { useLanguage } from '../helpers/LanguageContext';
import { fill, pluralize } from '../helpers/translationsBusiness';
import { clientLink, shareToTelegram } from '../helpers/links';
import { Konnektik } from '../components/Konnektik';
import { Avatar, Badge, PrimaryButton, Sheet, card, localeFor, money, tashkent } from '../components/ui';
import { ManualBookingSheet, ServiceSheet } from '../components/MasterSheets';
import { MasterProfileTab } from '../components/MasterProfileTab';
import { ClassManage, ClassSession, fetchClassManage, setSessionCanceled } from '../helpers/classes';
import { ask, tell } from '../components/ClassSchedule';
import { Roster } from './MasterGroupsScreen';
import { useWhen } from './ClientHomeScreen';

type Props = {
  telegramId: number;
  onSwitchToClient: () => void;
  onOpenSchedule: () => void;
  onEditProfile: () => void;
  onOpenAnalytics: () => void;
  /** Аналитика групповых занятий (инструктор) */
  onOpenClassAnalytics?: () => void;
  onOpenReviews: () => void;
  onLogout?: () => void;
  onOpenLinks?: () => void;
  onOpenTeam?: () => void;
  onOpenSalonCalendar?: () => void;
  onOpenClients?: () => void;
  onOpenGroups?: (tab?: 'programs') => void;
  classTarget?: { group: number; date: string } | null;
  onClassTargetOpened?: () => void;
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
  const { t, lang, setProfession } = useLanguage();
  const when = useWhen();

  const [tab, setTab] = useState<Tab>('bookings');
  const [me, setMe] = useState<CurrentMaster | null>(null);

  const [period, setPeriod] = useState<Period>('today');
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [pending, setPending] = useState<Booking[]>([]);
  const [todayStats, setTodayStats] = useState<{ count: number; money: number } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [classData, setClassData] = useState<ClassManage | null>(null);
  const [classOpen, setClassOpen] = useState<{ date: string; session: ClassSession } | null>(null);
  const [classBusy, setClassBusy] = useState(false);

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
  // Слова профессии во всём кабинете: «ученики», «пациенты», «Занятия»…
  const profession = me ? professionOf(me) : null;
  useEffect(() => { if (profession) setProfession(profession); }, [profession, setProfession]);
  const classFirst = !!profession && CLASS_FIRST.has(profession);

  // Бот мастера пишет на языке кабинета: сохраняем и смену языка, и прежнее расхождение
  const savedLang = me?.language;
  useEffect(() => {
    if (!savedLang || savedLang === lang) return;
    updateMasterProfile(telegramId, { language: lang })
      .then(() => setMe((m) => (m ? { ...m, language: lang } : m)))
      .catch(() => {});
  }, [savedLang, lang, telegramId]);

  const loadBookings = useCallback(() => {
    setBookings(null);
    fetchClassManage().then(setClassData).catch(() => {});
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
    if (await confirmAsk(t('m_logout_confirm'))) setTimeout(() => { setProfession(null); onLogout?.(); }, 10);
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

  // Групповые занятия по дням; в «Все» — только те, куда кто-то записан
  const classesByDay = useMemo(() => {
    const shift = (n: number) => {
      const d = new Date(`${tashkent.today()}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    };
    const [from, to] = period === 'today' ? [shift(0), shift(0)] : period === 'tomorrow' ? [shift(1), shift(1)]
      : period === 'week' ? [shift(0), shift(6)] : [shift(0), shift(31)];
    const out: Record<string, ClassSession[]> = {};
    (classData?.days || []).forEach((d) => {
      if (d.date < from || d.date > to) return;
      const list = d.sessions.filter((s) => period !== 'all' || s.taken + s.waiting > 0);
      if (list.length) out[d.date] = list;
    });
    return out;
  }, [classData, period]);
  const dayKeys = [...new Set([...Object.keys(grouped), ...Object.keys(classesByDay)])].sort();
  const classesToday = (classData?.days.find((d) => d.date === tashkent.today())?.sessions || [])
    .reduce((n, s) => n + s.taken, 0);

  // Пришли по кнопке из бота: сразу открываем список этого занятия
  const { classTarget, onClassTargetOpened } = props;
  useEffect(() => {
    if (!classTarget || !classData) return;
    const session = classData.days.find((d) => d.date === classTarget.date)?.sessions
      .find((s) => s.group === classTarget.group);
    if (session) setClassOpen({ date: classTarget.date, session });
    onClassTargetOpened?.();
  }, [classTarget, classData]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleClass = async (canceled: boolean) => {
    if (!classOpen || classBusy) return;
    const { date, session } = classOpen;
    if (canceled && !(await ask(fill(t('gc_cancel_session_q'), { n: session.taken + session.waiting })))) return;
    setClassBusy(true);
    try {
      setClassData(await setSessionCanceled(session.group, date, canceled));
      setClassOpen(null);
    } catch (e: any) {
      tell(lang === 'ru' && e?.message ? e.message : t('gc_err'));
    } finally { setClassBusy(false); }
  };

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
            {b.status === 'pending' ? <Badge tone="wait">{t('status_pending')}</Badge>
              : b.client_confirmed_at ? <Badge tone="brand">✅ {t('md_will_come')}</Badge> : <Badge tone="ok">✓</Badge>}
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

  const renderHeader = () => (
    <>
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

    </>
  );

  // ---------- Йога, фитнес, танцы, курсы: на главной групповые занятия ----------
  const renderClasses = () => {
    const today = tashkent.today();
    const days = (classData?.days || []).filter((d) => d.date >= today && d.sessions.length > 0);
    const todayDay = days.find((d) => d.date === today);
    const shown = todayDay ?? days[0];
    const todaySessions = (todayDay?.sessions || []).filter((s) => s.state !== 'canceled');
    const signedToday = todaySessions.reduce((n, s) => n + s.taken, 0);
    const personal = grouped[today] || [];
    const noGroups = classData !== null && classData.groups.length === 0;

    return (
      <div style={{ padding: '20px 16px 120px' }}>
        {renderHeader()}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 16 }}>
          <Stat label={t('pf_stat_classes')} value={classData ? String(todaySessions.length) : '…'} />
          <Stat label={t('pf_stat_signed')} value={classData ? String(signedToday) : '…'} />
        </div>

        {pending.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 17, fontWeight: 700, margin: '0 4px 10px', color: '#C46A00' }}>
              {fill(t('md_pending_title'), { n: pending.length })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pending.slice(0, 5).map((b) => <BookingCard key={b.id} b={b} />)}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, margin: '22px 4px 10px' }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{todayDay || !shown ? t('pf_today_classes') : t('pf_next_classes')}</div>
          {shown && !todayDay && <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--brand-ink)' }}>{dayTitle(shown.date)}</div>}
        </div>

        {classData === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size="l" /></div>
        ) : noGroups ? (
          <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 24 }}>
            <Konnektik mood="explain" size={110} />
            <div style={{ fontWeight: 800, fontSize: 17, marginTop: 10 }}>{t('pf_no_groups')}</div>
            <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', margin: '4px 0 14px', lineHeight: 1.4 }}>{t('pf_no_groups_hint')}</div>
            <PrimaryButton onClick={() => props.onOpenGroups?.()}>{t('pf_create_group')}</PrimaryButton>
          </div>
        ) : !shown ? (
          <div style={{ ...card, textAlign: 'center', padding: 20, color: 'var(--tg-theme-hint-color)' }}>{t('pf_no_classes_soon')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shown.sessions.map((s) => {
              const canceled = s.state === 'canceled';
              const fillPct = s.capacity ? Math.min(100, Math.round((s.taken / s.capacity) * 100)) : 0;
              return (
                <button key={s.group} type="button" onClick={() => setClassOpen({ date: shown.date, session: s })} style={{
                  ...card, display: 'flex', flexDirection: 'column', gap: 10, width: '100%', border: 'none', cursor: 'pointer',
                  textAlign: 'left', color: 'var(--tg-theme-text-color)', fontFamily: 'inherit', opacity: canceled ? 0.6 : 1,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                    <span style={{ width: 58, flex: '0 0 auto', display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 20, fontWeight: 800 }}>{tashkent.time(s.start)}</span>
                      <span style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>{fill(t('pf_minutes'), { n: s.duration })}</span>
                    </span>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 16, fontWeight: 700 }}>{s.name}</span>
                      {shown.program && (
                        <span style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)' }}>{fill(t('pf_program'), { name: shown.program.title })}</span>
                      )}
                      {s.waiting > 0 && <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>{fill(t('gc_waiting'), { n: s.waiting })}</span>}
                    </span>
                    {canceled ? <Badge tone="off">{t('gc_canceled')}</Badge> : (
                      <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                        backgroundColor: 'var(--brand-soft)', color: 'var(--brand-ink)' }}>
                        {s.capacity != null ? fill(t('pf_of'), { n: s.taken, max: s.capacity }) : fill(t('gc_signed'), { n: s.taken })}
                      </span>
                    )}
                  </span>
                  {s.capacity != null && !canceled && (
                    <span aria-hidden="true" style={{ display: 'block', height: 6, borderRadius: 3, backgroundColor: 'rgba(127,127,127,0.18)' }}>
                      <span style={{ display: 'block', width: `${fillPct}%`, height: 6, borderRadius: 3, backgroundColor: 'var(--brand-accent)' }} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 14 }}>
          <QuickAction icon="groups" label={t('pf_qa_groups')} onClick={() => props.onOpenGroups?.()} />
          <QuickAction icon="programs" label={t('pf_qa_programs')} onClick={() => props.onOpenGroups?.('programs')} />
          <QuickAction icon="link" label={t('pf_qa_link')} onClick={props.onOpenLinks} />
        </div>

        {personal.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tg-theme-hint-color)', textTransform: 'uppercase', margin: '22px 4px 8px' }}>
              {t('pf_personal')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {personal.map((b) => <BookingCard key={b.id} b={b} />)}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderBookings = () => (
    <div style={{ padding: '20px 16px 170px' }}>
      {renderHeader()}

      {/* Сводка дня */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16 }}>
        <Stat label={t('md_today')} value={todayStats ? String(todayStats.count + classesToday) : '…'} />
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
      ) : dayKeys.length === 0 ? (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 24, marginTop: 14 }}>
          <Konnektik mood="think" size={110} />
          <div style={{ fontWeight: 700, marginTop: 10 }}>{t('md_empty')}</div>
          <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', marginTop: 4, marginBottom: 14 }}>{t('md_empty_hint')}</div>
          <PrimaryButton variant="soft" onClick={props.onOpenLinks}>{t('prof_links')}</PrimaryButton>
        </div>
      ) : (
        dayKeys.map((d) => (
          <div key={d}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tg-theme-hint-color)', textTransform: 'uppercase', margin: '18px 4px 8px' }}>
              {dayTitle(d)} · {pluralize(lang, (grouped[d]?.length || 0) + (classesByDay[d] || []).reduce((n, s) => n + s.taken, 0), t('p_bookings'))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(classesByDay[d] || []).map((s) => (
                <button key={`c${s.group}`} type="button" onClick={() => setClassOpen({ date: d, session: s })} style={{
                  ...card, display: 'flex', alignItems: 'center', gap: 12, width: '100%', border: 'none', cursor: 'pointer',
                  textAlign: 'left', color: 'var(--tg-theme-text-color)', fontFamily: 'inherit', fontSize: 15,
                }}>
                  <span style={{ width: 48, flex: '0 0 auto', textAlign: 'center', fontSize: 17, fontWeight: 800 }}>{tashkent.time(s.start)}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 700 }}>{s.name}</span>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
                      {fill(t('gc_signed'), { n: s.taken })}{s.capacity != null ? ` / ${s.capacity}` : ''}
                      {s.waiting > 0 ? ` · ${fill(t('gc_waiting'), { n: s.waiting })}` : ''}
                    </span>
                  </span>
                  {s.state === 'canceled' && <Badge tone="off">{t('gc_canceled')}</Badge>}
                  <span aria-hidden="true">›</span>
                </button>
              ))}
              {(grouped[d] || []).map((b) => <BookingCard key={b.id} b={b} />)}
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
        {tab === 'bookings' && (classFirst ? renderClasses() : renderBookings())}
        {tab === 'services' && renderServices()}
        {tab === 'profile' && (
          <MasterProfileTab
            me={me}
            servicesCount={services?.length ?? 0}
            hideServicesWarning={classFirst}
            onEditProfile={props.onEditProfile}
            onOpenSchedule={props.onOpenSchedule}
            onOpenAnalytics={classFirst && props.onOpenClassAnalytics ? props.onOpenClassAnalytics : props.onOpenAnalytics}
            onOpenReviews={props.onOpenReviews}
            onOpenLinks={props.onOpenLinks}
            onOpenTeam={props.onOpenTeam}
            onOpenSalonCalendar={props.onOpenSalonCalendar}
            onOpenClients={props.onOpenClients}
            onOpenGroups={props.onOpenGroups}
            onSwitchToClient={() => { setProfession(null); props.onSwitchToClient(); }}
            onLogoutClick={handleLogout}
            onDeleteAccount={handleDeleteAccount}
          />
        )}
      </main>

      {!(serviceSheet || manualOpen || newClient || classOpen) && (
      classFirst ? (
        // Инструктор: четыре раздела как в макете; своя панель, чтобы все подписи помещались на телефоне
        <nav aria-label={t('md_tab_bookings')} style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          padding: '6px 4px calc(6px + env(safe-area-inset-bottom))', backgroundColor: 'var(--tg-theme-bg-color)',
          borderTop: '1px solid rgba(127,127,127,0.18)',
        }}>
          <NavItem label={t('md_tab_bookings')} active={tab === 'bookings'} onClick={() => setTab('bookings')}><Icon28CalendarOutline /></NavItem>
          <NavItem label={t('cl_title')} onClick={() => props.onOpenClients?.()}><Icon28Users3Outline /></NavItem>
          <NavItem label={t('pf_tab_analytics')} onClick={() => (props.onOpenClassAnalytics ?? props.onOpenAnalytics)()}><Icon28StatisticsOutline /></NavItem>
          <NavItem label={t('tab_profile')} active={tab === 'profile'} onClick={() => setTab('profile')}><Icon28UserCircleOutline /></NavItem>
        </nav>
      ) : (
      <Tabbar style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 }}>
        <Tabbar.Item text={t('md_tab_bookings')} selected={tab === 'bookings'} onClick={() => setTab('bookings')}><Icon28CalendarOutline /></Tabbar.Item>
        <Tabbar.Item text={t('m_tab_services')} selected={tab === 'services'} onClick={() => setTab('services')}><Icon28ServicesOutline /></Tabbar.Item>
        <Tabbar.Item text={t('tab_profile')} selected={tab === 'profile'} onClick={() => setTab('profile')}><Icon28UserCircleOutline /></Tabbar.Item>
      </Tabbar>
      )
      )}

      {classOpen && (
        <Sheet onClose={() => setClassOpen(null)}>
          <Roster date={classOpen.date} session={classOpen.session} busy={classBusy}
            onCancel={() => toggleClass(true)} onRestore={() => toggleClass(false)} />
        </Sheet>
      )}

      {manualOpen && (
        <ManualBookingSheet
          services={services || []}
          onClose={() => setManualOpen(false)}
          onCreated={({ isNewClient, name }) => { setManualOpen(false); loadBookings(); if (isNewClient) setNewClient(name); else say(t('m_booking_created_notify')); }}
        />
      )}

      {serviceSheet && (
        <ServiceSheet telegramId={telegramId} service={serviceSheet === 'new' ? null : serviceSheet} category={profession ?? undefined}
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

/** Плитка быстрого действия на главной инструктора: иконки в стиле профессий */
const QA_PATHS: Record<string, { d: string[]; dot: [number, number, number] }> = {
  groups: { d: ['M4 6.5h16v13H4z', 'M4 10.5h16M8.5 4v4M15.5 4v4'], dot: [12, 15, 1.7] },
  programs: { d: ['M5 4.5h14v15H5z', 'M8.5 9h7M8.5 13h7M8.5 17h4'], dot: [18.5, 4.5, 2] },
  link: { d: ['M9.5 14.5l5-5', 'M11 6.5l1.5-1.5a4 4 0 0 1 5.7 5.7L16.7 12.2', 'M13 17.5l-1.5 1.5a4 4 0 0 1-5.7-5.7L7.3 11.8'], dot: [19, 19, 2] },
};
const QuickAction: React.FC<{ icon: keyof typeof QA_PATHS; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => {
  const g = QA_PATHS[icon];
  return (
    <button type="button" onClick={onClick} style={{
      ...card, height: 84, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
      color: 'var(--tg-theme-text-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 8, padding: '0 6px',
    }}>
      <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {g.d.map((d) => <path key={d} d={d} />)}
        <circle cx={g.dot[0]} cy={g.dot[1]} r={g.dot[2]} fill="var(--brand-accent, #50C878)" stroke="none" />
      </svg>
      {label}
    </button>
  );
};

/** Раздел нижней панели инструктора */
const NavItem: React.FC<{ label: string; active?: boolean; onClick?: () => void; children: React.ReactNode }> = ({ label, active, onClick, children }) => (
  <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined} style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 0', border: 'none', background: 'none',
    cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: active ? 700 : 600, minWidth: 0,
    color: active ? 'var(--brand-accent, #50C878)' : 'var(--tg-theme-hint-color)',
  }}>
    {children}
    <span style={{ maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
  </button>
);
