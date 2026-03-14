import React, { useState, useEffect, useRef } from 'react';
import {
  Spinner,
  Avatar,
  Title,
  Text,
  Section,
  Cell,
  List,
  Button,
  Placeholder
} from '@telegram-apps/telegram-ui';
import {
  Icon28FavoriteOutline,
  Icon28WorkOutline,
  Icon24LocationOutline,
  Icon28PhoneOutline,
  Icon28ChevronRightOutline
} from '@vkontakte/icons';
import lottie from 'lottie-web';

// Возвращаем импорт fetchMasterById
import { fetchMasterProfile, fetchMasterById, fetchPortfolio, fetchServices, getFullImageUrl } from '../helpers/api';
import type { MasterPublicProfile, PortfolioItem, Service } from '../helpers/api';
import { ReviewsListScreen } from './ReviewsListScreen';

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
  masterId: number;
  onBack: () => void;
  onBook: (masterName: string) => void;
  onServiceClick?: (service: Service) => void;
};

const formatExperience = (years?: number) => {
    if (!years) return 'Новичок';
    const lastDigit = years % 10;
    const lastTwo = years % 100;
    if (lastTwo >= 11 && lastTwo <= 14) return `${years} лет`;
    if (lastDigit === 1) return `${years} год`;
    if (lastDigit >= 2 && lastDigit <= 4) return `${years} года`;
    return `${years} лет`;
};

export const MasterPublicProfileScreen: React.FC<Props> = ({ masterId, onBack, onBook, onServiceClick }) => {
  const [master, setMaster] = useState<MasterPublicProfile | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(false);
      try {
        let masterData = null;

        // УМНАЯ ПРОВЕРКА:
        // Если ID огромный (пришел из диплинка) — ищем по telegram_id
        // Если ID маленький (кликнули в списке) — ищем по внутреннему ID базы данных
        if (masterId > 1000000) {
            masterData = await fetchMasterProfile(masterId);
        } else {
            masterData = await fetchMasterById(masterId);
        }

        if (!masterData || masterData.detail === "Not found.") {
           setError(true);
           return;
        }

        setMaster(masterData);

        const internalId = masterData.id || masterId;

        const [portfolioData, servicesData] = await Promise.all([
          fetchPortfolio(internalId),
          fetchServices(internalId)
        ]);

        setPortfolio(portfolioData);
        setServices(servicesData);

      } catch (e) {
          console.error('Error loading master data:', e);
          setError(true);
      } finally {
          setLoading(false);
      }
    };
    loadData();
  }, [masterId]);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;

    if (error) {
        tg.BackButton.show();
        tg.BackButton.onClick(onBack);
        tg.MainButton.hide();
        return () => { tg.BackButton.offClick(onBack); };
    }

    if (loading || !master) return;

    const handleBack = () => {
      if (selectedImage) {
          setSelectedImage(null);
      } else if (isReviewsModalOpen) {
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

    if (isReviewsModalOpen || selectedImage) {
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
  }, [loading, master, error, onBack, onBook, isReviewsModalOpen, selectedImage]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
        <Spinner size="l" />
      </div>
    );
  }

  if (error || !master) {
      return (
          <div style={{ backgroundColor: 'var(--tg-theme-bg-color)', minHeight: '100vh', paddingTop: 80 }}>
              <Placeholder
                  header="Мастер не найден"
                  description="Возможно, ссылка устарела или мастер удалил свой профиль."
                  action={<Button size="l" stretched onClick={onBack}>На главную</Button>}
              >
                  <LottieIcon src="/stickers/duck_out.json" size={140} />
              </Placeholder>
          </div>
      );
  }

  const isAddressLink = master.address && master.address.includes('http');
  const currentHour = new Date().getHours();
  const isOpen = currentHour >= 10 && currentHour < 20;

  const triggerHaptic = (type: 'light' | 'selection' = 'selection') => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
        if (type === 'light') tg.HapticFeedback.impactOccurred('light');
        else tg.HapticFeedback.selectionChanged();
    }
  };

  return (
    <div style={{
        paddingBottom: 80,
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
            style={{ marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
        />
        <Title level="1" weight="2" style={{ marginBottom: 6, color: 'var(--tg-theme-text-color)' }}>{master.name}</Title>

        <Text style={{ color: 'var(--tg-theme-hint-color)', fontSize: 15, marginBottom: 10, textAlign: 'center', padding: '0 16px' }}>
            {master.city || 'Город не указан'}
            {master.address && !isAddressLink ? `, ${master.address}` : ''}
        </Text>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, backgroundColor: 'var(--tg-theme-secondary-bg-color)', padding: '6px 12px', borderRadius: 20 }}>
             <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: isOpen ? '#34C759' : '#FF3B30' }} />
             <span style={{ color: isOpen ? '#34C759' : '#FF3B30' }}>{isOpen ? 'Открыто' : 'Закрыто'}</span>
             <span style={{ color: 'var(--tg-theme-hint-color)', fontWeight: 400 }}>• {isOpen ? 'до 20:00' : 'откроется в 10:00'}</span>
        </div>

        <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            width: '100%',
            marginTop: 24,
            padding: '16px 0',
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            borderRadius: 16
        }}>
          <div
              onClick={() => {
                  triggerHaptic('selection');
                  setIsReviewsModalOpen(true);
              }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flex: 1 }}
          >
              <Icon28FavoriteOutline style={{ color: '#FFB703', marginBottom: 4 }} width={24} height={24} />
              <span style={{ fontWeight: 'bold', fontSize: 16, color: 'var(--tg-theme-text-color)' }}>
                  {master.rating > 0 ? master.rating.toFixed(1) : '5.0'}
              </span>
              <span style={{ fontSize: 13, color: 'var(--tg-theme-link-color)', marginTop: '2px', fontWeight: 500 }}>
                  {master.reviews_count} отзывов ›
              </span>
          </div>

          <div style={{ width: 1, backgroundColor: 'var(--tg-theme-bg-color)', opacity: 0.5 }} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <Icon28WorkOutline style={{ color: 'var(--tg-theme-button-color)', marginBottom: 4 }} width={24} height={24} />
              <span style={{ fontWeight: 'bold', fontSize: 16, color: 'var(--tg-theme-text-color)' }}>
                  {formatExperience((master as any).experience_years)}
              </span>
              <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginTop: '2px' }}>Опыт работы</span>
          </div>
        </div>
      </div>

      <List style={{ padding: '0 16px', marginTop: 16, marginBottom: 16 }}>
        {(master.phone || master.address) && (
             <Section header="Контакты">
                {master.phone && (
                    <Cell
                       before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(0, 122, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28PhoneOutline width={24} height={24} style={{ color: '#007AFF'}} /></div>}
                       onClick={() => { triggerHaptic('selection'); window.location.href=`tel:${master.phone}`; }}
                       description="Нажмите, чтобы позвонить"
                    >
                       <span style={{ fontWeight: 500 }}>{master.phone}</span>
                    </Cell>
                )}
                {master.address && (
                    isAddressLink ? (
                       <Cell
                          before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(52, 199, 89, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon24LocationOutline width={24} height={24} style={{ color: '#34C759'}} /></div>}
                          onClick={() => { triggerHaptic('selection'); window.open(master.address, '_blank'); }}
                       >
                          <span style={{ color: 'var(--tg-theme-link-color)', fontWeight: 500 }}>Открыть на карте</span>
                       </Cell>
                    ) : (
                       <Cell
                          before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255, 149, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon24LocationOutline width={24} height={24} style={{ color: '#FF9500'}} /></div>}
                          multiline
                       >
                          <span style={{ fontWeight: 500 }}>{master.address}</span>
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
                        triggerHaptic('selection');
                        onServiceClick?.(s);
                     }}
                     subtitle={s.description ? `${s.duration} мин • ${s.description}` : `${s.duration} мин`}
                     after={
                       <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                         <span style={{ fontWeight: 600, color: 'var(--tg-theme-text-color)' }}>
                           {s.price ? `${s.price.toLocaleString('ru-RU')} UZS` : ''}
                         </span>
                         <Icon28ChevronRightOutline width={20} height={20} style={{ color: 'var(--tg-theme-hint-color)' }} />
                       </div>
                     }
                     multiline
                  >
                     <span style={{ fontWeight: 500 }}>{s.name}</span>
                  </Cell>
               ))}
            </Section>
        )}

        {master.bio && (
            <Section header="Обо мне">
                <div style={{ padding: '12px 16px', backgroundColor: 'var(--tg-theme-bg-color)' }}>
                    <Text style={{ lineHeight: '1.5', color: 'var(--tg-theme-text-color)', fontSize: 15 }}>
                        {master.bio}
                    </Text>
                </div>
            </Section>
        )}

        {portfolio.length > 0 && (
            <Section header="Примеры работ">
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, backgroundColor: 'var(--tg-theme-bg-color)' }}>
                    {portfolio.slice(0, 6).map(item => {
                        const imgUrl = getFullImageUrl(item.image_url);
                        return (
                            <div
                                key={item.id}
                                onClick={() => {
                                    triggerHaptic('light');
                                    setSelectedImage(imgUrl);
                                }}
                                style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 8, overflow: 'hidden', backgroundColor: 'var(--tg-theme-secondary-bg-color)', cursor: 'pointer' }}
                            >
                                <img src={imgUrl} alt="work" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        );
                    })}
                </div>
            </Section>
        )}
      </List>

      <ReviewsListScreen
          masterId={master.id}
          isOpen={isReviewsModalOpen}
          onClose={() => setIsReviewsModalOpen(false)}
      />

      {selectedImage && (
          <div
              style={{
                  position: 'fixed',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  backdropFilter: 'blur(10px)',
                  zIndex: 99999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'fadeIn 0.2s ease-out'
              }}
              onClick={() => {
                  triggerHaptic('light');
                  setSelectedImage(null);
              }}
          >
              <div style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 6L6 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
              </div>

              <img
                  src={selectedImage}
                  alt="Fullscreen portfolio"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
          </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};