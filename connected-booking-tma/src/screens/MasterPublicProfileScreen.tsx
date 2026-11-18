import { BRAND } from '../helpers/brand';
import React, { useState, useEffect } from 'react';
import { Spinner, Button, Placeholder } from '@telegram-apps/telegram-ui';
import { KonnektikSticker } from '../components/Konnektik';
import { Avatar as UiAvatar, Badge, PrimaryButton, card, money } from '../components/ui';
import { useWhen } from './ClientHomeScreen';
import { fill } from '../helpers/translationsBusiness';

import { fetchMasterProfile, fetchMasterById, fetchPortfolio, fetchServices, getFullImageUrl } from '../helpers/api';
import type { MasterPublicProfile, PortfolioItem, Service } from '../helpers/api';
import { ReviewsListScreen } from './ReviewsListScreen';

// ИМПОРТИРУЕМ ХУК ЛОКАЛИЗАЦИИ
import { useLanguage } from '../helpers/LanguageContext';

const LottieIcon = KonnektikSticker;

type Props = {
  masterId: number;
  onBack: () => void;
  onBook: (masterName: string) => void;
  onServiceClick?: (service: Service) => void;
};

export const MasterPublicProfileScreen: React.FC<Props> = ({ masterId, onBack, onBook, onServiceClick }) => {
  // ПОДКЛЮЧАЕМ ПЕРЕВОДЫ
  const { t } = useLanguage();
  const when = useWhen();

  const [master, setMaster] = useState<MasterPublicProfile | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Функция форматирования опыта работы с учетом перевода
  const formatExperience = (years?: number) => {
    if (!years) return t('experience_beginner');
    const lastDigit = years % 10;
    const lastTwo = years % 100;
    if (lastTwo >= 11 && lastTwo <= 14) return `${years} ${t('experience_years_5')}`;
    if (lastDigit === 1) return `${years} ${t('experience_years_1')}`;
    if (lastDigit >= 2 && lastDigit <= 4) return `${years} ${t('experience_years_24')}`;
    return `${years} ${t('experience_years_5')}`;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(false);
      try {
        let masterData = null;

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
      startBooking();
    };

    tg.BackButton.onClick(handleBack);
    tg.BackButton.show();

    if (isReviewsModalOpen || selectedImage || !inTelegram) {
        tg.MainButton.hide();
    } else {
        tg.MainButton.setParams({
            text: t('btn_online_booking'), // ПЕРЕВОД КНОПКИ
            color: BRAND.accent,
            text_color: BRAND.onAccent,
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
  }, [loading, master, error, onBack, onBook, isReviewsModalOpen, selectedImage, t, services]); // eslint-disable-line react-hooks/exhaustive-deps

  // В Telegram запись — нативной кнопкой внизу, в браузере — своей кнопкой на странице
  const inTelegram = ((window as any).Telegram?.WebApp?.platform || 'unknown') !== 'unknown';

  function startBooking() {
    if (services.length === 1 && onServiceClick) { onServiceClick(services[0]); return; }
    if (services.length === 0 && master) { onBook(master.name); return; }
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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
                  header={t('master_not_found')}
                  description={t('master_not_found_desc')}
                  action={<Button size="l" stretched onClick={onBack}>{t('to_main_page')}</Button>}
              >
                  <LottieIcon src="/stickers/duck_out.json" size={140} />
              </Placeholder>
          </div>
      );
  }

  const isAddressLink = master.address && master.address.includes('http');
  const today = master.today;
  const CATS = ['Барбершоп', 'Салон красоты', 'Массаж', 'Маникюр / Педикюр', 'Брови и Ресницы',
    'Медицина', 'Спорт / Фитнес', 'Автосервис', 'Другое'];
  const catIndex = CATS.indexOf(master.category || '');
  const category = catIndex >= 0 ? t(`cat_${catIndex}`) : (master.category || '');

  // Статус «работает сейчас» — только по настоящему графику мастера
  const statusChip = (() => {
    if (!today || today.state === 'unknown') return null;
    if (today.state === 'open') return <Badge tone="ok">● {fill(t('mp_open_until'), { time: today.closes || '' })}</Badge>;
    if (today.state === 'later') return <Badge tone="wait">{fill(t('mp_opens_at'), { time: today.opens || '' })}</Badge>;
    if (today.state === 'closed') return <Badge tone="off">{t('mp_closed_today')}</Badge>;
    return <Badge tone="off">{t('mp_day_off')}</Badge>;
  })();

  const triggerHaptic = (type: 'light' | 'selection' = 'selection') => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
        if (type === 'light') tg.HapticFeedback.impactOccurred('light');
        else tg.HapticFeedback.selectionChanged();
    }
  };

  return (
    <div style={{ paddingBottom: inTelegram ? 40 : 110, backgroundColor: 'var(--tg-theme-secondary-bg-color)', minHeight: '100vh', color: 'var(--tg-theme-text-color)' }}>
      {/* Шапка */}
      <div style={{ backgroundColor: 'var(--tg-theme-bg-color)', padding: '28px 16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderRadius: '0 0 24px 24px' }}>
        <UiAvatar src={master.avatar_url} name={master.name} size={96} radius={30} />
        <div style={{ fontSize: 24, fontWeight: 800, marginTop: 14 }}>{master.name}</div>
        <div style={{ fontSize: 15, color: 'var(--tg-theme-hint-color)', marginTop: 4 }}>
          {[category, master.business?.kind === 'team' ? master.business.name : ''].filter(Boolean).join(' · ')}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 12 }}>
          {statusChip}
          {master.reviews_count > 0 ? (
            <button type="button" onClick={() => { triggerHaptic(); setIsReviewsModalOpen(true); }}
              style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Badge tone="brand">★ {master.rating.toFixed(1)} · {master.reviews_count} {t('reviews')} ›</Badge>
            </button>
          ) : (
            <Badge tone="brand">{t('mp_new_master')}</Badge>
          )}
          {(master as any).experience_years > 0 && <Badge tone="off">{formatExperience((master as any).experience_years)}</Badge>}
        </div>

        {master.next_free && (
          <div style={{ marginTop: 16, width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 14, backgroundColor: 'var(--brand-soft)', color: 'var(--brand-ink)', fontWeight: 600, fontSize: 15 }}>
            🕐 {fill(t('mp_nearest'), { when: when(master.next_free) })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 16px 0' }}>
        {/* Услуги */}
        {services.length > 0 && (
          <div id="services">
            <div style={{ fontSize: 18, fontWeight: 700, margin: '4px 4px 10px' }}>{t('services_and_prices')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {services.map((s) => (
                <button key={s.id} type="button" onClick={() => { triggerHaptic(); onServiceClick?.(s); }}
                  style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--tg-theme-text-color)', fontFamily: 'inherit', width: '100%' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{s.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginTop: 2 }}>
                      {s.duration ? `${s.duration} ${t('min')}` : ''}{s.description ? ` · ${s.description}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                    <div style={{ fontWeight: 700 }}>{money(s.price)}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand-ink)', marginTop: 2 }}>{t('mp_choose')} ›</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* О мастере */}
        {master.bio && (
          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{t('about_me')}</div>
            <div style={{ fontSize: 15, lineHeight: 1.5 }}>{master.bio}</div>
          </div>
        )}

        {/* Работы */}
        {portfolio.length > 0 && (
          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>{t('portfolio_header')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {portfolio.slice(0, 9).map((item) => {
                const imgUrl = getFullImageUrl(item.image_url);
                return (
                  <button key={item.id} type="button" onClick={() => { triggerHaptic('light'); setSelectedImage(imgUrl || null); }}
                    style={{ aspectRatio: '1/1', borderRadius: 10, overflow: 'hidden', border: 'none', padding: 0, cursor: 'pointer', backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
                    <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Как найти */}
        {(master.phone || master.address) && (
          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{t('contacts_header')}</div>
            {master.address && (
              isAddressLink ? (
                <button type="button" onClick={() => window.open(master.address, '_blank')}
                  style={{ border: 'none', background: 'none', padding: '6px 0', cursor: 'pointer', color: 'var(--brand-ink)', fontWeight: 600, fontSize: 15, fontFamily: 'inherit' }}>
                  📍 {t('open_in_map')}
                </button>
              ) : (
                <div style={{ fontSize: 15, padding: '6px 0' }}>📍 {[master.city, master.address].filter(Boolean).join(', ')}</div>
              )
            )}
            {master.phone && (
              <a href={`tel:${master.phone}`} style={{ display: 'block', padding: '6px 0', fontSize: 15, fontWeight: 600, color: 'var(--brand-ink)', textDecoration: 'none' }}>
                📞 {master.phone}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Кнопка записи в браузере (в Telegram — нативная кнопка снизу) */}
      {!inTelegram && services.length > 0 && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 16px 20px', backgroundColor: 'var(--tg-theme-secondary-bg-color)', boxShadow: '0 -4px 16px rgba(0,0,0,0.06)', zIndex: 20 }}>
          <PrimaryButton onClick={startBooking}>{t('btn_online_booking')}</PrimaryButton>
        </div>
      )}

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
              <div style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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