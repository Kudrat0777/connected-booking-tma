// Кабинет инструктора: ближайшие занятия и списки записанных, группы, программы и особые дни.
import React, { useEffect, useRef, useState } from 'react';
import { Spinner } from '@telegram-apps/telegram-ui';

import {
  ClassGroup, ClassManage, ClassProgram, ClassRule, ClassSession, RosterRow, dayLabel, deleteGroup, fetchClassManage,
  fetchRoster, saveClassOptions, saveGroup, savePrograms, saveRules, setSessionCanceled, weekdayName,
} from '../helpers/classes';
import { useLanguage } from '../helpers/LanguageContext';
import { fill } from '../helpers/translationsBusiness';
import { formatPhone } from '../helpers/phone';
import { ask, tell } from '../components/ClassSchedule';
import { Konnektik } from '../components/Konnektik';
import { Badge, Chip, PrimaryButton, Sheet, card, fieldLabel, inputStyle, localeFor, money, page, tashkent } from '../components/ui';

type Tab = 'days' | 'groups' | 'programs';
type Editor =
  | { kind: 'group'; group?: ClassGroup }
  | { kind: 'program'; index?: number }
  | { kind: 'rule'; index?: number }
  | { kind: 'session'; date: string; session: ClassSession }
  | null;

const tg = () => (window as any).Telegram?.WebApp;
const hint: React.CSSProperties = { fontSize: 13, color: 'var(--tg-theme-hint-color)', lineHeight: 1.4 };
const rowBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left',
  fontFamily: 'inherit', fontSize: 15, color: 'var(--tg-theme-text-color)',
};
const line: React.CSSProperties = { ...rowBtn, background: 'none', padding: '12px 0', borderTop: '1px solid var(--tg-theme-secondary-bg-color)' };
const WEEK = [0, 1, 2, 3, 4, 5, 6];

const Switch: React.FC<{ on: boolean; label: string; onChange: (v: boolean) => void }> = ({ on, label, onChange }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} style={{
    flex: '0 0 50px', height: 30, borderRadius: 15, border: 'none', padding: 3, cursor: 'pointer', textAlign: 'left',
    backgroundColor: on ? 'var(--brand-accent, #50C878)' : 'rgba(127,127,127,0.35)',
  }}>
    <span style={{ display: 'block', width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', transform: on ? 'translateX(20px)' : 'none', transition: 'transform .15s' }} />
  </button>
);

export const MasterGroupsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t, lang } = useLanguage();
  const locale = localeFor(lang);
  const [data, setData] = useState<ClassManage | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>('days');
  const [editor, setEditor] = useState<Editor>(null);
  const [busy, setBusy] = useState(false);

  const backRef = useRef(onBack);
  backRef.current = editor ? () => setEditor(null) : onBack;
  useEffect(() => {
    const w = tg();
    if (!w?.BackButton) return;
    const h = () => backRef.current();
    w.BackButton.show();
    w.BackButton.onClick(h);
    w.MainButton?.hide();
    return () => w.BackButton.offClick(h);
  }, []);

  useEffect(() => { fetchClassManage().then(setData).catch(() => setFailed(true)); }, []);

  const run = async (fn: () => Promise<ClassManage>, close = true) => {
    if (busy) return;
    setBusy(true);
    try {
      setData(await fn());
      tg()?.HapticFeedback?.notificationOccurred('success');
      if (close) setEditor(null);
    } catch (e: any) {
      tell(lang === 'ru' && e?.message ? e.message : t('gc_err'));
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return <div style={{ ...page, display: 'flex', justifyContent: 'center', paddingTop: 120 }}>{failed ? t('gc_err') : <Spinner size="l" />}</div>;
  }

  const days = (g: ClassGroup) => g.weekdays.map((w) => weekdayName(w, locale)).join(', ');
  const moveProgram = (i: number, d: number) => {
    const list = [...data.programs];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    // Следующей остаётся та же программа, даже если её передвинули
    const next = data.next_index === i ? j : data.next_index === j ? i : data.next_index;
    run(() => savePrograms(list, next));
  };

  return (
    <div style={{ ...page, padding: '20px 16px 40px' }}>
      <div style={{ fontSize: 26, fontWeight: 800 }}>{t('gc_manage')}</div>
      <div style={{ display: 'flex', gap: 6, margin: '14px 0', overflowX: 'auto' }}>
        {(['days', 'groups', 'programs'] as Tab[]).map((x) => <Chip key={x} active={tab === x} onClick={() => setTab(x)}>{t(`gc_tab_${x}`)}</Chip>)}
      </div>

      {tab !== 'programs' && data.groups.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: 24, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}><Konnektik mood="explain" size={110} /></div>
          <div style={{ marginTop: 8 }}>{t('gc_empty')}</div>
        </div>
      )}

      {tab === 'days' && data.days.map((d) => (
        <div key={d.date} style={{ ...card, marginBottom: 10 }}>
          <div style={{ fontWeight: 800 }}>{dayLabel(d.date, locale, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          {d.program && <div style={{ color: 'var(--brand-ink)', fontWeight: 600, marginTop: 2 }}>{d.program.special ? '✨ ' : ''}{d.program.title}</div>}
          <div style={{ marginTop: 8 }}>
            {d.sessions.map((s) => (
              <button key={s.group} type="button" style={line} onClick={() => setEditor({ kind: 'session', date: d.date, session: s })}>
                <b style={{ fontVariantNumeric: 'tabular-nums' }}>{tashkent.time(s.start)}</b>
                <span style={{ flex: 1, minWidth: 0 }}>{s.name}</span>
                {s.state === 'canceled' ? <Badge tone="off">{t('gc_canceled')}</Badge>
                  : <Badge tone={s.taken ? 'ok' : 'off'}>{s.taken}{s.capacity != null ? ` / ${s.capacity}` : ''}</Badge>}
                {s.waiting > 0 && <Badge tone="wait">{fill(t('gc_waiting'), { n: s.waiting })}</Badge>}
                <span aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {tab === 'groups' && data.groups.map((g) => (
        <button key={g.id} type="button" style={{ ...card, ...rowBtn, marginBottom: 8 }} onClick={() => setEditor({ kind: 'group', group: g })}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontWeight: 700, fontSize: 17 }}>{g.start} · {g.name}</span>
            <span style={{ ...hint, display: 'block', marginTop: 2 }}>
              {days(g)} · {g.duration} {t('gc_min')} · {g.capacity ?? t('gc_no_limit')}{g.price ? ` · ${money(g.price)}` : ''}
            </span>
          </span>
          <span aria-hidden="true">›</span>
        </button>
      ))}
      {tab !== 'programs' && (tab === 'groups' || data.groups.length === 0) && (
        <PrimaryButton onClick={() => setEditor({ kind: 'group' })}>+ {t('gc_add_group')}</PrimaryButton>
      )}

      {tab === 'programs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={card}>
            <b>{t('gc_special')}</b>
            <div style={{ marginTop: 8 }}>
              {data.rules.map((r, i) => (
                <button key={`${r.kind}${r.weekday}`} type="button" style={line} onClick={() => setEditor({ kind: 'rule', index: i })}>
                  <span style={{ flex: 1 }}>
                    <b>{r.title}</b>
                    <span style={{ ...hint, display: 'block' }}>{t(`gc_${r.kind}`)}: {weekdayName(r.weekday, locale, 'long')}</span>
                  </span>
                  <span aria-hidden="true">›</span>
                </button>
              ))}
            </div>
            <div style={{ ...hint, margin: '4px 0 10px' }}>{t('gc_special_hint')}</div>
            <PrimaryButton variant="soft" onClick={() => setEditor({ kind: 'rule' })}>+ {t('gc_add_rule')}</PrimaryButton>
          </div>

          <div style={card}>
            <b>{t('gc_rotation')}</b>
            <div style={{ marginTop: 8 }}>
              {data.programs.map((p, i) => (
                <div key={i} style={{ ...line, cursor: 'default', padding: '6px 0' }}>
                  <button type="button" onClick={() => setEditor({ kind: 'program', index: i })} style={{ ...rowBtn, background: 'none', padding: '6px 0', flex: 1, minWidth: 0 }}>
                    <span style={{ color: 'var(--tg-theme-hint-color)', minWidth: 22 }}>{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>{p.title}</span>
                    {i === data.next_index && <Badge tone="brand">{t('gc_next')}</Badge>}
                  </button>
                  <Arrow label={t('gc_up')} disabled={busy || i === 0} onClick={() => moveProgram(i, -1)}>↑</Arrow>
                  <Arrow label={t('gc_down')} disabled={busy || i === data.programs.length - 1} onClick={() => moveProgram(i, 1)}>↓</Arrow>
                </div>
              ))}
            </div>
            <div style={{ ...hint, margin: '4px 0 10px' }}>{t('gc_rotation_hint')}</div>
            <PrimaryButton variant="soft" onClick={() => setEditor({ kind: 'program' })}>+ {t('gc_add_program')}</PrimaryButton>
            <div style={fieldLabel}>{t('gc_advance')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(['day', 'week'] as const).map((a) => (
                <Chip key={a} onCard active={data.advance === a} onClick={() => run(() => saveClassOptions({ advance: a }))}>{t(`gc_by_${a}`)}</Chip>
              ))}
            </div>
          </div>

          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <b>{t('gc_push')}</b>
              <div style={{ ...hint, marginTop: 2 }}>{fill(t('gc_push_hint'), { n: data.subscribers })}</div>
            </div>
            <Switch on={data.push_enabled} label={t('gc_push')} onChange={(v) => run(() => saveClassOptions({ push_enabled: v }))} />
          </div>
        </div>
      )}

      {editor && (
        <Sheet onClose={() => setEditor(null)}>
          {editor.kind === 'group' && (
            <GroupForm group={editor.group} busy={busy}
              onSave={async (g) => {
                const old = editor.group;
                const changed = old && (old.start !== g.start || old.weekdays.some((w) => !g.weekdays.includes(w)));
                const hasPeople = old && data.days.some((d) => d.sessions.some((s) => s.group === old.id && s.taken + s.waiting > 0));
                if (changed && hasPeople && !(await ask(t('gc_change_q')))) return;
                run(() => saveGroup(g, old?.id));
              }}
              onDelete={async () => { if (editor.group && await ask(t('gc_delete_q'))) run(() => deleteGroup(editor.group!.id)); }} />
          )}
          {editor.kind === 'program' && (
            <TitleForm initial={editor.index != null ? data.programs[editor.index] : undefined} busy={busy}
              title={t('gc_tab_programs')}
              onSave={(p) => {
                const list = [...data.programs];
                if (editor.index != null) list[editor.index] = p; else list.push(p);
                run(() => savePrograms(list, data.next_index));
              }}
              onDelete={editor.index == null ? undefined : async () => {
                if (!(await ask(t('gc_remove_q')))) return;
                const i = editor.index!;
                const list = data.programs.filter((_, j) => j !== i);
                const next = list.length ? (i < data.next_index ? data.next_index - 1 : data.next_index) % list.length : undefined;
                run(() => savePrograms(list, next));
              }}
              extra={editor.index != null && editor.index !== data.next_index
                ? <PrimaryButton variant="soft" disabled={busy} onClick={() => run(() => savePrograms(data.programs, editor.index))}>{t('gc_make_next')}</PrimaryButton>
                : null} />
          )}
          {editor.kind === 'rule' && (
            <RuleForm initial={editor.index != null ? data.rules[editor.index] : undefined} busy={busy}
              onSave={(r) => run(() => saveRules([...data.rules.filter((x, j) => j !== editor.index && !(x.kind === r.kind && x.weekday === r.weekday)), r]))}
              onDelete={editor.index == null ? undefined : async () => {
                if (await ask(t('gc_remove_q'))) run(() => saveRules(data.rules.filter((_, j) => j !== editor.index)));
              }} />
          )}
          {editor.kind === 'session' && (
            <Roster date={editor.date} session={editor.session} busy={busy}
              onCancel={async () => {
                const n = editor.session.taken + editor.session.waiting;
                if (await ask(fill(t('gc_cancel_session_q'), { n }))) run(() => setSessionCanceled(editor.session.group, editor.date, true));
              }}
              onRestore={() => run(() => setSessionCanceled(editor.session.group, editor.date, false))} />
          )}
        </Sheet>
      )}
    </div>
  );
};

const Arrow: React.FC<{ label: string; disabled: boolean; onClick: () => void; children: string }> = ({ label, disabled, onClick, children }) => (
  <button type="button" aria-label={label} disabled={disabled} onClick={onClick} style={{
    width: 34, height: 34, borderRadius: 10, border: 'none', fontSize: 16, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.35 : 1,
    backgroundColor: 'var(--tg-theme-secondary-bg-color)', color: 'var(--tg-theme-text-color)', flex: '0 0 auto',
  }}>{children}</button>
);

const Title: React.FC<{ children: React.ReactNode }> = ({ children }) => <div style={{ fontSize: 20, fontWeight: 800 }}>{children}</div>;

const num = (s: string) => s.replace(/\D/g, '');

const GroupForm: React.FC<{
  group?: ClassGroup; busy: boolean; onSave: (g: Omit<ClassGroup, 'id'>) => void; onDelete: () => void;
}> = ({ group, busy, onSave, onDelete }) => {
  const { t, lang } = useLanguage();
  const locale = localeFor(lang);
  const [name, setName] = useState(group?.name ?? '');
  const [weekdays, setWeekdays] = useState<number[]>(group?.weekdays ?? []);
  const [start, setStart] = useState(group?.start ?? '18:30');
  const [duration, setDuration] = useState(String(group?.duration ?? 60));
  const [address, setAddress] = useState(group?.address ?? '');
  const [price, setPrice] = useState(group?.price != null ? String(group.price) : '');
  const [limited, setLimited] = useState(group?.capacity != null);
  const [capacity, setCapacity] = useState(String(group?.capacity ?? 12));
  const [cutoff, setCutoff] = useState(String(group?.cutoff_minutes ?? 60));
  const ready = !!name.trim() && weekdays.length > 0 && !!start && Number(duration) >= 10 && cutoff !== '' && (!limited || Number(capacity) > 0);

  return (
    <div>
      <Title>{t(group ? 'gc_edit_group' : 'gc_add_group')}</Title>
      <div style={fieldLabel}>{t('gc_name')}</div>
      <input style={inputStyle} aria-label={t('gc_name')} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
      <div style={fieldLabel}>{t('gc_days')}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {WEEK.map((w) => (
          <Chip key={w} onCard active={weekdays.includes(w)}
            onClick={() => setWeekdays((v) => (v.includes(w) ? v.filter((x) => x !== w) : [...v, w].sort()))}>{weekdayName(w, locale)}</Chip>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={fieldLabel}>{t('gc_start')}</div>
          <input style={inputStyle} type="time" aria-label={t('gc_start')} value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={fieldLabel}>{t('gc_duration')}</div>
          <input style={inputStyle} inputMode="numeric" aria-label={t('gc_duration')} value={duration} onChange={(e) => setDuration(num(e.target.value))} />
        </div>
      </div>
      <div style={fieldLabel}>{t('gc_address')}</div>
      <input style={inputStyle} aria-label={t('gc_address')} value={address} maxLength={255} onChange={(e) => setAddress(e.target.value)} />
      <div style={fieldLabel}>{t('gc_price')}</div>
      <input style={inputStyle} inputMode="numeric" aria-label={t('gc_price')} value={price} onChange={(e) => setPrice(num(e.target.value))} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <div style={{ flex: 1 }}>
          <b>{t('gc_limit')}</b>
          <div style={hint}>{t(limited ? 'gc_limit_on' : 'gc_limit_off')}</div>
        </div>
        <Switch on={limited} label={t('gc_limit')} onChange={setLimited} />
      </div>
      {limited && (
        <>
          <div style={fieldLabel}>{t('gc_places')}</div>
          <input style={inputStyle} inputMode="numeric" aria-label={t('gc_places')} value={capacity} onChange={(e) => setCapacity(num(e.target.value))} />
        </>
      )}
      <div style={fieldLabel}>{t('gc_cut')}</div>
      <input style={inputStyle} inputMode="numeric" aria-label={t('gc_cut')} value={cutoff} onChange={(e) => setCutoff(num(e.target.value))} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
        <PrimaryButton disabled={!ready} loading={busy} onClick={() => onSave({
          name: name.trim(), weekdays, start, duration: Number(duration), address: address.trim(),
          price: price ? Number(price) : null, capacity: limited ? Number(capacity) : null, cutoff_minutes: Number(cutoff),
        })}>{t('gc_save')}</PrimaryButton>
        {group && <PrimaryButton variant="danger" disabled={busy} onClick={onDelete}>{t('gc_delete')}</PrimaryButton>}
      </div>
    </div>
  );
};

const TitleForm: React.FC<{
  title: string; initial?: ClassProgram; busy: boolean; onSave: (p: ClassProgram) => void; onDelete?: () => void;
  extra?: React.ReactNode; children?: React.ReactNode;
}> = ({ title, initial, busy, onSave, onDelete, extra, children }) => {
  const { t } = useLanguage();
  const [name, setName] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  return (
    <div>
      <Title>{title}</Title>
      {children}
      <div style={fieldLabel}>{t('gc_name')}</div>
      <input style={inputStyle} aria-label={t('gc_name')} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
      <div style={fieldLabel}>{t('gc_description')}</div>
      <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} aria-label={t('gc_description')} maxLength={2000}
        value={description} onChange={(e) => setDescription(e.target.value)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
        <PrimaryButton disabled={!name.trim()} loading={busy} onClick={() => onSave({ title: name.trim(), description: description.trim() })}>{t('gc_save')}</PrimaryButton>
        {extra}
        {onDelete && <PrimaryButton variant="danger" disabled={busy} onClick={onDelete}>{t('gc_remove')}</PrimaryButton>}
      </div>
    </div>
  );
};

const RuleForm: React.FC<{ initial?: ClassRule; busy: boolean; onSave: (r: ClassRule) => void; onDelete?: () => void }> = ({ initial, busy, onSave, onDelete }) => {
  const { t, lang } = useLanguage();
  const [kind, setKind] = useState<ClassRule['kind']>(initial?.kind ?? 'weekly');
  const [weekday, setWeekday] = useState(initial?.weekday ?? 4);
  return (
    <TitleForm title={t('gc_special')} initial={initial} busy={busy} onDelete={onDelete} onSave={(p) => onSave({ ...p, kind, weekday })}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {(['weekly', 'last'] as const).map((k) => <Chip key={k} onCard active={kind === k} onClick={() => setKind(k)}>{t(`gc_${k}`)}</Chip>)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {WEEK.map((w) => <Chip key={w} onCard active={weekday === w} onClick={() => setWeekday(w)}>{weekdayName(w, localeFor(lang))}</Chip>)}
      </div>
    </TitleForm>
  );
};

export const Roster: React.FC<{ date: string; session: ClassSession; busy: boolean; onCancel: () => void; onRestore: () => void }> = ({ date, session, busy, onCancel, onRestore }) => {
  const { t, lang } = useLanguage();
  const [rows, setRows] = useState<RosterRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { fetchRoster(session.group, date).then(setRows).catch(() => setFailed(true)); }, [session.group, date]);
  const past = new Date(session.start).getTime() < Date.now();
  return (
    <div>
      <Title>{dayLabel(date, localeFor(lang), { weekday: 'short', day: 'numeric', month: 'short' })}, {tashkent.time(session.start)}</Title>
      <div style={hint}>{session.name} · {fill(t('gc_signed'), { n: session.taken })}</div>
      <div style={{ margin: '12px 0 18px' }}>
        {failed ? t('gc_err') : !rows ? <Spinner size="m" /> : rows.length === 0 ? <div style={hint}>{t('gc_roster_empty')}</div> : rows.map((r) => (
          <div key={r.id} style={{ ...line, cursor: 'default' }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b>{r.name || t('gc_student')}</b>
              <span style={{ ...hint, display: 'block' }}>{[r.phone && formatPhone(r.phone), r.username && `@${r.username}`].filter(Boolean).join(' · ')}</span>
            </span>
            {r.status === 'waiting' && <Badge tone="wait">⏳</Badge>}
          </div>
        ))}
      </div>
      {!past && (session.state === 'canceled' ? (
        <>
          <PrimaryButton variant="soft" loading={busy} onClick={onRestore}>{t('gc_restore')}</PrimaryButton>
          <div style={{ ...hint, marginTop: 8 }}>{t('gc_restore_hint')}</div>
        </>
      ) : <PrimaryButton variant="danger" loading={busy} onClick={onCancel}>{t('gc_cancel_session')}</PrimaryButton>)}
    </div>
  );
};
