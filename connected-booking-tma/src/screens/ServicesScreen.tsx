import React, { useEffect, useState, useMemo, useRef } from 'react';
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
import lottie from 'lottie-web';

const LottieIcon: React.FC<{ src: string; size?: number }> = ({ src, size = 120 }) => {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    try {
      const anim = lottie.loadAnimation({
        container: container.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: src,
      });
      return () => anim.destroy();
    } catch (e) { console.error(e); }
  }, [src]);
  return <div ref={container} style={{ width: size, height: size, margin: '0 auto 16px' }} />;
};

type Props = {
  onBack: () => void;
  onServiceSelected: (service: Service) => void;
  selectedMasterName?: string | null;
  masterId?: number | null;
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
    const idToFetch = masterId ? masterId : undefined;

    fetchServices(idToFetch)
      .then(setServices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [masterId]);

  const filteredServices = useMemo(() => {
    let res = services;

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

        {/* ЗАМЕНЕННЫЙ БЛОК С АНИМАЦИЕЙ */}
        {!loading && filteredServices.length === 0 && (
           <Placeholder
             header="Ничего нет"
             description="Услуги по вашему запросу не найдены"
           >
              <LottieIcon src="/stickers/duck_out.json" size={140} />
           </Placeholder>
        )}
      </List>
    </ScreenLayout>
  );
};