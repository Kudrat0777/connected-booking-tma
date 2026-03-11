import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  List,
  Section,
  Cell,
  Placeholder,
  Spinner,
  Text
} from '@telegram-apps/telegram-ui';
import { fetchServices, Service } from '../helpers/api';
import { Icon24Search, Icon28ChevronRightOutline } from '@vkontakte/icons';
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

  // 1. ПОДКЛЮЧАЕМ НАТИВНУЮ КНОПКУ "НАЗАД"
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;

    tg.BackButton.onClick(onBack);
    tg.BackButton.show();

    return () => {
      tg.BackButton.offClick(onBack);
      tg.BackButton.hide();
    };
  }, [onBack]);

  // 2. ЗАГРУЗКА УСЛУГ
  useEffect(() => {
    const idToFetch = masterId ? masterId : undefined;

    fetchServices(idToFetch)
      .then(setServices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [masterId]);

  // 3. ФИЛЬТРАЦИЯ
  const filteredServices = useMemo(() => {
    let res = services;

    if (!masterId && selectedMasterName) {
       res = res.filter(s => s.master_name === selectedMasterName);
    }

    if (search) {
      const q = search.toLowerCase();
      res = res.filter(s => s.name.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q)));
    }
    return res;
  }, [services, search, selectedMasterName, masterId]);

  // Вызов вибрации при клике
  const handleServiceClick = (s: Service) => {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
      onServiceSelected(s);
  };

  return (
    <div style={{
        backgroundColor: 'var(--tg-theme-secondary-bg-color)',
        minHeight: '100vh',
        paddingBottom: 40
    }}>

      {/* ПЛАВАЮЩИЙ ПОИСК (Прилипает к верху) */}
      <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'var(--tg-theme-secondary-bg-color)',
          padding: '16px 16px 8px'
      }}>
        <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--tg-theme-bg-color)',
            borderRadius: '12px',
            padding: '10px 14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
            <Icon24Search style={{ color: 'var(--tg-theme-hint-color)', marginRight: '8px' }} />
            <input
              type="text"
              placeholder="Поиск услуги..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  color: 'var(--tg-theme-text-color)',
                  width: '100%',
                  fontSize: '16px'
              }}
            />
        </div>
      </div>

      {/* КОНТЕНТ */}
      <div style={{ paddingTop: 8 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
                <Spinner size="l"/>
            </div>
          ) : filteredServices.length === 0 ? (
            <div style={{ marginTop: 20 }}>
               <Placeholder
                 header="Ничего нет"
                 description="Услуги по вашему запросу не найдены"
               >
                  <LottieIcon src="/stickers/duck_out.json" size={140} />
               </Placeholder>
            </div>
          ) : (
            <List style={{ padding: '0 16px' }}>
                <Section header={selectedMasterName ? `Услуги мастера: ${selectedMasterName}` : 'Все услуги'}>
                  {filteredServices.map((s) => (
                    <Cell
                      key={s.id}
                      onClick={() => handleServiceClick(s)}
                      subtitle={s.description ? `${s.duration} мин • ${s.description}` : `${s.duration} мин`}
                      after={
                         <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                           <span style={{ fontWeight: 600, color: 'var(--tg-theme-text-color)' }}>
                             {s.price ? `${s.price.toLocaleString('ru-RU')} UZS` : 'Бесплатно'}
                           </span>
                           <Icon28ChevronRightOutline width={20} height={20} style={{ color: 'var(--tg-theme-hint-color)' }} />
                         </div>
                      }
                      multiline
                    >
                      <span style={{ fontWeight: 500, fontSize: 16 }}>{s.name}</span>

                      {/* Если мы зашли со страницы "Все услуги" (без мастера), показываем имя мастера */}
                      {!selectedMasterName && !masterId && s.master_name && (
                         <div style={{ fontSize: 13, color: 'var(--tg-theme-button-color)', marginTop: 4 }}>
                            {s.master_name}
                         </div>
                      )}
                    </Cell>
                  ))}
                </Section>
            </List>
          )}
      </div>
    </div>
  );
};