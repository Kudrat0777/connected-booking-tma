import React, { useState, useEffect, useRef } from 'react';
import {
  Tabbar,
  List,
  Section,
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
} from '@telegram-apps/telegram-ui';

import {
  Icon28CalendarOutline,
  Icon28ServicesOutline,
  Icon28UserCircleOutline,
  Icon28EditOutline,
  Icon28StatisticsOutline,
  Icon28FavoriteOutline,
  Icon28DeleteOutline,
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
  onAddService: () => void;
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
  onAddService,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('bookings');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<BookingFilter>('today');
  const [loadingBookings, setLoadingBookings] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [selectedNewServiceId, setSelectedNewServiceId] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [selectedNewSlotId, setSelectedNewSlotId] = useState<string>('');
  const [isCreatingManual, setIsCreatingManual] = useState(false);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [newClientDetails, setNewClientDetails] = useState({ name: '', phone: '' });

  const loadBookings = async () => {
    setLoadingBookings(true);
    try {
      const data = await fetchMasterBookings(telegramId, filter);
      setBookings(data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBookings(false);
    }
  };

  const loadServices = async () => {
    setLoadingServices(true);
    try {
      const data = await fetchMyServices(telegramId);
      setServices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingServices(false);
    }
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
    try {
      await confirmBooking(id);
      loadBookings();
    } catch (e) { alert('Ошибка при подтверждении'); }
  };

  const handleReject = async (id: number) => {
    try {
      await rejectBooking(id);
      loadBookings();
    } catch (e) { alert('Ошибка'); }
  };

  const handleDeleteService = async (id: number) => {
    if (!window.confirm('Удалить эту услугу?')) return;
    try {
      await deleteService(id);
      loadServices();
    } catch (e) { alert('Ошибка при удалении услуги'); }
  };

  const handleLogout = () => { window.location.href = '/'; };

  const handleDeleteAccount = async () => {
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
      if (response.is_new_client) {
        setNewClientDetails({ name: newClientName, phone: newClientPhone });
        setIsShareModalOpen(true);
      } else {
        alert('Запись успешно создана! Клиенту отправлено уведомление.');
      }
    } catch (e: any) {
      alert(e.message || 'Ошибка при создании записи');
    } finally {
      setIsCreatingManual(false);
    }
  };

  const handleShareLink = () => {
    const tg = (window as any).Telegram?.WebApp;
    // ЗАМЕНИТЕ НА ИМЯ ВАШЕГО БОТА (ЕСЛИ ЕСТЬ MINI APP)
    const botUrl = `https://t.me/cbtestconnected_bot?start=master_${telegramId}`;
    const text = `Здравствуйте, ${newClientDetails.name}! Я записал(а) вас на процедуру.\n\nПожалуйста, перейдите по ссылке ниже в мой профиль, чтобы посмотреть детали записи и в будущем записываться самостоятельно:\n\n${botUrl}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(botUrl)}&text=${encodeURIComponent(text)}`;

    if (tg?.openTelegramLink) tg.openTelegramLink(shareUrl);
    else window.open(shareUrl, '_blank');

    setIsShareModalOpen(false);
  };

  // --- НОВЫЙ ДИЗАЙН КАЛЕНДАРЯ (TIMELINE) ---
  const renderBookings = () => {
    // Группируем записи по датам
    const grouped = bookings.reduce((acc: any, b) => {
        const d = new Date(b.slot.time);
        const dateKey = d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(b);
        return acc;
    }, {});

    return (
      <div style={{ paddingBottom: 100, position: 'relative', minHeight: '100%', background: 'var(--tgui--bg_color)' }}>

        {/* Sticky шапка фильтров */}
        <div style={{ padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10, background: 'var(--tgui--bg_color)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <SegmentedControl size="m">
            <SegmentedControl.Item selected={filter === 'today'} onClick={() => setFilter('today')}>
              Сегодня
            </SegmentedControl.Item>
            <SegmentedControl.Item selected={filter === 'tomorrow'} onClick={() => setFilter('tomorrow')}>
              Завтра
            </SegmentedControl.Item>
            <SegmentedControl.Item selected={filter === 'week'} onClick={() => setFilter('week')}>
              Неделя
            </SegmentedControl.Item>
          </SegmentedControl>
        </div>

        {loadingBookings && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size="m"/></div>}

        {!loadingBookings && bookings.length === 0 && (
          <Placeholder header="Нет записей" description="На этот период записей пока нет. Отдыхайте!">
             <LottieIcon src="/stickers/duck_out.json" size={140} />
          </Placeholder>
        )}

        {!loadingBookings && bookings.length > 0 && (
           <div style={{ padding: '0 16px 20px' }}>
              {Object.keys(grouped).map(dateKey => (
                 <div key={dateKey}>
                    {/* Заголовок даты */}
                    <div style={{ fontWeight: 600, fontSize: 16, margin: '24px 0 16px', color: 'var(--tgui--hint_color)', textTransform: 'capitalize' }}>
                       {dateKey}
                    </div>

                    {/* Таймлайн за день */}
                    {grouped[dateKey].map((b: Booking) => {
                        const timeStr = new Date(b.slot.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        const isPending = b.status === 'pending';
                        const isConfirmed = b.status === 'confirmed';

                        return (
                            <div key={b.id} style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                                {/* Время слева */}
                                <div style={{ width: 44, flexShrink: 0, paddingTop: 14, textAlign: 'right', fontWeight: 700, fontSize: 16, color: 'var(--tgui--text_color)' }}>
                                    {timeStr}
                                </div>

                                {/* Карточка записи справа */}
                                <div style={{
                                    flex: 1,
                                    background: 'var(--tgui--secondary_bg_color)',
                                    // Цветная полоса слева: оранжевая для новых, зеленая для подтвержденных
                                    borderLeft: isPending ? '4px solid #FF9F0A' : '4px solid #34C759',
                                    borderRadius: '0 16px 16px 0',
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 14,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                                }}>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <Avatar size={44} src={b.photo_url || undefined} fallbackIcon={<Icon28UserCircleOutline />} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 2, color: 'var(--tgui--text_color)' }}>
                                                {b.client_name || b.name || 'Клиент'}
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--tgui--hint_color)', lineHeight: '1.2' }}>
                                                {b.service_name}
                                            </div>
                                        </div>
                                        {isPending && <span style={{ fontSize: 12, color: '#FF9F0A', fontWeight: 600, background: 'rgba(255, 159, 10, 0.1)', padding: '4px 8px', borderRadius: 6 }}>Новая</span>}
                                    </div>

                                    {/* Блок контактов */}
                                    {(b.client_phone || b.username) && (
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {b.client_phone && (
                                                <a href={`tel:${b.client_phone}`} style={{ flex: 1, textDecoration: 'none', background: 'var(--tgui--bg_color)', padding: '8px', borderRadius: 10, fontSize: 14, color: 'var(--tgui--text_color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 500 }}>
                                                    <Icon28PhoneOutline width={20} height={20} style={{color: 'var(--tgui--button_color)'}}/> Звонок
                                                </a>
                                            )}
                                            {b.username && (
                                                <a href={`https://t.me/${b.username.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ flex: 1, textDecoration: 'none', background: 'var(--tgui--bg_color)', padding: '8px', borderRadius: 10, fontSize: 14, color: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 500 }}>
                                                    Telegram
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {/* Кнопки действий */}
                                    {isPending && (
                                        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                                            <Button size="s" mode="filled" stretched onClick={() => handleConfirm(b.id)}>Принять</Button>
                                            <Button size="s" mode="bezeled" stretched style={{ color: 'var(--tgui--destructive_text_color)' }} onClick={() => { if(window.confirm('Отклонить заявку?')) handleReject(b.id); }}>Отклонить</Button>
                                        </div>
                                    )}

                                    {isConfirmed && new Date(b.slot.time) > new Date() && (
                                        <div style={{ marginTop: 2 }}>
                                            <Button size="s" mode="bezeled" stretched style={{ color: 'var(--tgui--destructive_text_color)', background: 'rgba(255,59,48,0.08)' }} onClick={() => { if(window.confirm('Отменить визит? Слоты освободятся, клиенту придет уведомление.')) handleReject(b.id); }}>
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

        {/* ПЛАВАЮЩАЯ КНОПКА (FAB) ДЛЯ ДОБАВЛЕНИЯ ЗАПИСИ */}
        <div
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            position: 'fixed',
            bottom: 120,
            right: 20,
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: 'var(--tgui--button_color)',
            color: 'var(--tgui--button_text_color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
            cursor: 'pointer',
            zIndex: 100,
            transition: 'transform 0.15s ease',
          }}
          onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
          onPointerUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onPointerLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span style={{ fontSize: 36, lineHeight: '36px', marginTop: -4 }}>+</span>
        </div>
      </div>
    );
  };

  const renderServices = () => (
    <div style={{ paddingBottom: 100, background: 'var(--tgui--bg_color)', minHeight: '100%' }}>
      {/* Шапка с кнопкой добавления */}
      <div style={{
          padding: '20px 16px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          background: 'var(--tgui--bg_color)',
          zIndex: 10,
          borderBottom: '1px solid rgba(0,0,0,0.05)'
      }}>
        <Title level="2" style={{ margin: 0, fontSize: 22, fontWeight: '700' }}>Мои услуги</Title>
        <Button size="s" mode="filled" onClick={onAddService} style={{ borderRadius: 14 }}>
          + Добавить
        </Button>
      </div>

      {loadingServices && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size="m"/></div>}

      {!loadingServices && services.length === 0 && (
         <Placeholder header="Нет услуг" description="Добавьте услуги, чтобы клиенты могли записываться.">
            <LottieIcon src="/stickers/duck_out.json" size={140} />
         </Placeholder>
      )}

      {/* Список услуг */}
      {!loadingServices && services.length > 0 && (
        <div style={{ padding: '16px' }}>
          {services.map((s) => (
             <div
                key={s.id}
                style={{
                   background: 'var(--tgui--secondary_bg_color)',
                   borderRadius: 16,
                   padding: '16px',
                   marginBottom: 12,
                   boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                   position: 'relative'
                }}
             >
                {/* Название услуги */}
                <div style={{
                   fontSize: 17,
                   fontWeight: 600,
                   color: 'var(--tgui--text_color)',
                   marginBottom: 8,
                   paddingRight: 40 // чтобы текст не налезал на кнопку удаления
                }}>
                   {s.name}
                </div>

                {/* Описание (если есть) */}
                {s.description && (
                   <div style={{
                      fontSize: 14,
                      color: 'var(--tgui--hint_color)',
                      marginBottom: 12,
                      lineHeight: '1.4'
                   }}>
                      {s.description}
                   </div>
                )}

                {/* Бейджи цены и времени */}
                <div style={{ display: 'flex', gap: 8 }}>
                   <div style={{
                      background: 'var(--tgui--bg_color)',
                      padding: '6px 10px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--tgui--text_color)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                   }}>
                      🕒 {s.duration} мин
                   </div>

                   <div style={{
                      background: 'rgba(52, 199, 89, 0.1)', // Нежно-зеленый фон
                      color: '#34C759', // Зеленый текст
                      padding: '6px 10px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                   }}>
                      {s.price?.toLocaleString()} сум
                   </div>
                </div>

                {/* Кнопка удаления (Иконка в правом верхнем углу) */}
                <div
                   onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteService(s.id);
                   }}
                   style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'rgba(255, 59, 48, 0.1)', // Нежно-красный фон
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.1s'
                   }}
                   onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
                   onPointerUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                   <Icon28DeleteOutline width={20} height={20} style={{ color: '#FF3B30' }} />
                </div>
             </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
     <div style={{ paddingBottom: 100 }}>
        <List style={{ background: 'var(--tgui--secondary_bg_color)' }}>
          <Section header="Мой профиль">
             <Cell before={<Icon28EditOutline />} onClick={onEditProfile} expandable>Редактировать профиль</Cell>
             <Cell before={<Icon28StatisticsOutline />} onClick={onOpenAnalytics} expandable>Статистика и доходы</Cell>
             <Cell before={<Icon28FavoriteOutline />} onClick={onOpenReviews} expandable>Мои отзывы</Cell>
          </Section>
          <Section header="Управление расписанием">
             <Cell before={<Icon28CalendarOutline />} onClick={onOpenSchedule} expandable>Настроить слоты</Cell>
          </Section>
          <Section header="Аккаунт">
             <Cell>
               <Button mode="filled" size="l" stretched onClick={onSwitchToClient} style={{ background: 'var(--tgui--button_color)' }}>
                  Вернуться в режим клиента
               </Button>
             </Cell>
             <Cell>
                <Button mode="bezeled" size="l" stretched onClick={handleLogoutClick}>Выйти из аккаунта</Button>
             </Cell>
             <Cell>
                <Button mode="bezeled" size="m" stretched onClick={handleDeleteAccount} style={{ color: 'var(--tgui--destructive_text_color)', borderColor: 'var(--tgui--destructive_text_color)' }}>
                    Удалить аккаунт
                </Button>
             </Cell>
          </Section>
        </List>
     </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--tgui--bg_color)' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'bookings' && renderBookings()}
        {activeTab === 'services' && renderServices()}
        {activeTab === 'profile' && renderProfile()}
      </div>

      <Tabbar style={{ zIndex: 1000, position: 'relative' }}>
        <Tabbar.Item text="Календарь" selected={activeTab === 'bookings'} onClick={() => setActiveTab('bookings')}>
          <Icon28CalendarOutline />
        </Tabbar.Item>
        <Tabbar.Item text="Услуги" selected={activeTab === 'services'} onClick={() => setActiveTab('services')}>
          <Icon28ServicesOutline />
        </Tabbar.Item>
        <Tabbar.Item text="Профиль" selected={activeTab === 'profile'} onClick={() => setActiveTab('profile')}>
          <Icon28UserCircleOutline />
        </Tabbar.Item>
      </Tabbar>

      {/* МОДАЛЬНОЕ ОКНО СОЗДАНИЯ ЗАПИСИ */}
      <Modal header={<Modal.Header>Новая запись</Modal.Header>} open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input header="Имя клиента" placeholder="Например, Анна" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
          <Input header="Телефон клиента" placeholder="+7..." value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} />

          <Select header="Услуга" value={selectedNewServiceId} onChange={(e) => setSelectedNewServiceId(e.target.value)}>
            <option value="" disabled hidden>Выберите услугу</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.price?.toLocaleString()} сум)</option>
            ))}
          </Select>

          <Select header="Доступное время (Свободные слоты)" value={selectedNewSlotId} onChange={(e) => setSelectedNewSlotId(e.target.value)} disabled={!selectedNewServiceId || availableSlots.length === 0}>
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

          <div style={{ marginTop: 8 }}>
            <Button size="l" mode="filled" stretched loading={isCreatingManual} onClick={handleManualCreateSubmit}>Записать клиента</Button>
            <Button size="l" mode="plain" stretched onClick={handleCloseCreateModal} style={{ marginTop: 8, color: 'var(--tgui--hint_color)' }}>Отмена</Button>
          </div>
        </div>
      </Modal>

      {/* МОДАЛЬНОЕ ОКНО "ПОДЕЛИТЬСЯ ССЫЛКОЙ" */}
      <Modal header={<Modal.Header>Новый клиент</Modal.Header>} open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, background: 'var(--tgui--secondary_bg_color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Icon28UserCircleOutline width={48} height={48} style={{ color: 'var(--tgui--button_color)' }} />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 20, color: 'var(--tgui--text_color)' }}>Отправить ссылку?</h3>
          <p style={{ margin: '0 0 24px', fontSize: 15, color: 'var(--tgui--hint_color)', lineHeight: '1.4' }}>
            Клиент <b>{newClientDetails.name}</b> ({newClientDetails.phone}) еще не пользуется нашим ботом.<br/><br/>
            Отправьте ему ссылку на ваш профиль в Telegram, чтобы он мог видеть свои записи и записываться сам!
          </p>
          <Button size="l" mode="filled" stretched onClick={handleShareLink}>Поделиться ссылкой</Button>
          <Button size="l" mode="plain" stretched onClick={() => setIsShareModalOpen(false)} style={{ marginTop: 8, color: 'var(--tgui--hint_color)' }}>Не сейчас</Button>
        </div>
      </Modal>

    </div>
  );
};