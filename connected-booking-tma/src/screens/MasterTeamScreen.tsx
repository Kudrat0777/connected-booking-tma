import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Title, Text, Button, Spinner } from '@telegram-apps/telegram-ui';
import { Icon28CopyOutline, Icon28ShareOutline } from '@vkontakte/icons';

import { fetchMyBusiness, regenerateInvite, updateTeamMember, MyBusiness, TeamMember } from '../helpers/api';
import { copyText, inviteLink, shareToTelegram } from '../helpers/links';
import { Konnektik } from '../components/Konnektik';
import { useLanguage } from '../helpers/LanguageContext';
import { fill, pluralize } from '../helpers/translationsBusiness';

type Props = {
  onBack: () => void;
  onOpenSchedule?: (memberId: number) => void;
};

const ROLE_COLOR: Record<string, string> = { owner: '#50C878', admin: '#007AFF', master: '#8E8E93' };

const card: React.CSSProperties = {
  backgroundColor: 'var(--tg-theme-bg-color)',
  borderRadius: 16,
  padding: 16,
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
};

export const MasterTeamScreen: React.FC<Props> = ({ onBack, onOpenSchedule }) => {
  const tg = (window as any).Telegram?.WebApp;
  const { t, lang } = useLanguage();
  const [biz, setBiz] = useState<MyBusiness | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const backRef = useRef(onBack);
  backRef.current = onBack;
  useEffect(() => {
    if (!tg?.BackButton) return;
    const h = () => backRef.current();
    tg.BackButton.show();
    tg.BackButton.onClick(h);
    return () => tg.BackButton.offClick(h);
  }, [tg]);

  const load = useCallback(() => {
    fetchMyBusiness().then(setBiz).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const say = (msg: string) => (tg?.showAlert ? tg.showAlert(msg) : alert(msg));
  const confirmAsk = (msg: string) => new Promise<boolean>((resolve) => {
    if (tg?.showConfirm) tg.showConfirm(msg, (ok: boolean) => resolve(ok));
    else resolve(window.confirm(msg));
  });
  const haptic = () => tg?.HapticFeedback?.impactOccurred('light');

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <Konnektik mood="think" size={140} />
        <Text style={{ marginTop: 16, color: 'var(--tg-theme-hint-color)' }}>{error}</Text>
      </div>
    );
  }
  if (!biz) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size="l" /></div>;
  }

  const canManage = biz.my_role === 'owner' || biz.my_role === 'admin';
  const isOwner = biz.my_role === 'owner';
  const link = biz.invite_code ? inviteLink(biz.invite_code) : '';
  const members: TeamMember[] = biz.members || [];

  const onCopy = async () => {
    haptic();
    say((await copyText(link)) ? t('team_invite_copied') : link);
  };

  const onRegenerate = async () => {
    if (!(await confirmAsk(t('team_new_link_confirm')))) return;
    try {
      const { invite_code } = await regenerateInvite();
      setBiz({ ...biz, invite_code });
    } catch (e: any) { say(e.message); }
  };

  const act = async (m: TeamMember, data: Parameters<typeof updateTeamMember>[1], confirmText?: string) => {
    if (confirmText && !(await confirmAsk(confirmText))) return;
    setBusyId(m.id);
    try { await updateTeamMember(m.id, data); load(); } catch (e: any) { say(e.message); } finally { setBusyId(null); }
  };

  return (
    <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', minHeight: '100vh', paddingBottom: 40, color: 'var(--tg-theme-text-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '24px 20px 8px' }}>
        <Konnektik mood="happy" size={84} />
        <div>
          <Title level="2" weight="1" style={{ marginBottom: 4 }}>{fill(t('team_title'), { name: biz.name })}</Title>
          <Text style={{ color: 'var(--tg-theme-hint-color)', fontSize: 14 }}>
            {members.length
              ? fill(t('team_count'), { count: pluralize(lang, members.length, t('p_people')) })
              : t('team_fallback')}
          </Text>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 16px' }}>
        {canManage && link && (
          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{t('team_invite_title')}</div>
            <Text style={{ display: 'block', fontSize: 14, color: 'var(--tg-theme-hint-color)', marginBottom: 12 }}>
              {t('team_invite_desc')}
            </Text>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="m" mode="bezeled" stretched before={<Icon28CopyOutline width={20} height={20} />} onClick={onCopy}>
                {t('btn_copy')}
              </Button>
              <Button size="m" mode="filled" stretched before={<Icon28ShareOutline width={20} height={20} />}
                onClick={() => { haptic(); shareToTelegram(link, fill(t('team_invite_share'), { name: biz.name })); }}>
                {t('btn_send')}
              </Button>
            </div>
            <div style={{ marginTop: 8 }}>
              <Button size="s" mode="plain" onClick={onRegenerate}>{t('team_new_link')}</Button>
            </div>
          </div>
        )}

        {members.map((m) => {
          return (
            <div key={m.id} style={{ ...card, opacity: m.is_active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'var(--tg-theme-secondary-bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>
                  {m.name.slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
                    {fill(t('team_member_stats'), {
                      services: pluralize(lang, m.services_count, t('p_services')),
                      bookings: pluralize(lang, m.upcoming_bookings, t('p_bookings')),
                    })}{!m.is_active && ` · ${t('team_hidden')}`}
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: ROLE_COLOR[m.role], backgroundColor: `${ROLE_COLOR[m.role]}1A`, padding: '4px 8px', borderRadius: 8 }}>
                  {t(`roles_${m.role}`)}
                </span>
              </div>

              {canManage && (
                <div style={{ marginTop: 10 }}>
                  <Button size="s" mode="plain" onClick={() => { haptic(); onOpenSchedule?.(m.id); }}>
                    {t('team_schedule')}
                  </Button>
                </div>
              )}

              {canManage && m.role !== 'owner' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  {isOwner && (
                    <Button size="s" mode="bezeled" disabled={busyId === m.id}
                      onClick={() => act(m, { role: m.role === 'admin' ? 'master' : 'admin' })}>
                      {m.role === 'admin' ? t('team_make_master') : t('team_make_admin')}
                    </Button>
                  )}
                  <Button size="s" mode="bezeled" disabled={busyId === m.id}
                    onClick={() => act(m, { is_active: !m.is_active })}>
                    {m.is_active ? t('team_hide') : t('team_show')}
                  </Button>
                  <Button size="s" mode="plain" disabled={busyId === m.id}
                    onClick={() => act(m, { action: 'remove' }, fill(t('team_remove_confirm'), { name: m.name }))}>
                    <span style={{ color: 'var(--tg-theme-destructive-text-color, #FF3B30)' }}>{t('team_remove')}</span>
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {members.length <= 1 && canManage && (
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Konnektik mood="think" size={70} />
            <Text style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)' }}>
              {t('team_alone')}
            </Text>
          </div>
        )}
      </div>
    </div>
  );
};
