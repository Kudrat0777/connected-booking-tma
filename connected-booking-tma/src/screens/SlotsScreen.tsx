import React, { useEffect, useState } from 'react';
import type { Service, Slot } from '../helpers/api';
import { fetchSlotsForService } from '../helpers/api';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import { ListItem } from '../components/ListItem';

type Props = {
  service: Service;
  onBack: () => void;
  onSlotSelected: (slot: Slot) => void;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  });
  const time = d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${day} • ${time}`;
}

export const SlotsScreen: React.FC<Props> = ({
  service,
  onBack,
  onSlotSelected,
}) => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchSlotsForService(service.id);
        if (!cancelled) {
          setSlots(data.filter((s) => !s.is_booked));
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setError('Не удалось загрузить слоты. Попробуйте позже.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [service.id]);

  return (
    <ScreenLayout title={service.name} onBack={onBack}>
      <SectionCard header="Детали услуги">
        {service.master_name && (
          <div style={{ fontSize: 14, marginBottom: 4 }}>
            <strong>Мастер:</strong> {service.master_name}
          </div>
        )}
        {service.duration && (
          <div style={{ fontSize: 14, marginBottom: 4 }}>
            <strong>Длительность:</strong> {service.duration} мин.
          </div>
        )}
        {service.price != null && (
          <div style={{ fontSize: 14 }}>
            <strong>Цена:</strong> {service.price} ₽
          </div>
        )}
      </SectionCard>

      <SectionCard header="Свободные слоты">
        {loading && <div>Загрузка...</div>}
        {error && <div style={{ color: 'red' }}>{error}</div>}

        {!loading && !error && slots.length === 0 && (
          <div>Пока нет доступных слотов для этой услуги.</div>
        )}

        {!loading &&
          !error &&
          slots.map((slot) => (
            <ListItem
              key={slot.id}
              title={formatTime(slot.time)}
              onClick={() => onSlotSelected(slot)}
            />
          ))}
      </SectionCard>
    </ScreenLayout>
  );
};