import React, { useState, useEffect } from 'react';
import {
  Spinner,
  Avatar,
  Title,
  Text,
  Section,
  Cell
} from '@telegram-apps/telegram-ui';
import {
  Icon28FavoriteOutline,
  Icon28WorkOutline,
  Icon24LocationOutline,
  Icon28PhoneOutline,
  Icon28ChevronRightOutline
} from '@vkontakte/icons';

import { fetchMasterById, fetchPortfolio, fetchServices, getFullImageUrl } from '../helpers/api';
import type { MasterPublicProfile, PortfolioItem, Service } from '../helpers/api';

type Props = {
  masterId: number;
  onBack: () => void;
  onBook: (masterName: string) => void;
  // НОВОЕ СОБЫТИЕ: клик по конкретной услуге
  onServiceClick?: (service: Service) => void;
};

export const MasterPublicProfileScreen: React.FC<Props> = ({ masterId, onBack, onBook, onServiceClick }) => {
  const [master, setMaster] = useState<MasterPublicProfile | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [masterData, portfolioData, servicesData] = await Promise.all([
          fetchMasterById(masterId),
          fetchPortfolio(masterId),
          fetchServices(masterId)
        ]);
        setMaster(masterData);
        setPortfolio(portfolioData);
        setServices(servicesData);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    loadData();
  }, [masterId]);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg || loading || !master) return;

    tg.BackButton.show();
    tg.BackButton.onClick(onBack);

    tg.MainButton.setText('ОНЛАЙН-ЗАПИСЬ');
    tg.MainButton.color = tg.themeParams?.button_color || '#3390ec';
    tg.MainButton.textColor = tg.themeParams?.button_text_color || '#ffffff';
    tg.MainButton.show();

    const handleBook = () => {
      if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
      onBook(master.name);
    };
    tg.MainButton.onClick(handleBook);

    return () => {
      tg.BackButton.offClick(onBack);
      tg.BackButton.hide();
      tg.MainButton.offClick(handleBook);
      tg.MainButton.hide();
    };
  }, [loading, master, onBack, onBook]);

  if (loading || !master) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--tgui--secondary_bg_color)' }}>
        <Spinner size="l" />
      </div>
    );
  }

  const isAddressLink = master.address && master.address.includes('http');

  return (
    <div style={{ paddingBottom: 40, background: 'var(--tgui--secondary_bg_color)', minHeight: '100vh' }}>

      <div style={{ background: 'var(--tgui--bg_color)', padding: '32px 16px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Avatar size={100} src={getFullImageUrl(master.avatar_url)} style={{ marginBottom: 16, border: '3px solid var(--tgui--button_color)' }} />
        <Title level="1" weight="2" style={{ marginBottom: 4 }}>{master.name}</Title>
        <Text style={{ color: 'var(--tgui--hint_color)', fontSize: 15 }}>{master.city || 'Специалист'}</Text>

        <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', marginTop: 24, padding: '16px 0', background: 'var(--tgui--secondary_bg_color)', borderRadius: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Icon28FavoriteOutline style={{ color: '#FFB703', marginBottom: 4 }} width={24} height={24} />
              <span style={{ fontWeight: 'bold', fontSize: 16 }}>{master.rating > 0 ? master.rating.toFixed(1) : '5.0'}</span>
              <span style={{ fontSize: 12, color: 'var(--tgui--hint_color)' }}>{master.reviews_count} отзывов</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Icon28WorkOutline style={{ color: 'var(--tgui--button_color)', marginBottom: 4 }} width={24} height={24} />
              <span style={{ fontWeight: 'bold', fontSize: 16 }}>Профи</span>
              <span style={{ fontSize: 12, color: 'var(--tgui--hint_color)' }}>Опыт</span>
          </div>
        </div>
      </div>

      {(master.phone || master.address) && (
          <div style={{ margin: '16px 0' }}>
             <Section header="Контакты">
                {master.phone && (
                    <Cell
                       before={<Icon28PhoneOutline style={{ color: 'var(--tgui--button_color)' }} />}
                       onClick={() => window.location.href=`tel:${master.phone}`}
                       description="Нажмите, чтобы позвонить"
                    >
                       {master.phone}
                    </Cell>
                )}
                {master.address && (
                    isAddressLink ? (
                       <Cell
                          before={<Icon24LocationOutline style={{ color: 'var(--tgui--button_color)' }} />}
                          onClick={() => window.open(master.address, '_blank')}
                       >
                          <span style={{ color: 'var(--tgui--link_color)' }}>Открыть на карте</span>
                       </Cell>
                    ) : (
                       <Cell before={<Icon24LocationOutline style={{ color: 'var(--tgui--hint_color)' }} />} multiline>
                          {master.address}
                       </Cell>
                    )
                )}
             </Section>
          </div>
      )}

      {/* --- ИСПРАВЛЕНО: Теперь услуги кликабельны --- */}
      {services.length > 0 && (
         <div style={{ margin: '16px 0' }}>
            <Section header="Услуги прайс-лист">
               {services.map(s => (
                  <Cell
                     key={s.id}
                     onClick={() => {
                        const tg = (window as any).Telegram?.WebApp;
                        if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
                        onServiceClick?.(s);
                     }}
                     subtitle={s.description ? `${s.duration} мин • ${s.description}` : `${s.duration} мин`}
                     after={
                       <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                         <span style={{ fontWeight: 600, color: 'var(--tgui--text_color)' }}>
                           {s.price ? `${s.price.toLocaleString('ru-RU')} сум` : ''}
                         </span>
                         {/* Добавлена стрелочка, чтобы было понятно, что можно нажать */}
                         <Icon28ChevronRightOutline width={20} height={20} style={{ color: 'var(--tgui--hint_color)' }} />
                       </div>
                     }
                  >
                     {s.name}
                  </Cell>
               ))}
            </Section>
         </div>
      )}

      {master.bio && (
          <div style={{ margin: '16px 0', padding: 16, background: 'var(--tgui--bg_color)' }}>
              <Title level="3" style={{ marginBottom: 8 }}>Обо мне</Title>
              <Text style={{ lineHeight: '1.5', color: 'var(--tgui--text_color)' }}>{master.bio}</Text>
          </div>
      )}

      {portfolio.length > 0 && (
          <div style={{ margin: '16px 0', padding: 16, background: 'var(--tgui--bg_color)' }}>
              <Title level="3" style={{ marginBottom: 12 }}>Мои работы</Title>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {portfolio.slice(0, 6).map(item => (
                      <div key={item.id} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 12, overflow: 'hidden', backgroundColor: '#e0e0e0' }}>
                          <img src={getFullImageUrl(item.image_url)} alt="work" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};