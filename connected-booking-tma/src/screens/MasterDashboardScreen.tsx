import React, { useState, useEffect, useRef } from 'react';
import {
  Tabbar,
  Button,
  Placeholder,
  Spinner,
  Avatar,
  Title,
  Modal,
  Input,
  Select,
  Text,
} from '@telegram-apps/telegram-ui';

import {
  Icon28CalendarOutline,
  Icon28ServicesOutline,
  Icon28UserCircleOutline,
  Icon28PhoneOutline
} from '@vkontakte/icons';
import lottie from 'lottie-web';

import {
  fetchMasterBookings,
  confirmBooking,
  rejectBooking,
  fetchMyServices,
  deleteService,
  deleteAccount,
  fetchSlotsForService,
  createManualBooking,
} from '../helpers/api';

import type { Booking, Service, Slot } from '../helpers/api';

// ИМПОРТИРУЕМ НАШИ ВЫДЕЛЕННЫЕ ТАБЫ И МОДАЛКИ
import { MasterServicesTab } from '../components/MasterServicesTab';
import { MasterProfileTab } from '../components/MasterProfileTab';
import { MasterCreateServiceScreen } from './MasterCreateServiceScreen';

// ИМПОРТИРУЕМ ХУК ЛОКАЛИЗАЦИИ
import { useLanguage } from '../helpers/LanguageContext';

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
  telegramId: number;
  onSwitchToClient: () => void;
  onOpenSchedule: () => void;
  onEditProfile: () => void;
  onOpenAnalytics: () => void;
  onOpenReviews: () => void;
  onAddService?: () => void;
  onLogout?: () => void;
};

type Tab = 'bookings' | 'services' | 'profile';
type BookingFilter = 'today' | 'tomorrow' | 'week' | 'all';

export const MasterDashboardScreen: React.FC<Props> = ({
  telegramId,
  onSwitchToClient,
  onOpenSchedule,
  onEditProfile,
  onOpenAnalytics,
  onOpenReviews,
  onLogout
}) => {
  // ПОДКЛЮЧАЕМ ПЕРЕВОДЫ
  const { t, lang } = useLanguage();

  const PERIODS = [
    { id: 'today', label: t('m_filter_today') },
    { id: 'tomorrow', label: t('m_filter_tomorrow') },
    { id: 'week', label: t('m_filter_week') },
    { id: 'all', label: t('m_filter_all') },
  ];

  const [activeTab, setActiveTab] = useState<Tab>('bookings');

  // Состояния для записей
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<BookingFilter>('today');
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Состояния для услуг
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [isCreateServiceModalOpen, setIsCreateServiceModalOpen] = useState(false);

  // Состояния для ручного создания записи
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [selectedNewServiceId, setSelectedNewServiceId] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [selectedNewSlotId, setSelectedNewSlotId] = useState<string>('');
  const [isCreatingManual, setIsCreatingManual] = useState(false);

  // Состояние для шеринга
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [newClientDetails, setNewClientDetails] = useState({ name: '', phone: '' });

  const tg = (window as any).Telegram?.WebApp;

  const triggerHaptic = (type: 'light' | 'selection' | 'success' | 'warning' = 'selection') => {
    if (tg?.HapticFeedback) {
        if (type === 'success' || type === 'warning') {
            tg.HapticFeedback.notificationOccurred(type);
        } else if (type === 'light') {
            tg.HapticFeedback.impactOccurred('light');
        } else {
            tg.HapticFeedback.selectionChanged();
        }
    }
  };

  useEffect(() => {
    if (tg) {
        tg.BackButton.hide();
        tg.expand();
    }
  }, [tg, activeTab]);

  const loadBookings = async () => {
    setLoadingBookings(true);
    try {
      const data = await fetchMasterBookings(telegramId, filter);
      setBookings(data.items);
    } catch (e) { console.error(e); }
    finally { setLoadingBookings(false); }
  };

  const loadServices = async () => {
    setLoadingServices(true);
    try {
      const data = await fetchMyServices(telegramId);
      setServices(data);
    } catch (e) { console.error(e); }
    finally { setLoadingServices(false); }
  };

  useEffect(() => {
    if (activeTab === 'bookings') loadBookings();
    if (activeTab === 'services') loadServices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filter, telegramId]);

  useEffect(() => {
    if (selectedNewServiceId) {
      fetchSlotsForService(Number(selectedNewServiceId))
        .then((slots) => {
          const freeSlots = slots.filter((s) => !s.is_booked);
          setAvailableSlots(freeSlots);
          setSelectedNewSlotId('');
        })
        .catch(console.error);
    } else {
      setAvailableSlots([]);
      setSelectedNewSlotId('');
    }
  }, [selectedNewServiceId]);

  const handleConfirm = async (id: number) => {
    triggerHaptic('light');
    try {
      await confirmBooking(id);
      triggerHaptic('success');
      loadBookings();
    } catch (e) { alert(t('m_confirm_error')); }
  };

  const handleReject = async (id: number) => {
    triggerHaptic('warning');
    if (!window.confirm(t('m_reject_confirm'))) return;
    try {
      await rejectBooking(id);
      loadBookings();
    } catch (e) { alert('Error'); }
  };

  const handleDeleteService = async (id: number) => {
    triggerHaptic('warning');
    if (!window.confirm(t('m_delete_service_confirm'))) return;
    try {
      await deleteService(id);
      loadServices();
    } catch (e) { alert(t('m_delete_service_error')); }
  };

  const handleLogout = () => { window.location.href = '/'; };

  const handleDeleteAccount = async () => {
    triggerHaptic('warning');
    const confirmText = prompt(t('m_delete_account_prompt'));
    if (confirmText === 'DELETE') {
        try {
            await deleteAccount(telegramId);
            alert(t('m_delete_account_success'));
            handleLogout();
        } catch (e) { alert(t('m_delete_account_error')); }
    }
  };

  const handleLogoutClick = () => {
    triggerHaptic('warning');
    const isConfirmed = window.confirm(t('m_logout_confirm'));
    if (isConfirmed && onLogout) onLogout();
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setNewClientName('');
    setNewClientPhone('');
    setSelectedNewServiceId('');
    setSelectedNewSlotId('');
    setAvailableSlots([]);
  };

  const handleManualCreateSubmit = async () => {
    if (!newClientName.trim() || !newClientPhone.trim() || !selectedNewServiceId || !selectedNewSlotId) {
      alert(t('m_fill_all_fields'));
      return;
    }

    setIsCreatingManual(true);
    try {
      const response = await createManualBooking(Number(selectedNewSlotId), newClientName, newClientPhone);
      handleCloseCreateModal();
      loadBookings();
      triggerHaptic('success');

      if (response.is_new_client) {
        setNewClientDetails({ name: newClientName, phone: newClientPhone });
        setIsShareModalOpen(true);
      } else {
        if (tg?.showAlert) tg.showAlert(t('m_booking_created_notify'));
        else alert(t('m_booking_created'));
      }
    } catch (e: any) {
      triggerHaptic('warning');
      alert(e.message || t('m_create_error'));
    } finally {
      setIsCreatingManual(false);
    }
  };

  const handleShareLink = () => {
    const botUrl = `https://t.me/ConnectedTimeBot?start=master_${telegramId}`;
    const text = t('m_share_message');
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(botUrl)}&text=${encodeURIComponent(text)}`;

    if (tg?.openTelegramLink) tg.openTelegramLink(shareUrl);
    else window.open(shareUrl, '_blank');

    setIsShareModalOpen(false);
  };

  const localeForDate = lang === 'uz' ? 'uz-UZ' : (lang === 'en' ? 'en-US' : 'ru-RU');

  // --- Вкладка ЗАПИСИ (Дизайн Timeline) ---
  const renderBookings = () => {
    const grouped = bookings.reduce((acc: any, b) => {
        const d = new Date(b.slot.time);
        const dateKey = d.toLocaleDateString(localeForDate, { weekday: 'long', day: 'numeric', month: 'long' });
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(b);
        return acc;
    }, {});

    return (
      <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', minHeight: '100%', paddingBottom: 100 }}>

        {/* СКРЫТЫЙ СКРОЛЛБАР */}
        <style>{`
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>

        {/* ГОРИЗОНТАЛЬНЫЕ ФИЛЬТРЫ (ЧИПСЫ) */}
        <div style={{ padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--tg-theme-secondary-bg-color)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <div className="hide-scrollbar" style={{ display: 'flex', overflowX: 'auto', gap: 8 }}>
            {PERIODS.map(p => {
              const isActive = filter === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => { triggerHaptic('light'); setFilter(p.id as BookingFilter); }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 20,
                    backgroundColor: isActive ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-bg-color)',
                    color: isActive ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-text-color)',
                    fontSize: 14,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 4px 12px rgba(var(--tg-theme-button-color-rgb), 0.3)' : '0 2px 8px rgba(0,0,0,0.04)'
                  }}
                >
                  {p.label}
                </div>
              );
            })}
          </div>
        </div>

        {loadingBookings && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size="m"/></div>}

        {!loadingBookings && bookings.length === 0 && (
          <div style={{ marginTop: 40 }}>
            <Placeholder header={t('m_no_bookings')} description={t('m_no_bookings_desc')}>
               <LottieIcon src="/stickers/duck_out.json" size={140} />
            </Placeholder>
          </div>
        )}

        {!loadingBookings && bookings.length > 0 && (
           <div style={{ padding: '0 16px 20px', position: 'relative' }}>
              {Object.keys(grouped).map((dateKey) => (
                 <div key={dateKey} style={{ animation: 'fadeIn 0.3s ease' }}>

                    <div style={{
                        fontWeight: 600,
                        fontSize: 14,
                        margin: '24px 0 16px',
                        color: 'var(--tg-theme-hint-color)',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                    }}>
                       {dateKey}
                       <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.05)' }} />
                    </div>

                    {grouped[dateKey].map((b: Booking, index: number) => {
                        const bookingTime = new Date(b.slot.time);
                        const isPast = bookingTime < new Date();

                        const isPending = b.status === 'pending';
                        const isRejected = b.status === 'rejected';
                        const isConfirmed = b.status === 'confirmed';

                        const isCompleted = isConfirmed && isPast;
                        const isFutureConfirmed = isConfirmed && !isPast;

                        const timeStr = bookingTime.toLocaleTimeString(localeForDate, {hour: '2-digit', minute:'2-digit', hour12: false});

                        return (
                            <div key={b.id} style={{ display: 'flex', gap: 16, marginBottom: 16, position: 'relative', opacity: isRejected ? 0.6 : 1 }}>

                                {/* TIMELINE ЛИНИЯ И ВРЕМЯ */}
                                <div style={{ width: 44, flexShrink: 0, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{
                                        fontWeight: 700,
                                        fontSize: 16,
                                        color: isRejected ? 'var(--tg-theme-hint-color)' : 'var(--tg-theme-text-color)',
                                        marginTop: 2,
                                        textDecoration: isRejected ? 'line-through' : 'none'
                                    }}>
                                        {timeStr}
                                    </div>
                                    {index !== grouped[dateKey].length - 1 && (
                                        <div style={{ width: 2, flex: 1, backgroundColor: isPending ? '#FF9500' : 'rgba(0,0,0,0.1)', marginTop: 8, borderRadius: 2 }} />
                                    )}
                                </div>

                                {/* КАРТОЧКА ЗАПИСИ */}
                                <div style={{
                                    flex: 1,
                                    backgroundColor: 'var(--tg-theme-bg-color)',
                                    borderRadius: 16,
                                    padding: '16px',
                                    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                                    borderLeft: isPending ? '4px solid #FF9500' : (isRejected ? '4px solid #FF3B30' : '4px solid transparent'),
                                    filter: isCompleted ? 'grayscale(100%)' : 'none'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: (isPending || !isCompleted) ? 12 : 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <Avatar size={44} src={b.photo_url || undefined} fallbackIcon={<Icon28UserCircleOutline />} />
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--tg-theme-text-color)' }}>
                                                    {b.client_name || b.name || t('m_share_link_desc_1')}
                                                </div>
                                                <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginTop: 2 }}>
                                                    {b.service_name} • {b.slot.service.duration} {t('min')}
                                                </div>
                                            </div>
                                        </div>

                                        {/* БЕЙДЖИКИ СТАТУСА */}
                                        {isPending && (
                                            <div style={{ fontSize: 11, color: '#FF9500', fontWeight: 700, backgroundColor: 'rgba(255, 149, 0, 0.1)', padding: '4px 8px', borderRadius: 8, whiteSpace: 'nowrap' }}>
                                                {t('m_status_new')}
                                            </div>
                                        )}
                                        {isFutureConfirmed && (
                                            <div style={{ fontSize: 11, color: '#34C759', fontWeight: 700, backgroundColor: 'rgba(52, 199, 89, 0.1)', padding: '4px 8px', borderRadius: 8, whiteSpace: 'nowrap' }}>
                                                {t('m_status_confirmed')}
                                            </div>
                                        )}
                                        {isCompleted && (
                                            <div style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)', fontWeight: 700, backgroundColor: 'var(--tg-theme-secondary-bg-color)', padding: '4px 8px', borderRadius: 8, whiteSpace: 'nowrap' }}>
                                                {t('m_status_completed')}
                                            </div>
                                        )}
                                        {isRejected && (
                                            <div style={{ fontSize: 11, color: '#FF3B30', fontWeight: 700, backgroundColor: 'rgba(255, 59, 48, 0.1)', padding: '4px 8px', borderRadius: 8, whiteSpace: 'nowrap' }}>
                                                {t('m_status_rejected')}
                                            </div>
                                        )}
                                    </div>

                                    {/* КНОПКИ СВЯЗИ С КЛИЕНТОМ */}
                                    {(b.client_phone || b.username) && !isCompleted && !isRejected && (
                                        <div style={{ display: 'flex', gap: 8, marginBottom: isPending ? 12 : 0 }}>
                                            {b.client_phone && (
                                                <a href={`tel:${b.client_phone}`} style={{ textDecoration: 'none', backgroundColor: 'var(--tg-theme-secondary-bg-color)', padding: '6px 12px', borderRadius: 8, color: 'var(--tg-theme-text-color)', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <Icon28PhoneOutline width={18} height={18} style={{color: 'var(--tg-theme-button-color)'}}/> {t('m_call')}
                                                </a>
                                            )}
                                            {b.username && (
                                                <a href={`https://t.me/${b.username.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', backgroundColor: 'var(--tg-theme-secondary-bg-color)', padding: '6px 12px', borderRadius: 8, color: 'var(--tg-theme-button-color)', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    Telegram
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {/* КНОПКИ ДЕЙСТВИЙ (ПРИНЯТЬ / ОТКЛОНИТЬ) */}
                                    {isPending && (
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <Button size="m" mode="filled" stretched onClick={() => handleConfirm(b.id)}>
                                                {t('m_btn_accept')}
                                            </Button>
                                            <Button size="m" mode="bezeled" stretched style={{ color: 'var(--tg-theme-destructive-text-color)' }} onClick={() => handleReject(b.id)}>
                                                {t('m_btn_reject')}
                                            </Button>
                                        </div>
                                    )}

                                    {/* КНОПКА ОТМЕНЫ */}
                                    {isFutureConfirmed && (
                                        <div style={{ marginTop: 12 }}>
                                            <Button size="s" mode="plain" stretched style={{ color: 'var(--tg-theme-hint-color)', padding: 0, height: 'auto', justifyContent: 'flex-start' }} onClick={() => handleReject(b.id)}>
                                                {t('m_btn_cancel_booking')}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                 </div>
              ))}
           </div>
        )}

        {/* ПЛАВАЮЩАЯ КНОПКА (FAB) ДЛЯ РУЧНОЙ ЗАПИСИ КЛИЕНТА */}
        <div
          onClick={() => { triggerHaptic('light'); setIsCreateModalOpen(true); }}
          style={{
            position: 'fixed',
            bottom: 90,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(var(--tg-theme-button-color-rgb), 0.4)',
            cursor: 'pointer',
            zIndex: 100,
            transition: 'transform 0.1s ease',
          }}
          onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
          onPointerUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onPointerLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span style={{ fontSize: 32, lineHeight: 1, marginTop: -4 }}>+</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{
        position: 'relative',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--tg-theme-secondary-bg-color)'
    }}>
      <main style={{ height: '100%', overflowY: 'auto' }}>
        {activeTab === 'bookings' && renderBookings()}

        {activeTab === 'services' && (
            <MasterServicesTab
                services={services}
                loading={loadingServices}
                onAddService={() => setIsCreateServiceModalOpen(true)}
                onDeleteService={handleDeleteService}
                triggerHaptic={triggerHaptic}
            />
        )}

        {activeTab === 'profile' && (
            <MasterProfileTab
                telegramId={telegramId}
                onEditProfile={onEditProfile}
                onOpenSchedule={onOpenSchedule}
                onOpenAnalytics={onOpenAnalytics}
                onOpenReviews={onOpenReviews}
                onSwitchToClient={onSwitchToClient}
                onLogoutClick={handleLogoutClick}
                onDeleteAccount={handleDeleteAccount}
                triggerHaptic={triggerHaptic}
            />
        )}
      </main>

      {/* НИЖНИЙ TABBAR */}
      <Tabbar style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100, boxShadow: '0 -1px 0 rgba(0,0,0,0.05)' }}>
        <Tabbar.Item text={t('m_tab_calendar')} selected={activeTab === 'bookings'} onClick={() => { triggerHaptic('light'); setActiveTab('bookings'); }}>
          <Icon28CalendarOutline />
        </Tabbar.Item>
        <Tabbar.Item text={t('m_tab_services')} selected={activeTab === 'services'} onClick={() => { triggerHaptic('light'); setActiveTab('services'); }}>
          <Icon28ServicesOutline />
        </Tabbar.Item>
        <Tabbar.Item text={t('m_tab_profile')} selected={activeTab === 'profile'} onClick={() => { triggerHaptic('light'); setActiveTab('profile'); }}>
          <Icon28UserCircleOutline />
        </Tabbar.Item>
      </Tabbar>

      {/* ---------------- МОДАЛКИ ---------------- */}

      {/* МОДАЛЬНОЕ ОКНО "НОВАЯ УСЛУГА" */}
      <MasterCreateServiceScreen
          telegramId={telegramId}
          isOpen={isCreateServiceModalOpen}
          onClose={() => setIsCreateServiceModalOpen(false)}
          onSuccess={() => {
              setIsCreateServiceModalOpen(false);
              loadServices();
          }}
      />

      {/* МОДАЛЬНОЕ ОКНО СОЗДАНИЯ ЗАПИСИ (РУЧНОЕ ДОБАВЛЕНИЕ КЛИЕНТА) */}
      <Modal header={<Modal.Header>{t('m_modal_create_title')}</Modal.Header>} open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <div style={{ padding: '0 16px 150px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', maxHeight: '85vh' }}>
          <Input header={t('m_client_name')} placeholder={t('m_client_name_placeholder')} value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
          <Input header={t('m_client_phone')} placeholder="+998 90 000 00 00" type="tel" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} />

          <Select header={t('m_service')} value={selectedNewServiceId} onChange={(e) => setSelectedNewServiceId(e.target.value)}>
            <option value="" disabled hidden>{t('m_select_service')}</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.price?.toLocaleString()} UZS)</option>
            ))}
          </Select>

          <Select header={t('m_select_time')} value={selectedNewSlotId} onChange={(e) => setSelectedNewSlotId(e.target.value)} disabled={!selectedNewServiceId}>
            <option value="" disabled hidden>
              {!selectedNewServiceId ? t('m_select_service_first') : availableSlots.length === 0 ? t('m_no_free_slots') : t('m_select_time')}
            </option>
            {availableSlots.map((s) => {
              const d = new Date(s.time);
              const dateStr = d.toLocaleDateString(localeForDate, { day: '2-digit', month: '2-digit' });
              const timeStr = d.toLocaleTimeString(localeForDate, { hour: '2-digit', minute: '2-digit', hour12: false });
              return <option key={s.id} value={s.id}>{dateStr} {t('at_time')} {timeStr}</option>;
            })}
          </Select>

          <div style={{ marginTop: 16 }}>
            <Button size="l" mode="filled" stretched loading={isCreatingManual} onClick={handleManualCreateSubmit}>{t('m_btn_book_client')}</Button>
            <Button size="l" mode="plain" stretched onClick={handleCloseCreateModal} style={{ marginTop: 8 }}>{t('m_btn_cancel')}</Button>
          </div>
        </div>
      </Modal>

      {/* МОДАЛЬНОЕ ОКНО "ПОДЕЛИТЬСЯ ССЫЛКОЙ" */}
      <Modal header={<Modal.Header>{t('m_modal_success_title')}</Modal.Header>} open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <div style={{ padding: '0 16px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', overflowY: 'auto', maxHeight: '85vh' }}>
          <div style={{ width: 80, height: 80, backgroundColor: 'var(--tg-theme-secondary-bg-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Icon28UserCircleOutline width={48} height={48} style={{ color: 'var(--tg-theme-button-color)' }} />
          </div>
          <Title level="2" style={{ margin: '0 0 8px', color: 'var(--tg-theme-text-color)' }}>{t('m_share_link_title')}</Title>
          <Text style={{ margin: '0 0 24px', color: 'var(--tg-theme-hint-color)', lineHeight: '1.4' }}>
            {t('m_share_link_desc_1')} <b>{newClientDetails.name}</b> ({newClientDetails.phone}) {t('m_share_link_desc_2')}<br/><br/>
            {t('m_share_link_desc_3')}
          </Text>
          <Button size="l" mode="filled" stretched onClick={handleShareLink}>{t('m_btn_share_link')}</Button>
          <Button size="l" mode="plain" stretched onClick={() => setIsShareModalOpen(false)} style={{ marginTop: 8 }}>{t('m_btn_not_now')}</Button>
        </div>
      </Modal>

    </div>
  );
};