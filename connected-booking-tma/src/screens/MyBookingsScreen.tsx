import React, { useEffect, useMemo, useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';

import type { Booking } from '../helpers/api';
import { fetchMyBookings, cancelBooking } from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { Konnektik } from '../components/Konnektik';
import { Avatar, Badge, PrimaryButton, card, money } from '../components/ui';
import { useWhen } from './ClientHomeScreen';

type Props = {
  telegramId: number;
  onBack?: () => void;
  onGoToServices?: () => void;          // «Записаться» — на главную
  onReview?: (booking: Booking) => void;
  onOpenMaster?: (masterId: number, masterName: string) => void;
};

type Segment = 'upcoming' | 'past';

const tg = () => (window as any).Telegram?.WebApp;

function mapsUrl(b: Booking) {
  const i = b.master_info;
  if (!i) return null;
  if (i.latitude != null && i.longitude != null) return `https://yandex.ru/maps/?pt=${i.longitude},${i.latitude}&z=17&l=map`;
  const q = [i.city, i.address].filter(Boolean).join(', ');
  return q ? `https://yandex.ru/maps/?text=${encodeURIComponent(q)}` : null;
}

function openLink(url: string) {
  const w = tg();
  if (w?.openLink) w.openLink(url);
  else window.open(url, '_blank');
}

const StatusBadge: React.FC<{ status: Booking['status']; past?: boolean }> = ({ status, past }) => {
  const { t } = useLanguage();
  if (status === 'rejected') return <Badge tone="off">{t('status_rejected')}</Badge>;
  if (past) return <Badge tone="off">{t('mb_done')}</Badge>;
  return status === 'confirmed'
    ? <Badge tone="ok">✓ {t('status_confirmed')}</Badge>
    : <Badge tone="wait">⏳ {t('status_pending')}</Badge>;
};

export const MyBookingsScreen: React.FC<Props> = ({ telegramId, onGoToServices, onReview, onOpenMaster }) => {
  const { t } = useLanguage();
  const when = useWhen();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [segment, setSegment] = useState<Segment>('upcoming');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () => fetchMyBookings(telegramId).then(setBookings).catch(() => setBookings([]));
  useEffect(() => { load(); }, [telegramId]); // eslint-disable-line react-hooks/exhaustive-deps

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up: Booking[] = [];
    const pa: Booking[] = [];
    (bookings || []).forEach((b) => {
      const future = new Date(b.slot.time).getTime() >= now;
      if (future && b.status !== 'rejected') up.push(b);
      else pa.push(b);
    });
    up.sort((a, b) => +new Date(a.slot.time) - +new Date(b.slot.time));
    pa.sort((a, b) => +new Date(b.slot.time) - +new Date(a.slot.time));
    return { upcoming: up, past: pa };
  }, [bookings]);

  const confirmAsk = (msg: string) => new Promise<boolean>((resolve) => {
    const w = tg();
    if (w?.showConfirm) w.showConfirm(msg, (ok: boolean) => resolve(ok));
    else resolve(window.confirm(msg));
  });
  const say = (msg: string) => (tg()?.showAlert ? tg().showAlert(msg) : alert(msg));

  const cancel = async (b: Booking) => {
    if (!(await confirmAsk(t('confirm_cancel')))) return;
    setBusyId(b.id);
    try {
      await cancelBooking(b.id);
      tg()?.HapticFeedback?.notificationOccurred('success');
      await load();
    } catch (e: any) {
      // Сервер не даёт отменить меньше чем за 30 минут — показываем его объяснение
      const detail = String(e?.message || '').match(/"detail":"([^"]+)"/)?.[1];
      say(detail || t('error_cancel'));
    } finally {
      setBusyId(null);
    }
  };

  if (bookings === null) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size="l" /></div>;
  }

  const [hero, ...rest] = upcoming;
  const tabBtn = (s: Segment, label: string, count: number) => (
    <button type="button" onClick={() => { tg()?.HapticFeedback?.selectionChanged(); setSegment(s); }} style={{
      flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 600,
      backgroundColor: segment === s ? 'var(--tg-theme-bg-color)' : 'transparent',
      color: 'var(--tg-theme-text-color)', boxShadow: segment === s ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
    }}>
      {label}{count ? ` · ${count}` : ''}
    </button>
  );

  return (
    <div style={{ padding: '20px 16px 110px', color: 'var(--tg-theme-text-color)' }}>
      <div style={{ fontSize: 26, fontWeight: 800 }}>{t('mb_title')}</div>

      <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, marginTop: 14, backgroundColor: 'rgba(127,127,127,0.12)' }}>
        {tabBtn('upcoming', t('tab_upcoming'), upcoming.length)}
        {tabBtn('past', t('tab_past'), 0)}
      </div>

      {segment === 'upcoming' && (
        upcoming.length === 0 ? (
          <Empty title={t('mb_empty_title')} text={t('mb_empty_text')} action={t('mb_book')} onAction={onGoToServices} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {/* Ближайшая запись — крупно, со всем нужным для визита */}
            <div style={{ ...card, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <StatusBadge status={hero.status} />
                <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>{t('mb_nearest')}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 10 }}>{when(hero.slot.time)}</div>
              <div style={{ fontSize: 16, marginTop: 2 }}>
                {hero.service_name}
                {hero.master_info?.price ? <span style={{ color: 'var(--tg-theme-hint-color)' }}> · {money(hero.master_info.price)}</span> : null}
              </div>

              <button type="button" onClick={() => hero.master_info && onOpenMaster?.(hero.master_info.id, hero.master_name || '')}
                style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', color: 'inherit', fontFamily: 'inherit' }}>
                <Avatar src={hero.master_info?.avatar_url} name={hero.master_name || '?'} size={40} />
                <div>
                  <div style={{ fontWeight: 600 }}>{hero.master_name}</div>
                  {(hero.master_info?.business || hero.master_info?.address) && (
                    <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
                      {[hero.master_info?.business, hero.master_info?.address].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              </button>

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                {mapsUrl(hero) && (
                  <div style={{ flex: 1 }}>
                    <PrimaryButton variant="soft" onClick={() => openLink(mapsUrl(hero)!)}>🧭 {t('mb_route')}</PrimaryButton>
                  </div>
                )}
                {hero.master_info?.phone && (
                  <div style={{ flex: 1 }}>
                    <PrimaryButton variant="soft" onClick={() => { window.location.href = `tel:${hero.master_info!.phone}`; }}>📞 {t('mb_call')}</PrimaryButton>
                  </div>
                )}
              </div>
              {hero.status === 'pending' && (
                <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginTop: 10 }}>{t('mb_pending_hint')}</div>
              )}
              <button type="button" disabled={busyId === hero.id} onClick={() => cancel(hero)}
                style={{ marginTop: 12, padding: 0, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--tg-theme-hint-color)', fontSize: 14, fontFamily: 'inherit', textDecoration: 'underline' }}>
                {busyId === hero.id ? '…' : t('mb_cancel')}
              </button>
            </div>

            {rest.map((b) => (
              <div key={b.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar src={b.master_info?.avatar_url} name={b.master_name || '?'} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{when(b.slot.time)}</div>
                  <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {b.service_name} · {b.master_name}
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <StatusBadge status={b.status} />
                    <button type="button" disabled={busyId === b.id} onClick={() => cancel(b)}
                      style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--tg-theme-hint-color)', fontSize: 13, fontFamily: 'inherit' }}>
                      {t('mb_cancel')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {segment === 'past' && (
        past.length === 0 ? (
          <Empty title={t('mb_past_empty')} text="" action={t('mb_book')} onAction={onGoToServices} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {past.map((b) => (
              <div key={b.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, opacity: b.status === 'rejected' ? 0.65 : 1 }}>
                <Avatar src={b.master_info?.avatar_url} name={b.master_name || '?'} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.service_name}</div>
                  <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>{when(b.slot.time)} · {b.master_name}</div>
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                    <StatusBadge status={b.status} past />
                    {b.master_info && onOpenMaster && (
                      <button type="button" onClick={() => onOpenMaster(b.master_info!.id, b.master_name || '')}
                        style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--brand-ink)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
                        ↻ {t('mb_again')}
                      </button>
                    )}
                    {b.status === 'confirmed' && onReview && (
                      <button type="button" onClick={() => onReview(b)}
                        style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--brand-ink)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
                        ★ {t('rate_master')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

const Empty: React.FC<{ title: string; text: string; action: string; onAction?: () => void }> = ({ title, text, action, onAction }) => (
  <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 24, marginTop: 16 }}>
    <Konnektik mood="think" size={120} />
    <div style={{ fontWeight: 700, fontSize: 17, marginTop: 10 }}>{title}</div>
    {text && <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', marginTop: 4 }}>{text}</div>}
    {onAction && <div style={{ width: '100%', marginTop: 16 }}><PrimaryButton onClick={onAction}>{action}</PrimaryButton></div>}
  </div>
);
