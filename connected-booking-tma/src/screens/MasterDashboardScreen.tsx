import React, { useState, useEffect, useRef } from 'react';
import {
  Tabbar,
  Cell,
  Button,
  Placeholder,
  Spinner,
  SegmentedControl,
  Avatar,
  Title,
  Modal,
  Input,
  Select,
  Text,
  List,
  Section
} from '@telegram-apps/telegram-ui';

import {
  Icon28CalendarOutline,
  Icon28ServicesOutline,
  Icon28UserCircleOutline,
  Icon28EditOutline,
  Icon28StatisticsOutline,
  Icon28FavoriteOutline,
  Icon28PhoneOutline,
  Icon28UserOutline,
  Icon28DoorArrowLeftOutline
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

import { MasterServicesTab } from '../components/MasterServicesTab';
import { MasterCreateServiceScreen } from './MasterCreateServiceScreen';

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
  onAddService?: () => void; // Оставили для совместимости с App.tsx, но использовать будем локальную модалку
  onLogout?: () => void;
};

type Tab = 'bookings' | 'services' | 'profile';
type BookingFilter = 'today' | 'tomorrow' | 'week';

export const MasterDashboardScreen: React.FC<Props> = ({
  telegramId,
  onSwitchToClient,
  onOpenSchedule,
  onEditProfile,
  onOpenAnalytics,
  onOpenReviews,
  onLogout
}) => {
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
    } catch (e) { alert('Ошибка при подтверждении'); }
  };

  const handleReject = async (id: number) => {
    triggerHaptic('warning');
    if (!window.confirm('Отклонить эту запись?')) return;
    try {
      await rejectBooking(id);
      loadBookings();
    } catch (e) { alert('Ошибка'); }
  };

  const handleDeleteService = async (id: number) => {
    triggerHaptic('warning');
    if (!window.confirm('Удалить эту услугу?')) return;
    try {
      await deleteService(id);
      loadServices();
    } catch (e) { alert('Ошибка при удалении услуги'); }
  };

  const handleLogout = () => { window.location.href = '/'; };

  const handleDeleteAccount = async () => {
    triggerHaptic('warning');
    const confirmText = prompt("Чтобы удалить аккаунт и все данные навсегда, введите слово DELETE");
    if (confirmText === 'DELETE') {
        try {
            await deleteAccount(telegramId);
            alert('Аккаунт успешно удален.');
            handleLogout();
        } catch (e) { alert('Ошибка при удалении аккаунта.'); }
    }
  };

  const handleLogoutClick = () => {
    triggerHaptic('warning');
    const isConfirmed = window.confirm('Вы точно хотите выйти из аккаунта мастера?');
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
      alert('Пожалуйста, заполните все поля и выберите время!');
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
        if (tg?.showAlert) tg.showAlert('Запись успешно создана! Клиенту отправлено уведомление.');
        else alert('Запись успешно создана!');
      }
    } catch (e: any) {
      triggerHaptic('warning');
      alert(e.message || 'Ошибка при создании записи');
    } finally {
      setIsCreatingManual(false);
    }
  };

  const handleShareLink = () => {
    const botUrl = `https://t.me/cbtestconnected_bot?start=master_${telegramId}`;
    const text = `Здравствуйте, ${newClientDetails.name}! Я записал(а) вас на процедуру.\n\nПожалуйста, перейдите по ссылке ниже в мой профиль, чтобы посмотреть детали записи и в будущем записываться самостоятельно:`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(botUrl)}&text=${encodeURIComponent(text)}`;

    if (tg?.openTelegramLink) tg.openTelegramLink(shareUrl);
    else window.open(shareUrl, '_blank');

    setIsShareModalOpen(false);
  };

  // --- Вкладка ЗАПИСИ ---
  const renderBookings = () => {
    const grouped = bookings.reduce((acc: any, b) => {
        const d = new Date(b.slot.time);
        const dateKey = d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(b);
        return acc;
    }, {});

    return (
      <div style={{ minHeight: '100%', paddingBottom: 100 }}>

        {/* Фильтры: без черной полосы */}
        <div style={{ padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
          <SegmentedControl>
            <SegmentedControl.Item selected={filter === 'today'} onClick={() => { triggerHaptic(); setFilter('today'); }}>Сегодня</SegmentedControl.Item>
            <SegmentedControl.Item selected={filter === 'tomorrow'} onClick={() => { triggerHaptic(); setFilter('tomorrow'); }}>Завтра</SegmentedControl.Item>
            <SegmentedControl.Item selected={filter === 'week'} onClick={() => { triggerHaptic(); setFilter('week'); }}>Неделя</SegmentedControl.Item>
          </SegmentedControl>
        </div>

        {loadingBookings && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size="m"/></div>}

        {!loadingBookings && bookings.length === 0 && (
          <div style={{ marginTop: 20 }}>
            <Placeholder header="Нет записей" description="На этот период записей пока нет. Отдыхайте!">
               <LottieIcon src="/stickers/duck_out.json" size={140} />
            </Placeholder>
          </div>
        )}

        {!loadingBookings && bookings.length > 0 && (
           <div style={{ padding: '0 16px 20px' }}>
              {Object.keys(grouped).map(dateKey => (
                 <div key={dateKey}>
                    <div style={{ fontWeight: 600, fontSize: 15, margin: '24px 0 12px', color: 'var(--tg-theme-hint-color)', textTransform: 'capitalize' }}>
                       {dateKey}
                    </div>

                    {grouped[dateKey].map((b: Booking) => {
                        const timeStr = new Date(b.slot.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        const isPending = b.status === 'pending';
                        const isConfirmed = b.status === 'confirmed';

                        return (
                            <div key={b.id} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                                <div style={{ width: 44, flexShrink: 0, paddingTop: 14, textAlign: 'right', fontWeight: 700, fontSize: 16, color: 'var(--tg-theme-text-color)' }}>
                                    {timeStr}
                                </div>

                                <div style={{
                                    flex: 1,
                                    backgroundColor: 'var(--tg-theme-bg-color)',
                                    borderLeft: isPending ? '4px solid #FF9500' : '4px solid #34C759',
                                    borderRadius: '0 16px 16px 0',
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 12,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <Avatar size={48} src={b.photo_url || undefined} fallbackIcon={<Icon28UserCircleOutline />} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 2, color: 'var(--tg-theme-text-color)' }}>
                                                {b.client_name || b.name || 'Клиент'}
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
                                                {b.service_name}
                                            </div>
                                        </div>
                                        {isPending && <span style={{ fontSize: 11, color: '#FF9500', fontWeight: 600, backgroundColor: 'rgba(255, 149, 0, 0.1)', padding: '4px 8px', borderRadius: 6 }}>НОВАЯ</span>}
                                    </div>

                                    {(b.client_phone || b.username) && (
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {b.client_phone && (
                                                <a href={`tel:${b.client_phone}`} style={{ flex: 1, textDecoration: 'none', backgroundColor: 'var(--tg-theme-secondary-bg-color)', padding: '8px', borderRadius: 10, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--tg-theme-text-color)', fontWeight: 500 }}>
                                                    <Icon28PhoneOutline width={20} height={20} style={{color: 'var(--tg-theme-button-color)'}}/> Звонок
                                                </a>
                                            )}
                                            {b.username && (
                                                <a href={`https://t.me/${b.username.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ flex: 1, textDecoration: 'none', backgroundColor: 'var(--tg-theme-secondary-bg-color)', padding: '8px', borderRadius: 10, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--tg-theme-text-color)', fontWeight: 500 }}>
                                                    Telegram
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {isPending && (
                                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                            <Button size="s" mode="filled" stretched onClick={() => handleConfirm(b.id)}>Принять</Button>
                                            <Button size="s" mode="bezeled" stretched style={{ color: 'var(--tg-theme-destructive-text-color)' }} onClick={() => handleReject(b.id)}>Отклонить</Button>
                                        </div>
                                    )}
                                    {isConfirmed && new Date(b.slot.time) > new Date() && (
                                        <div style={{ marginTop: 4 }}>
                                            <Button size="s" mode="bezeled" stretched style={{ color: 'var(--tg-theme-destructive-text-color)', backgroundColor: 'rgba(255,59,48,0.08)' }} onClick={() => handleReject(b.id)}>
                                                Отменить визит
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

        {/* ПЛАВАЮЩАЯ КНОПКА (FAB) ДЛЯ ЗАПИСИ КЛИЕНТА */}
        <div
          onClick={() => { triggerHaptic(); setIsCreateModalOpen(true); }}
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
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            zIndex: 100,
          }}
        >
          <span style={{ fontSize: 32, lineHeight: 1, marginTop: -4 }}>+</span>
        </div>
      </div>
    );
  };

  // --- Вкладка ПРОФИЛЬ ---
  const renderProfile = () => (
     <div style={{ minHeight: '100%', paddingBottom: 100 }}>
        <div style={{ padding: '32px 20px 16px' }}>
            <Title level="1" weight="2" style={{ marginBottom: 8, color: 'var(--tg-theme-text-color)' }}>Мой кабинет</Title>
            <Text style={{ color: 'var(--tg-theme-hint-color)', fontSize: 15 }}>
                Управляйте своим профилем, расписанием и настройками.
            </Text>
        </div>

        <List>
            <Section>
                <Cell
                    before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(0, 122, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28EditOutline width={24} height={24} style={{ color: '#007AFF'}} /></div>}
                    onClick={() => { triggerHaptic(); onEditProfile(); }}
                    description="Имя, фото, контакты, портфолио"
                >
                    Редактировать профиль
                </Cell>
                <Cell
                    before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255, 149, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28CalendarOutline width={24} height={24} style={{ color: '#FF9500'}} /></div>}
                    onClick={() => { triggerHaptic(); onOpenSchedule(); }}
                    description="Генерация свободных слотов"
                >
                    Управление расписанием
                </Cell>
            </Section>

            <Section>
                <Cell
                    before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(52, 199, 89, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28StatisticsOutline width={24} height={24} style={{ color: '#34C759'}} /></div>}
                    onClick={() => { triggerHaptic(); onOpenAnalytics(); }}
                >
                    Статистика
                </Cell>
                <Cell
                    before={<div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255, 45, 85, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon28FavoriteOutline width={24} height={24} style={{ color: '#FF2D55'}} /></div>}
                    onClick={() => { triggerHaptic(); onOpenReviews(); }}
                >
                    Мои отзывы
                </Cell>
            </Section>

            <Section header="Система">
                <Cell
                    before={<Icon28UserOutline style={{ color: 'var(--tg-theme-button-color)' }}/>}
                    onClick={() => { triggerHaptic(); onSwitchToClient(); }}
                >
                    Вернуться в режим клиента
                </Cell>
                <Cell
                    before={<Icon28DoorArrowLeftOutline style={{ color: 'var(--tg-theme-destructive-text-color)' }}/>}
                    onClick={handleLogoutClick}
                >
                    <span style={{ color: 'var(--tg-theme-destructive-text-color)' }}>Выйти из аккаунта</span>
                </Cell>
            </Section>

            <div style={{ marginTop: 24, marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
                <Button mode="plain" size="s" onClick={handleDeleteAccount} style={{ color: 'var(--tg-theme-hint-color)' }}>
                    Навсегда удалить аккаунт
                </Button>
            </div>
        </List>
     </div>
  );

  return (
    <div style={{
        position: 'relative',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--tg-theme-secondary-bg-color)' // Общий серый фон для всего дашборда
    }}>
      <main style={{ height: '100%', overflowY: 'auto' }}>
        {activeTab === 'bookings' && renderBookings()}

        {/* ИСПОЛЬЗУЕМ ВЫДЕЛЕННЫЙ КОМПОНЕНТ ДЛЯ УСЛУГ */}
        {activeTab === 'services' && (
            <MasterServicesTab
                services={services}
                loading={loadingServices}
                onAddService={() => setIsCreateServiceModalOpen(true)}
                onDeleteService={handleDeleteService}
                triggerHaptic={triggerHaptic}
            />
        )}

        {activeTab === 'profile' && renderProfile()}
      </main>

      <Tabbar style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 }}>
        <Tabbar.Item text="Календарь" selected={activeTab === 'bookings'} onClick={() => { triggerHaptic(); setActiveTab('bookings'); }}>
          <Icon28CalendarOutline />
        </Tabbar.Item>
        <Tabbar.Item text="Услуги" selected={activeTab === 'services'} onClick={() => { triggerHaptic(); setActiveTab('services'); }}>
          <Icon28ServicesOutline />
        </Tabbar.Item>
        <Tabbar.Item text="Профиль" selected={activeTab === 'profile'} onClick={() => { triggerHaptic(); setActiveTab('profile'); }}>
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
      <Modal header={<Modal.Header>Новая запись</Modal.Header>} open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <div style={{ padding: '0 16px 150px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', maxHeight: '85vh' }}>
          <Input header="Имя клиента" placeholder="Например, Анна" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
          <Input header="Телефон клиента" placeholder="+998 90 000 00 00" type="tel" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} />

          <Select header="Услуга" value={selectedNewServiceId} onChange={(e) => setSelectedNewServiceId(e.target.value)}>
            <option value="" disabled hidden>Выберите услугу</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.price?.toLocaleString()} UZS)</option>
            ))}
          </Select>

          <Select header="Доступное время" value={selectedNewSlotId} onChange={(e) => setSelectedNewSlotId(e.target.value)} disabled={!selectedNewServiceId}>
            <option value="" disabled hidden>
              {!selectedNewServiceId ? 'Сначала выберите услугу' : availableSlots.length === 0 ? 'Нет свободных слотов' : 'Выберите время'}
            </option>
            {availableSlots.map((s) => {
              const d = new Date(s.time);
              const dateStr = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
              const timeStr = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
              return <option key={s.id} value={s.id}>{dateStr} в {timeStr}</option>;
            })}
          </Select>

          <div style={{ marginTop: 16 }}>
            <Button size="l" mode="filled" stretched loading={isCreatingManual} onClick={handleManualCreateSubmit}>Записать клиента</Button>
            <Button size="l" mode="plain" stretched onClick={handleCloseCreateModal} style={{ marginTop: 8 }}>Отмена</Button>
          </div>
        </div>
      </Modal>

      {/* МОДАЛЬНОЕ ОКНО "ПОДЕЛИТЬСЯ ССЫЛКОЙ" */}
      <Modal header={<Modal.Header>Успешно!</Modal.Header>} open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <div style={{ padding: '0 16px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', overflowY: 'auto', maxHeight: '85vh' }}>
          <div style={{ width: 80, height: 80, backgroundColor: 'var(--tg-theme-secondary-bg-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Icon28UserCircleOutline width={48} height={48} style={{ color: 'var(--tg-theme-button-color)' }} />
          </div>
          <Title level="2" style={{ margin: '0 0 8px', color: 'var(--tg-theme-text-color)' }}>Отправить ссылку?</Title>
          <Text style={{ margin: '0 0 24px', color: 'var(--tg-theme-hint-color)', lineHeight: '1.4' }}>
            Клиент <b>{newClientDetails.name}</b> ({newClientDetails.phone}) еще не пользуется нашим ботом.<br/><br/>
            Отправьте ему ссылку на ваш профиль в Telegram, чтобы он мог видеть свои записи и записываться сам!
          </Text>
          <Button size="l" mode="filled" stretched onClick={handleShareLink}>Поделиться ссылкой</Button>
          <Button size="l" mode="plain" stretched onClick={() => setIsShareModalOpen(false)} style={{ marginTop: 8 }}>Не сейчас</Button>
        </div>
      </Modal>

    </div>
  );
};