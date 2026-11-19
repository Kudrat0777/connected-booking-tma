import { fetchUserProfile } from './api';

// Телефоны: по умолчанию узбекский формат +998 XX XXX XX XX, но иностранный номер (+7, +1…) тоже можно ввести.

const UZ = '998';

/** Форматирует номер по мере ввода. Цифры без «+» считаются местным номером Узбекистана. */
export function formatPhone(raw: string): string {
  const trimmed = (raw || '').trim();
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed.startsWith('+') ? '+' : '';

  if (!trimmed.startsWith('+') && !digits.startsWith(UZ)) {
    // «90 123 45 67» → +998 90 123 45 67
    digits = UZ + digits;
  }

  if (digits.startsWith(UZ)) {
    const d = digits.slice(0, 12);
    const parts = [d.slice(0, 3), d.slice(3, 5), d.slice(5, 8), d.slice(8, 10), d.slice(10, 12)].filter(Boolean);
    return '+' + parts.join(' ');
  }
  return '+' + digits.slice(0, 15);
}

/** Для сохранения: только «+» и цифры. */
export function normalizePhone(raw: string): string {
  const d = formatPhone(raw).replace(/\D/g, '');
  return d ? '+' + d : '';
}

/** Полный узбекский номер — 12 цифр с кодом, иностранный — от 10 до 15. */
export function isValidPhone(raw: string): boolean {
  const digits = normalizePhone(raw).slice(1);
  if (digits.startsWith(UZ)) return digits.length === 12;
  return digits.length >= 10 && digits.length <= 15;
}

export const PHONE_PLACEHOLDER = '+998 90 123 45 67';

/** Номер из Telegram (кнопка «Поделиться контактом»). Возвращает отформатированный номер или null.
 *
 * Telegram отдаёт номер приложению отдельным запросом с тайм-аутом, и на медленной связи он может не дойти.
 * Но контакт всегда приходит и в чат с ботом — бот сохраняет его в профиль (booking/contacts.py).
 * Поэтому, если номер не пришёл напрямую, пару секунд ждём его в профиле клиента.
 */
export async function requestTelegramPhone(telegramId?: number): Promise<string | null> {
  const tg = (window as any).Telegram?.WebApp;
  if (!tg?.requestContact) return null;
  const direct = await new Promise<{ shared: boolean; phone: string | null }>((resolve) => {
    try {
      tg.requestContact((ok: boolean, result: any) => {
        // Номер — в responseUnsafe.contact; в response — та же информация строкой «contact=%7B...%7D&...»
        let p = result?.responseUnsafe?.contact?.phone_number || result?.contact?.phone_number;
        if (!p && typeof result?.response === 'string') {
          try { p = JSON.parse(new URLSearchParams(result.response).get('contact') || '{}').phone_number; } catch { /* нет номера */ }
        }
        resolve({ shared: !!ok, phone: p ? formatPhone(String(p).startsWith('+') ? p : '+' + p) : null });
      });
    } catch {
      resolve({ shared: false, phone: null }); // старая версия Telegram или запрос уже открыт
    }
  });
  if (direct.phone || !direct.shared || !telegramId) return direct.phone;

  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 800));
    const profile = await fetchUserProfile(telegramId).catch(() => null);
    if (profile?.phone) return formatPhone(profile.phone);
  }
  return null;
}
