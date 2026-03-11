import React, { useState, useEffect } from 'react';
import {
  Spinner,
  Avatar,
  Title,
  Text,
  Section,
  Cell,
  List
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
// ИМПОРТИРУЕМ НАШУ НОВУЮ МОДАЛКУ
import { ReviewsListScreen } from './ReviewsListScreen';

type Props = {
  masterId: number;
  onBack: () => void;
  onBook: (masterName: string) => void;
  onServiceClick?: (service: Service) => void;
};

export const MasterPublicProfileScreen: React.FC<Props> = ({ masterId, onBack, onBook, onServiceClick }) => {
  const [master, setMaster] = useState<MasterPublicProfile | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // СОСТОЯНИЕ ДЛЯ МОДАЛКИ ОТЗЫВОВ
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);

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

    const handleBack = () => {
      // Если модалка открыта, кнопка "Назад" в Telegram должна закрывать её, а не уходить с профиля
      if (isReviewsModalOpen) {
          setIsReviewsModalOpen(false);
      } else {
          onBack();
      }
    };

    const handleBook = () => {
      if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
      onBook(master.name);
    };

    tg.BackButton.onClick(handleBack);
    tg.BackButton.show();

    // Прячем MainButton, если открыта модалка, чтобы она не висела поверх
    if (isReviewsModalOpen) {
        tg.MainButton.hide();
    } else {
        tg.MainButton.setParams({
            text: 'ОНЛАЙН-ЗАПИСЬ',
            color: tg.themeParams?.button_color || '#3390ec',
            text_color: tg.themeParams?.button_text_color || '#ffffff',
            is_active: true,
            is_visible: true
        });
        tg.MainButton.onClick(handleBook);
        tg.MainButton.show();
    }

    return () => {
      tg.BackButton.offClick(handleBack);
      tg.BackButton.hide();
      tg.MainButton.offClick(handleBook);
      tg.MainButton.hide();
    };
  }, [loading, master, onBack, onBook, isReviewsModalOpen]);

  if (loading || !master) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
        <Spinner size="l" />
      </div>
    );
  }

  const isAddressLink = master.address && master.address.includes('http');

  const triggerHaptic = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
  };

  return (
    <div style={{
        paddingBottom: 40,
        backgroundColor: 'var(--tg-theme-secondary-bg-color)',
        minHeight: '100vh'
    }}>
      <div style={{
          backgroundColor: 'var(--tg-theme-bg-color)',
          padding: '32px 16px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderBottom: '1px solid var(--tg-theme-secondary-bg-color)'
      }}>
        <Avatar
            size={100}
            src={getFullImageUrl(master.avatar_url)}
            style={{ marginBottom: 16 }}
        />
        <Title level="1" weight="2" style={{ marginBottom: 4 }}>{master.name}</Title>
        <Text style={{ color: 'var(--tg-theme-hint-color)', fontSize: 15 }}>{master.city || 'Специалист'}</Text>

        <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            width: '100%',
            marginTop: 24,
            padding: '16px 0',
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            borderRadius: 16
        }}>
          {/* ОТКРЫТИЕ МОДАЛКИ ПРИ КЛИКЕ */}
          <div
              onClick={() => {
                  triggerHaptic();
                  setIsReviewsModalOpen(true);
              }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
          >
              <Icon28FavoriteOutline style={{ color: '#FFB703', marginBottom: 4 }} width={24} height={24} />
              <span style={{ fontWeight: 'bold', fontSize: 16, color: 'var(--tg-theme-text-color)' }}>
                  {master.rating > 0 ? master.rating.toFixed(1) : '5.0'}
              </span>
              <span style={{ fontSize: 13, color: 'var(--tg-theme-link-color)', marginTop: '2px', fontWeight: 500 }}>
                  {master.reviews_count} отзывов ›
              </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Icon28WorkOutline style={{ color: 'var(--tg-theme-button-color)', marginBottom: 4 }} width={24} height={24} />
              <span style={{ fontWeight: 'bold', fontSize: 16, color: 'var(--tg-theme-text-color)' }}>Профи</span>
              <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginTop: '2px' }}>Опыт</span>
          </div>
        </div>
      </div>

      <List style={{ marginTop: 16, marginBottom: 16 }}>
        {(master.phone || master.address) && (
             <Section header="Контакты">
                {master.phone && (
                    <Cell
                       before={<Icon28PhoneOutline style={{ color: 'var(--tg-theme-button-color)' }} />}
                       onClick={() => { triggerHaptic(); window.location.href=`tel:${master.phone}`; }}
                       description="Нажмите, чтобы позвонить"
                    >
                       {master.phone}
                    </Cell>
                )}
                {master.address && (
                    isAddressLink ? (
                       <Cell
                          before={<Icon24LocationOutline style={{ color: 'var(--tg-theme-button-color)' }} />}
                          onClick={() => { triggerHaptic(); window.open(master.address, '_blank'); }}
                       >
                          <span style={{ color: 'var(--tg-theme-link-color)' }}>Открыть на карте</span>
                       </Cell>
                    ) : (
                       <Cell before={<Icon24LocationOutline style={{ color: 'var(--tg-theme-hint-color)' }} />} multiline>
                          {master.address}
                       </Cell>
                    )
                )}
             </Section>
        )}

        {services.length > 0 && (
            <Section header="Услуги и цены">
               {services.map(s => (
                  <Cell
                     key={s.id}
                     onClick={() => {
                        triggerHaptic();
                        onServiceClick?.(s);
                     }}
                     subtitle={s.description ? `${s.duration} мин • ${s.description}` : `${s.duration} мин`}
                     after={
                       <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                         <span style={{ fontWeight: 600, color: 'var(--tg-theme-text-color)' }}>
                           {s.price ? `${s.price.toLocaleString('ru-RU')} сум` : ''}
                         </span>
                         <Icon28ChevronRightOutline width={20} height={20} style={{ color: 'var(--tg-theme-hint-color)' }} />
                       </div>
                     }
                  >
                     {s.name}
                  </Cell>
               ))}
            </Section>
        )}

        {master.bio && (
            <Section header="Обо мне">
                <Cell multiline>
                    <Text style={{ lineHeight: '1.5', color: 'var(--tg-theme-text-color)' }}>{master.bio}</Text>
                </Cell>
            </Section>
        )}

        {portfolio.length > 0 && (
            <Section header="Мои работы">
                <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {portfolio.slice(0, 6).map(item => (
                        <div key={item.id} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 8, overflow: 'hidden', backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
                            <img src={getFullImageUrl(item.image_url)} alt="work" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    ))}
                </div>
            </Section>
        )}
      </List>

      <ReviewsListScreen
          masterId={master.id}
          isOpen={isReviewsModalOpen}
          onClose={() => setIsReviewsModalOpen(false)}
      />

    </div>
  );
};