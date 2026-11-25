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
