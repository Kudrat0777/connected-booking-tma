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