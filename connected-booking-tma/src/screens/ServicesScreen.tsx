import React, { useEffect, useMemo, useState } from 'react';
import {
  List,
  Section,
  Cell,
  Spinner,
  Placeholder,
  Button,
  Text
} from '@telegram-apps/telegram-ui';
import { Icon28ServicesOutline } from '@vkontakte/icons';
import type { Service } from '../helpers/api';
import { fetchServices } from '../helpers/api';
import { ScreenLayout } from '../components/ScreenLayout';

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

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchServices();
      setServices(data);
    } catch (e) {
      console.error(e);
      setError('Не удалось загрузить услуги. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visibleServices = useMemo(() => {
    if (!selectedMasterName) return services;
    return services.filter((s) => s.master_name === selectedMasterName);
  }, [services, selectedMasterName]);

  const headerText = selectedMasterName
    ? `Услуги мастера ${selectedMasterName}`
    : 'Выберите услугу';

  return (
    <ScreenLayout title="Услуги" onBack={onBack}>
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spinner size="m" />
        </div>
      )}

      {!loading && error && (
        <Placeholder header="Ошибка" description={error}>
          <Button size="s" onClick={load}>Повторить</Button>
        </Placeholder>
      )}

      {!loading && !error && visibleServices.length === 0 && (
        <Placeholder
          header="Нет доступных услуг"
          description="Попробуйте выбрать другого мастера или загляните позже."
        />
      )}

      {!loading && !error && visibleServices.length > 0 && (
        <List style={{ background: 'var(--tgui--secondary_bg_color)', minHeight: '100%' }}>
          <Section header={headerText}>
            {visibleServices.map((s) => (
              <Cell
                key={s.id}
                onClick={() => onServiceSelected(s)}
                before={<Icon28ServicesOutline />}
                multiline
                description={
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: 2 }}>
                    {/* Duration Badge */}
                    {s.duration && (
                       <span style={{
                         fontSize: 12,
                         color: 'var(--tgui--hint_color)',
                         display: 'inline-flex',
                         alignItems: 'center'
                       }}>
                         ⏱ {s.duration} мин
                       </span>
                    )}

                    {/* Separator if both exist */}
                    {s.duration && s.price != null && <span>·</span>}

                    {/* Master Name (if not filtered by master already) */}
                    {!selectedMasterName && s.master_name && (
                      <span style={{ fontSize: 12, color: 'var(--tgui--hint_color)' }}>
                        {s.master_name}
                      </span>
                    )}
                  </div>
                }
                // Price on the right side
                after={
                  s.price != null && (
                    <Text weight="2" style={{ color: 'var(--tgui--link_color)' }}>
                      {s.price} ₽
                    </Text>
                  )
                }
              >
                {s.name}
              </Cell>
            ))}
          </Section>
        </List>
      )}
    </ScreenLayout>
  );
};