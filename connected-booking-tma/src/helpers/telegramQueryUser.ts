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