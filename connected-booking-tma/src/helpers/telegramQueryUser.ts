// src/helpers/telegramQueryUser.ts
export type QueryUser = {
  id: number;
  username?: string;
};

export function getUserFromQuery(): QueryUser | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get('uid');
    if (!uid) return null;

    const id = Number(uid);
    if (!Number.isFinite(id)) return null;

    const username = params.get('uname') || undefined;
    return { id, username };
  } catch {
    return null;
  }
}

export function getStartParam(): string | null {
  const tg = (window as any).Telegram?.WebApp;

  if (tg?.initDataUnsafe?.start_param) {
    return tg.initDataUnsafe.start_param;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get('tgWebAppStartParam') || params.get('start_param');
}