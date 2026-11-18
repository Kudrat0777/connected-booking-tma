// Таргет-ссылки и разбор start-параметра.
//
// Ссылка клиента:  https://t.me/<клиентский бот>?start=b_<slug заведения>__<источник>
//                  https://t.me/<клиентский бот>?start=m_<slug мастера>__<источник>
// Приглашение:     https://t.me/<бот мастеров>?start=join_<код>
// Бот передаёт параметр в Mini App как ?sp=..., фронт читает его через getStartParam().

export const CLIENT_BOT_USERNAME = import.meta.env.VITE_CLIENT_BOT_USERNAME || 'ConnectedTimeBot';
export const MASTER_BOT_USERNAME = import.meta.env.VITE_MASTER_BOT_USERNAME || 'ConnectedTimeMasterBot';

export type LinkSource = { id: string; label: string; emoji: string };

// Метки источника: по ним в аналитике видно, откуда пришли клиенты.
export const LINK_SOURCES: LinkSource[] = [
  { id: '', label: 'Без метки', emoji: '🔗' },
  { id: 'ig', label: 'Instagram', emoji: '📸' },
  { id: 'tg', label: 'Telegram-канал', emoji: '✈️' },
  { id: 'tt', label: 'TikTok', emoji: '🎵' },
  { id: 'qr', label: 'QR в салоне', emoji: '🔳' },
  { id: 'gm', label: 'Карты', emoji: '📍' },
];

export function sourceLabel(id: string): string {
  if (!id || id === 'direct') return 'Напрямую / без метки';
  if (id === 'manual') return 'Записал мастер';
  return LINK_SOURCES.find((s) => s.id === id)?.label ?? id;
}

export function clientLink(kind: 'b' | 'm', slug: string, source = ''): string {
  const start = source ? `${kind}_${slug}__${source}` : `${kind}_${slug}`;
  return `https://t.me/${CLIENT_BOT_USERNAME}?start=${start}`;
}

export function inviteLink(code: string): string {
  return `https://t.me/${MASTER_BOT_USERNAME}?start=join_${code}`;
}

export type StartTarget =
  | { kind: 'business'; slug: string; source: string }
  | { kind: 'master'; slug: string; source: string }
  | { kind: 'legacy_master'; id: number }
  | { kind: 'join'; code: string }
  | null;

export function parseStartParam(raw: string | null | undefined): StartTarget {
  if (!raw) return null;
  if (raw.startsWith('master_')) {
    const id = parseInt(raw.slice('master_'.length), 10);
    return Number.isFinite(id) ? { kind: 'legacy_master', id } : null;
  }
  if (raw.startsWith('join_')) {
    const code = raw.slice('join_'.length);
    return code ? { kind: 'join', code } : null;
  }
  const m = raw.match(/^([bm])_([A-Za-z0-9-]+)(?:__([a-z0-9_]{1,32}))?$/);
  if (!m) return null;
  return { kind: m[1] === 'b' ? 'business' : 'master', slug: m[2], source: m[3] || '' };
}

// Источник запоминаем на время сессии, чтобы приписать его к записи клиента.
const SOURCE_KEY = 'ctime_source';

export function rememberSource(source: string) {
  try { sessionStorage.setItem(SOURCE_KEY, source); } catch { /* приватный режим */ }
}

export function currentSource(): string {
  try { return sessionStorage.getItem(SOURCE_KEY) || ''; } catch { return ''; }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* упадём в запасной вариант */ }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  document.body.removeChild(ta);
  return ok;
}

export function shareToTelegram(url: string, text: string) {
  const full = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.openTelegramLink) tg.openTelegramLink(full);
  else window.open(full, '_blank');
}
