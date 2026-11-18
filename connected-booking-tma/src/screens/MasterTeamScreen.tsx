import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Title, Text, Button, Spinner } from '@telegram-apps/telegram-ui';
import { Icon28CopyOutline, Icon28ShareOutline } from '@vkontakte/icons';

import { fetchMyBusiness, regenerateInvite, updateTeamMember, MyBusiness, TeamMember } from '../helpers/api';
import { copyText, inviteLink, shareToTelegram } from '../helpers/links';
import { Konnektik } from '../components/Konnektik';

type Props = {
  onBack: () => void;
};

const ROLE_LABEL: Record<string, string> = { owner: 'Владелец', admin: 'Администратор', master: 'Мастер' };
const ROLE_COLOR: Record<string, string> = { owner: '#50C878', admin: '#007AFF', master: '#8E8E93' };

// 1 запись, 2 записи, 5 записей
const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} ${one}`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
};

const card: React.CSSProperties = {
  backgroundColor: 'var(--tg-theme-bg-color)',
  borderRadius: 16,
  padding: 16,
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
};

export const MasterTeamScreen: React.FC<Props> = ({ onBack }) => {
  const tg = (window as any).Telegram?.WebApp;
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
    say((await copyText(link)) ? 'Ссылка-приглашение скопирована' : link);
  };

  const onRegenerate = async () => {
    if (!(await confirmAsk('Старая ссылка перестанет работать. Создать новую?'))) return;
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
          <Title level="2" weight="1" style={{ marginBottom: 4 }}>Команда «{biz.name}»</Title>
          <Text style={{ color: 'var(--tg-theme-hint-color)', fontSize: 14 }}>
            {members.length ? plural(members.length, 'человек', 'человека', 'человек') + ' в команде' : 'Мастера заведения'}
          </Text>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 16px' }}>
        {canManage && link && (
          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Пригласить мастера</div>
            <Text style={{ display: 'block', fontSize: 14, color: 'var(--tg-theme-hint-color)', marginBottom: 12 }}>
              Отправьте ссылку мастеру. Он откроет бота, заполнит профиль и сразу окажется в вашей команде.
            </Text>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="m" mode="bezeled" stretched before={<Icon28CopyOutline width={20} height={20} />} onClick={onCopy}>
                Копировать
              </Button>
              <Button size="m" mode="filled" stretched before={<Icon28ShareOutline width={20} height={20} />}
                onClick={() => { haptic(); shareToTelegram(link, `Присоединяйся к команде «${biz.name}» в CTime`); }}>
                Отправить
              </Button>
            </div>
            <div style={{ marginTop: 8 }}>
              <Button size="s" mode="plain" onClick={onRegenerate}>Создать новую ссылку</Button>
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
                    {plural(m.services_count, 'услуга', 'услуги', 'услуг')} · {plural(m.upcoming_bookings, 'запись', 'записи', 'записей')} впереди{!m.is_active && ' · скрыт'}
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: ROLE_COLOR[m.role], backgroundColor: `${ROLE_COLOR[m.role]}1A`, padding: '4px 8px', borderRadius: 8 }}>
                  {ROLE_LABEL[m.role]}
                </span>
              </div>

              {canManage && m.role !== 'owner' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {isOwner && (
                    <Button size="s" mode="bezeled" disabled={busyId === m.id}
                      onClick={() => act(m, { role: m.role === 'admin' ? 'master' : 'admin' })}>
                      {m.role === 'admin' ? 'Сделать мастером' : 'Сделать админом'}
                    </Button>
                  )}
                  <Button size="s" mode="bezeled" disabled={busyId === m.id}
                    onClick={() => act(m, { is_active: !m.is_active })}>
                    {m.is_active ? 'Скрыть от клиентов' : 'Показать клиентам'}
                  </Button>
                  <Button size="s" mode="plain" disabled={busyId === m.id}
                    onClick={() => act(m, { action: 'remove' }, `Убрать ${m.name} из команды? Его записи сохранятся.`)}>
                    <span style={{ color: 'var(--tg-theme-destructive-text-color, #FF3B30)' }}>Убрать</span>
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
              Пока в команде только вы. Отправьте ссылку-приглашение мастерам — они появятся здесь.
            </Text>
          </div>
        )}
      </div>
    </div>
  );
};
