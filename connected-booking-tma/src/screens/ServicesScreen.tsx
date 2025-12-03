import React, { useEffect, useState, useMemo } from 'react';
import {
  List,
  Section,
  Cell,
  Placeholder,
  Spinner,
  Input
} from '@telegram-apps/telegram-ui';
import { ScreenLayout } from '../components/ScreenLayout';
import { fetchServices, Service } from '../helpers/api';
import { Icon24Search } from '@vkontakte/icons';

type Props = {
  onBack: () => void;
  onServiceSelected: (service: Service) => void;
  selectedMasterName?: string | null; // Оставим для отображения в заголовке
  masterId?: number | null; // <--- НОВЫЙ ПРОПС
};

export const ServicesScreen: React.FC<Props> = ({
  onBack,
  onServiceSelected,
  selectedMasterName,
  masterId
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Если передан ID мастера, грузим только его услуги
    // Если нет - грузим все (как раньше)
    const idToFetch = masterId ? masterId : undefined;

    fetchServices(idToFetch)
      .then(setServices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [masterId]);

  const filteredServices = useMemo(() => {
    let res = services;

    // Если мы НЕ передали ID, но передали Имя (старая логика из списка мастеров), фильтруем тут
    if (!masterId && selectedMasterName) {
       res = res.filter(s => s.master_name === selectedMasterName);
    }

    if (search) {
      const q = search.toLowerCase();
      res = res.filter(s => s.name.toLowerCase().includes(q));
    }
    return res;
  }, [services, search, selectedMasterName, masterId]);

  const title = selectedMasterName ? `Услуги: ${selectedMasterName}` : 'Выберите услугу';

  return (
    <ScreenLayout title={title} onBack={onBack}>
      <div style={{ padding: 16 }}>
        <Input
           placeholder="Поиск услуги..."
           before={<Icon24Search style={{ color: 'var(--tgui--hint_color)' }}/>}
           value={search}
           onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading && <div style={{ display: 'flex', justifyContent: 'center' }}><Spinner size="m"/></div>}

      <List>
        {filteredServices.map((s) => (
          <Section key={s.id}>
            <Cell
              description={`${s.duration} мин • ${s.price} ₽`}
              onClick={() => onServiceSelected(s)}
              multiline
            >
              {s.name}
              {!selectedMasterName && !masterId && (
                 <div style={{ fontSize: 12, color: 'var(--tgui--link_color)' }}>
                    Мастер: {s.master_name}
                 </div>
              )}
            </Cell>
          </Section>
        ))}
        {!loading && filteredServices.length === 0 && (
           <Placeholder header="Ничего нет" description="Услуги не найдены" />
        )}
      </List>
    </ScreenLayout>
  );
};