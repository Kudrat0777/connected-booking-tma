
export type TelegramUser = {
  id: number;
  username?: string;
  photo_url?: string;
  first_name?: string;
  last_name?: string;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: {
          user?: any;
        };
      };
    };
  }
}

// 1) Пробуем WebApp.initDataUnsafe.user
export function getUserFromInitDataUnsafe(): TelegramUser | null {
  try {
    const raw = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!raw) return null;
    return {
      id: raw.id,
      username: raw.username,
      photo_url: raw.photo_url,
      first_name: raw.first_name,
      last_name: raw.last_name,
    };
  } catch {
    return null;
  }
}

// 2) Фолбек: парсим строку initData (как в master.js)
export function getUserFromRawInitData(): TelegramUser | null {
  try {
    const raw = window.Telegram?.WebApp?.initData || '';
    if (!raw) return null;
    const m = raw.match(/user=([^&]+)/);
    if (!m) return null;
    const userObj = JSON.parse(decodeURIComponent(m[1]));
    if (!userObj?.id) return null;
    return {
      id: userObj.id,
      username: userObj.username,
      photo_url: userObj.photo_url,
      first_name: userObj.first_name,
      last_name: userObj.last_name,
    };
  } catch {
    return null;
  }
}

// 3) Фолбек: query-параметры ?uid=...&uname=...
export function getUserFromQuery(): TelegramUser | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get('uid') || params.get('tid');
    if (!uid) return null;
    const id = Number(uid);
    if (!Number.isFinite(id)) return null;
    const username = params.get('uname') || undefined;
    return { id, username };
  } catch {
    return null;
  }
}

// 4) Общая функция: комбинируем все источники
export function resolveTelegramUser(): TelegramUser | null {
  return (
    getUserFromInitDataUnsafe() ||
    getUserFromRawInitData() ||
    getUserFromQuery() ||
    null
  );
}