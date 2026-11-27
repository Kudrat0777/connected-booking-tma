// Групповые занятия: расписание и запись ученика, кабинет инструктора.
import { currentSource } from './links';

const API = import.meta.env.VITE_API_BASE || '/api';

export type ClassSession = {
  group: number; name: string; start: string; duration: number; address: string; price: number | null;
  capacity: number | null; taken: number; waiting: number; cutoff_minutes: number;
  state: 'open' | 'closed' | 'full' | 'canceled'; my: 'active' | 'waiting' | null;
};
export type ClassDay = {
  date: string; sessions: ClassSession[];
  program: { title: string; description: string; special: boolean; rule: boolean } | null;
};
export type ClassSchedule = { subscribed: boolean; days: ClassDay[] };
export type MyClass = {
  group: number; group_name: string; date: string; start: string; status: 'active' | 'waiting';
  master: number; master_name: string; avatar_url: string; address: string; program: string;
};
export type ClassGroup = {
  id: number; name: string; weekdays: number[]; start: string; duration: number; address: string;
  price: number | null; capacity: number | null; cutoff_minutes: number;
};
export type ClassProgram = { title: string; description: string };
export type ClassRule = { kind: 'weekly' | 'last'; weekday: number; title: string; description: string };
export type ClassManage = {
  groups: ClassGroup[]; programs: ClassProgram[]; rules: ClassRule[]; advance: 'day' | 'week';
  push_enabled: boolean; notify_signups: boolean; next_index: number; subscribers: number; days: ClassDay[];
};
export type RosterRow = { id: number; name: string; status: 'active' | 'waiting'; username: string; phone: string };

async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`${API}/${path}`, {
    method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || '');
  return data;
}

export const fetchClassSchedule = (master: number, days = 31) => call<ClassSchedule>(`classes/schedule/?master=${master}&days=${days}`);
export const fetchMyClasses = () => call<MyClass[]>('classes/my/');
export const fetchClassHistory = () => call<MyClass[]>('classes/history/');
export const classSignup = (group: number, date: string) =>
  call<{ status: 'active' | 'waiting' }>('classes/signup/', 'POST', { group, date, source: currentSource() });
export const classLeave = (group: number, date: string) => call('classes/leave/', 'POST', { group, date });
export const classMove = (group: number, date: string, to_group: number) => call('classes/move/', 'POST', { group, date, to_group });
export const classSubscribe = (master: number, on: boolean) => call<{ subscribed: boolean }>('classes/subscribe/', 'POST', { master, on });

export const fetchClassManage = () => call<ClassManage>('class-manage/');
export const saveGroup = (g: Omit<ClassGroup, 'id'>, id?: number) =>
  id ? call<ClassManage>(`class-manage/${id}/`, 'PATCH', g) : call<ClassManage>('class-manage/', 'POST', g);
export const deleteGroup = (id: number) => call<ClassManage>(`class-manage/${id}/`, 'DELETE');
export const savePrograms = (programs: ClassProgram[], next_index?: number) =>
  call<ClassManage>('class-manage/programs/', 'PUT', { programs, next_index });
export const saveRules = (rules: ClassRule[]) => call<ClassManage>('class-manage/rules/', 'PUT', { rules });
export const saveClassOptions = (o: { advance?: 'day' | 'week'; push_enabled?: boolean; notify_signups?: boolean }) =>
  call<ClassManage>('class-manage/options/', 'POST', o);
export const fetchRoster = (group: number, date: string) => call<RosterRow[]>(`class-manage/${group}/roster/?date=${date}`);
export const setSessionCanceled = (group: number, date: string, canceled: boolean) =>
  call<ClassManage>(`class-manage/${group}/${canceled ? 'cancel' : 'restore'}_session/`, 'POST', { date });

/** Бот может писать только тем, кто разрешил: спрашиваем при подписке и записи. */
export function askWriteAccess(): Promise<boolean> {
  const tg = (window as any).Telegram?.WebApp;
  return new Promise((resolve) => {
    if (!tg?.requestWriteAccess || tg.initDataUnsafe?.user?.allows_write_to_pm) { resolve(true); return; }
    try { tg.requestWriteAccess((ok: boolean) => resolve(!!ok)); } catch { resolve(true); }
  });
}

/** Даты расписания — календарные дни, без часового пояса телефона. */
export const dayLabel = (date: string, locale: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString(locale, { ...opts, timeZone: 'UTC' });
/** 0 — понедельник (2024-01-01 — понедельник). */
export const weekdayName = (w: number, locale: string, weekday: 'short' | 'long' = 'short') =>
  dayLabel(`2024-01-0${w + 1}`, locale, { weekday });

export type ClassAnalytics = {
  period: 'week' | 'month' | 'half'; from: string; to: string;
  signups: number; prev_signups: number; students: number; newcomers: number;
  fill: number | null; held: number; canceled: number; dropped: number;
  bars: { start: string; end: string; count: number }[];
  groups: { id: number; name: string; start: string; capacity: number | null; sessions: number; avg: number; fill: number | null }[];
  programs: { title: string; avg: number; sessions: number }[];
  lost: { telegram_id: number; name: string; username: string; last: string }[];
  sources: { source: string; count: number }[];
  subscribers: number;
};
export const fetchClassAnalytics = (period: ClassAnalytics['period']) => call<ClassAnalytics>(`class-manage/analytics/?period=${period}`);

export type StudentTag = '' | 'new' | 'lost';
export type ClassStudent = {
  telegram_id: number; name: string; username: string; phone: string;
  total: number; since: string | null; last: string | null;
  next: { date: string; start: string; group: string; status: 'active' | 'waiting' } | null;
  groups: string[]; canceled: number; tag: StudentTag; note: string; subscribed: boolean;
};
export type ClassStudentCard = Omit<ClassStudent, 'last' | 'groups' | 'next'> & {
  this_month: number; prev_month: number;
  last: { date: string; group: string; program: string } | null;
  next: (ClassStudent['next'] & { program: string }) | null;
  groups: { name: string; start: string; count: number }[];
  history: { date: string; group: string; program: string; status: 'booked' | 'done' | 'canceled' | 'waiting' }[];
};
export const fetchClassStudents = (q = '', kind: 'all' | 'active' | 'new' | 'lost' = 'all') =>
  call<ClassStudent[]>(`class-manage/students/?q=${encodeURIComponent(q)}&kind=${kind}`);
export const fetchClassStudent = (tid: number) => call<ClassStudentCard>(`class-manage/students/${tid}/`);
export const saveClassStudentNote = (tid: number, text: string) =>
  call<{ note: string }>(`class-manage/students/${tid}/`, 'PUT', { text });

export type ClassPause = {
  id: number; start_date: string; end_date: string; note: string; message: string;
  groups: { id: number; name: string }[];
};
export type PauseInput = { start_date: string; end_date: string; groups: number[]; note?: string; message?: string };
export const fetchPauses = () => call<ClassPause[]>('class-manage/pauses/');
export const previewPause = (p: PauseInput) => call<{ affected: number }>('class-manage/pauses/', 'POST', { ...p, dry_run: true });
export const createPause = (p: PauseInput) => call<ClassPause & { affected: number }>('class-manage/pauses/', 'POST', p);
export const deletePause = (id: number) => call<null>(`class-manage/pauses/${id}/`, 'DELETE');
