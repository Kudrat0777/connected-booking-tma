// src/helpers/api.ts

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export type Service = {
  id: number;
  name: string;
  master: number;
  price: number | null;
  duration: number | null;
  description: string;
  master_name: string;
  masterId?: number;
  master_name?: string;
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
  slot: Slot;
  created_at: string;
  telegram_id: number | null;
  username: string | null;
  photo_url: string | null;
  status: 'pending' | 'confirmed' | 'rejected';
  master_name: string | null;
  service_name: string | null;
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