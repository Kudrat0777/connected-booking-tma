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
  time: string; // ISO-строка
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
  // по умолчанию бэкенд отфильтрует прошедшие слоты

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch slots: ${res.status}`);
  }
  const data = await res.json();
  // API /for_service возвращает массив SlotSerializer, без обёртки
  return data as Slot[];
}