import React, { useEffect, useMemo, useState } from 'react';
import type { Service } from '../helpers/api';
import { fetchServices } from '../helpers/api';
import { ScreenLayout } from '../components/ScreenLayout';
import { SectionCard } from '../components/SectionCard';
import { ListItem } from '../components/ListItem';
import { ServicesSectionHeader } from '../components/ServicesSectionHeader'; // НОВОЕ

type Props = {
  onBack: () => void;
  onServiceSelected: (service: Service) => void;
  selectedMasterName?: string | null;
};

export const ServicesScreen: React.FC<Props> = ({
  onBack,
  onServiceSelected,
  selectedMasterName,
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchServices();
        if (!cancelled) {
          setServices(data);
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setError('Не удалось загрузить услуги. Попробуйте позже.');
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
  }, []);

  const visibleServices = useMemo(() => {
    if (!selectedMasterName) return services;
    return services.filter(
      (s) => s.master_name === selectedMasterName,
    );
  }, [services, selectedMasterName]);

  // Текст заголовка секции — как в StoryBookComponent
  const sectionHeader = selectedMasterName
    ? `Услуги мастера ${selectedMasterName}`
    : 'Pick from existed options';

  return (
    <ScreenLayout title="Услуги" onBack={onBack}>
      <SectionCard>
        <ServicesSectionHeader
          sectionHeader={sectionHeader}
          selectedBehavior="hide"
          status="default"
        />

        {loading && <div>Загрузка...</div>}
        {error && <div style={{ color: 'red' }}>{error}</div>}

        {!loading && !error && visibleServices.length === 0 && (
          <div>Пока нет ни одной услуги.</div>
        )}

        {!loading &&
          !error &&
          visibleServices.map((s) => (
            <ListItem
              key={s.id}
              onClick={() => onServiceSelected(s)}
              title={s.name}
              subtitle={
                <>
                  {s.master_name && <span>Мастер: {s.master_name}</span>}
                  {(s.duration || s.price != null) && (
                    <span>
                      {' '}
                      ·{' '}
                      {s.duration ? `${s.duration} мин` : ''}
                      {s.price != null ? ` · ${s.price} ₽` : ''}
                    </span>
                  )}
                </>
              }
            />
          ))}
      </SectionCard>
    </ScreenLayout>
  );
};