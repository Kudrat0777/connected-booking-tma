const API_BASE = 'https://rsod7mx79rps.share.zrok.io/api';

import { useState, useEffect } from 'react';

export type Service = {
  id: number;
  name: string;
  master: number;
  price: number | null;
  duration: number | null;
  description: string;
  master_name: string;
};

export async function fetchServices(masterId?: number): Promise<Service[]> {
  const url = new URL(`${API_BASE}/services/`, window.location.origin);

  if (masterId) {
    url.searchParams.set('master', String(masterId));
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch services: ${res.status}`);
  }
  return res.json();
}

// --------- СЛОТЫ ---------

export type Slot = {
  id: number;
  time: string; // ISO
  is_booked: boolean;
  service: {
    id: number;
    name: string;
    price: number | null;
    duration: number | null;
    description: string;
    master: number;
    master_name: string;
  };
};

export async function fetchSlotsForService(serviceId: number): Promise<Slot[]> {
  const url = new URL(`${API_BASE}/slots/for_service/`, window.location.origin);
  url.searchParams.set('service', String(serviceId));

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch slots: ${res.status}`);
  }
  const data = await res.json();
  return data as Slot[];
}

// --------- БРОНИ ---------

export type Booking = {
  id: number;
  name: string;
  client_name?: string | null;
  slot: Slot;
  created_at: string;
  telegram_id: number | null;
  username: string | null;
  photo_url: string | null;
  status: 'pending' | 'confirmed' | 'rejected';
  master_name: string | null;
  service_name: string | null;
  client_phone?: string;
};

export type CreateBookingPayload = {
  name: string;
  slot_id: number;
  telegram_id?: number | null;
  username?: string | null;
  photo_url?: string | null;
};

export async function createBooking(
  payload: CreateBookingPayload,
): Promise<Booking> {
  const res = await fetch(`${API_BASE}/bookings/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: payload.name,
      slot_id: payload.slot_id,
      telegram_id: payload.telegram_id ?? null,
      username: payload.username ?? null,
      photo_url: payload.photo_url ?? null,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Failed to create booking: ${res.status} ${res.statusText} ${text}`,
    );
  }

  return res.json();
}

// список броней для клиента
export async function fetchMyBookings(
  telegramId: number,
): Promise<Booking[]> {
  const url = new URL(`${API_BASE}/bookings/`, window.location.origin);
  url.searchParams.set('telegram_id', String(telegramId));

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch bookings: ${res.status}`);
  }
  return res.json();
}


export async function cancelBooking(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/bookings/${id}/`, {
    method: 'DELETE',
  });

  if (!res.ok && res.status !== 204) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Failed to cancel booking: ${res.status} ${res.statusText} ${text}`,
    );
  }
}

// --------- MASTER API ---------

// // Регистрация мастера
// export async function registerMaster(name: string, telegram_id: number) {
//   const res = await fetch(`${API_BASE}/masters/register/`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ name, telegram_id }),
//   });
//   if (!res.ok) throw new Error('Failed to register master');
//   return res.json();
// }

// Авторизация мастера по телефону и паролю
export async function loginMasterWithPhone(phone: string, password: string, telegram_id: number) {
  const res = await fetch(`${API_BASE}/masters/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password, telegram_id }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Ошибка авторизации. Проверьте данные.');
  }

  return res.json();
}

// Создание услуги мастером
export async function createServiceByMaster(
  telegram_id: number,
  name: string,
  price: number,
  duration: number,
  description?: string
) {
  const res = await fetch(`${API_BASE}/services/create_by_master/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegram_id, name, price, duration, description }),
  });
  if (!res.ok) throw new Error('Failed to create service');
  return res.json();
}

// Получить список записей для мастера
export async function fetchMasterBookings(telegram_id: number, period?: 'today' | 'tomorrow' | 'week', status?: string) {
  const params = new URLSearchParams({ telegram_id: String(telegram_id) });
  if (period) params.append('period', period);
  if (status) params.append('status', status);

  const res = await fetch(`${API_BASE}/bookings/for_master/?${params}`);
  if (!res.ok) throw new Error('Failed to fetch master bookings');
  return res.json(); // returns { items: Booking[], summary: {...} }
}

export async function confirmBooking(bookingId: number) {
  const res = await fetch(`${API_BASE}/bookings/${bookingId}/confirm/`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to confirm booking');
  return res.json();
}

// Отклонить бронь
export async function rejectBooking(bookingId: number) {
  const res = await fetch(`${API_BASE}/bookings/${bookingId}/reject/`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reject booking');
  return res.json();
}

export async function fetchMyServices(telegram_id: number) {
  const res = await fetch(`${API_BASE}/services/my/?telegram_id=${telegram_id}`);
  if (!res.ok) throw new Error('Failed to fetch services');
  return res.json(); // returns Service[]
}

export async function bulkGenerateSlots(
  serviceId: number,
  startDate: string, // YYYY-MM-DD
  endDate: string,   // YYYY-MM-DD
  times: string[],   // ["09:00", "10:00", ...]
  weekdays: number[] // [0, 1, 2, 3, 4] (Пн-Пт)
) {
  const res = await fetch(`${API_BASE}/slots/bulk_generate/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service: serviceId,
      start_date: startDate,
      end_date: endDate,
      times: times,
      weekdays: weekdays
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to generate slots: ${text}`);
  }
  return res.json();
}


export type MasterPublicProfile = {
  id: number;
  name: string;
  bio: string;
  avatar_url: string;
  rating: number;
  reviews_count: number;
  city?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
};

export async function fetchMasters(params?: {
  search?: string;
  city?: string;
  specialization?: string;
  ordering?: string;
}): Promise<MasterPublicProfile[]> {
  const url = new URL(`${API_BASE}/masters/`, window.location.origin);

  if (params) {
    if (params.search) url.searchParams.append('search', params.search);
    if (params.city) url.searchParams.append('city', params.city);
    if (params.specialization) url.searchParams.append('specialization', params.specialization);
    if (params.ordering) url.searchParams.append('ordering', params.ordering);
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch masters');
  return res.json();
}

export async function fetchMasterById(id: number): Promise<MasterPublicProfile> {
  const res = await fetch(`${API_BASE}/masters/${id}/`);
  if (!res.ok) throw new Error('Master not found');
  return res.json();
}

export async function updateMasterProfile(telegramId: number, data: { name?: string; bio?: string; phone?: string }) {
  const res = await fetch(`${API_BASE}/masters/me_update/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegram_id: telegramId, ...data }),
  });
  if (!res.ok) throw new Error('Failed to update profile');
  return res.json();
}

// Загрузка аватарки
export async function uploadMasterAvatar(telegramId: number, file: File) {
  const formData = new FormData();
  formData.append('telegram_id', String(telegramId));
  formData.append('avatar', file);

  const res = await fetch(`${API_BASE}/masters/upload_avatar/`, {
    method: 'POST',
    body: formData, // Content-Type не нужен, браузер сам поставит multipart/form-data
  });
  if (!res.ok) throw new Error('Failed to upload avatar');
  return res.json(); // { avatar_url: "..." }
}


export type AnalyticsData = {
  revenue_today: number;
  revenue_week: number;
  revenue_month: number;
  total_bookings: number;
  unique_clients: number;
  top_services: { slot__service__name: string; count: number; revenue: number }[];
};

export async function fetchMasterAnalytics(telegramId: number): Promise<AnalyticsData> {
  const res = await fetch(`${API_BASE}/masters/analytics/?telegram_id=${telegramId}`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

// --- REVIEWS ---

export type Review = {
  id: number;
  author_name: string;
  rating: number;
  text: string;
  created_at: string;
};

export async function addReview(data: {
  master_id: number;
  telegram_id: number;
  rating: number;
  text?: string;
  author_name?: string;
}) {
  const res = await fetch(`${API_BASE}/reviews/add/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      master: data.master_id,
      telegram_id: data.telegram_id,
      rating: data.rating,
      text: data.text,
      author_name: data.author_name
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    // Если ошибка 429 (слишком часто) или 403 (нет записи)
    if (res.status === 429) throw new Error('Вы уже оставили отзыв этому мастеру недавно.');
    if (res.status === 403) throw new Error('Оставить отзыв можно только после визита.');
    throw new Error(`Failed to add review: ${txt}`);
  }
  return res.json();
}

export async function fetchReviews(masterId: number): Promise<Review[]> {
  const res = await fetch(`${API_BASE}/reviews/?master=${masterId}&limit=20`);
  if (!res.ok) throw new Error('Failed to fetch reviews');
  return res.json();
}

export async function fetchMasterReviews(telegramId: number): Promise<Review[]> {
  const res = await fetch(`${API_BASE}/reviews/?master_telegram_id=${telegramId}`);
  if (!res.ok) throw new Error('Failed to fetch reviews');
  return res.json();
}

export async function deleteService(serviceId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/services/${serviceId}/`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 204) {
    throw new Error('Failed to delete service');
  }
}

export type PortfolioItem = {
  id: number;
  image_url: string;
};

export async function fetchPortfolio(masterId?: number, telegramId?: number): Promise<PortfolioItem[]> {
  let url = `${API_BASE}/portfolio/?`;
  if (masterId) url += `master_id=${masterId}`;
  else if (telegramId) url += `telegram_id=${telegramId}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load portfolio');
  return res.json();
}


export async function uploadPortfolioPhoto(telegramId: number, file: File) {
  const formData = new FormData();
  formData.append('telegram_id', String(telegramId));
  formData.append('image', file);

  const res = await fetch(`${API_BASE}/portfolio/`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error('Failed to upload photo');
  return res.json();
}

export async function deletePortfolioPhoto(photoId: number) {
  const res = await fetch(`${API_BASE}/portfolio/${photoId}/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete photo');
}


export async function fetchMasterSlots(telegramId: number, date: string): Promise<Slot[]> {
  return [];
}

export async function createManualBooking(slotId: number, clientName: string, phone: string) {
  const res = await fetch(`${API_BASE}/bookings/manual_create/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot_id: slotId, client_name: clientName, phone: phone }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create manual booking');
  }

  // Возвращает объект Booking + поле is_new_client
  return res.json();
}

export async function deleteSlot(slotId: number) {
  const res = await fetch(`${API_BASE}/slots/${slotId}/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete slot');
}

export const fetchUserProfile = async (telegramId: number) => {
    const response = await fetch(`${API_BASE}/users/${telegramId}/`);
    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
};

export const updateUserProfile = async (telegramId: number, data: { first_name?: string; last_name?: string; phone?: string }) => {
    const response = await fetch(`${API_BASE}/users/${telegramId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update profile');
    return response.json();
};

export const deleteAccount = async (telegramId: number) => {
  try {
    const response = await fetch(`${API_BASE}/users/${telegramId}/`, {
      method: 'DELETE',
    });
    if (response.status === 204 || response.status === 404) {
      return true;
    }
    throw new Error('Failed to delete account');
  } catch (e) {
    console.error('Delete account error:', e);
    throw e;
  }
};

export async function registerClient(data: {
  telegram_id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  phone?: string;
}) {
  const res = await fetch(`${API_BASE}/users/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to register client');
  return res.json();
}

export async function checkClientProfile(telegramId: number) {
  try {
    // Используем эндпоинт /me/ который уже отлично работает для мастеров и клиентов
    const res = await fetch(`${API_BASE}/users/me/?telegram_id=${telegramId}`);

    if (res.ok) {
      return await res.json(); // Профиль найден
    }

    return null; // Если 404 или любая другая ошибка - профиля нет
  } catch (e) {
    console.error('Check profile error:', e);
    return null; // В случае сбоя сети тоже считаем, что профиля нет (отправим на регистрацию)
  }
}

export const getFullImageUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined;

  const origin = new URL(API_BASE).origin; // Получаем https://...zrok.io

  // Очищаем путь от любых локальных доменов, если они застряли в базе
  let cleanPath = path;
  if (path.includes('127.0.0.1') || path.includes('localhost') || path.includes('0.0.0.0')) {
    cleanPath = path.replace(/http:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0):\d+/g, '');
  }

  // Если это внешняя ссылка (например, Telegram аватарка)
  if (cleanPath.startsWith('http')) return cleanPath;

  // Если это наша картинка из /media/, добавляем слэш, если нужно
  cleanPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;

  // === ХАК ДЛЯ ZROK ===
  // Добавляем случайный параметр (timestamp) в конец ссылки.
  // Это заставляет браузер и туннель скачивать картинку заново, обходя кэш и блокировки.
  return `${origin}${cleanPath}?t=${new Date().getTime()}`;
};


export const useTunnelImage = (src?: string | null) => {
  const [blobUrl, setBlobUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isMounted = true; // Защита от утечек памяти

    const load = async () => {
      const fullUrl = getFullImageUrl(src);
      if (!fullUrl) {
        if (isMounted) setBlobUrl(undefined);
        return;
      }

      try {
        const res = await fetch(fullUrl);
        if (!res.ok) throw new Error('Bad response');

        const blob = await res.blob();
        if (isMounted) {
            setBlobUrl(URL.createObjectURL(blob));
        }
      } catch (e) {
        console.error("Image load failed:", e);
        // Если fetch не сработал (например, сломался zrok),
        // вставляем хотя бы обычную ссылку, чтобы картинка попыталась загрузиться
        if (isMounted) {
            setBlobUrl(fullUrl);
        }
      }
    };

    load();

    return () => {
        isMounted = false; // Очистка при удалении компонента
    };
  }, [src]); // <- Теперь он сработает строго 1 раз на каждую картинку!

  return blobUrl;
};
