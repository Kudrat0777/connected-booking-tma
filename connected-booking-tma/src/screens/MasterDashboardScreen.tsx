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
  Icon28CheckCircleOutline,
  Icon28CancelCircleOutline,
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

// --- КОМПОНЕНТ АНИМАЦИИ ---
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

  // --- Bookings State ---
  const [bookings, setBookings] = useState<Booking[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [summary, setSummary] = useState<any>(null);
  const [filter, setFilter] = useState<BookingFilter>('today');
  const [loadingBookings, setLoadingBookings] = useState(false);

  // --- Services State ---
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // --- Create Manual Booking State ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [selectedNewServiceId, setSelectedNewServiceId] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [selectedNewSlotId, setSelectedNewSlotId] = useState<string>('');
  const [isCreatingManual, setIsCreatingManual] = useState(false);

  // --- Share Link Modal State ---
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [newClientDetails, setNewClientDetails] = useState({ name: '', phone: '' });

  // --- LOADERS ---
  const loadBookings = async () => {
    setLoadingBookings(true);
    try {
      const data = await fetchMasterBookings(telegramId, filter);
      setBookings(data.items);
      setSummary(data.summary);
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
  }, [activeTab, filter, telegramId]);

  // Загрузка слотов при выборе услуги в модалке
  useEffect(() => {
    if (selectedNewServiceId) {
      fetchSlotsForService(Number(selectedNewServiceId))
        .then((slots) => {
          // Оставляем только свободные слоты
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

  // --- ACTIONS ---
  const handleConfirm = async (id: number) => {
    try {
      await confirmBooking(id);
      loadBookings();
    } catch (e) {
      alert('Ошибка при подтверждении');
    }
  };

  const handleReject = async (id: number) => {
    if (!window.confirm('Отклонить запись?')) return;
    try {
      await rejectBooking(id);
      loadBookings();
    } catch (e) {
      alert('Ошибка при отклонении');
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!window.confirm('Удалить эту услугу?')) return;
    try {
      await deleteService(id);
      loadServices();
    } catch (e) {
      console.error(e);
      alert('Ошибка при удалении услуги');
    }
  };

  const handleLogout = () => {
    window.location.href = '/';
  };

  const handleDeleteAccount = async () => {
    const confirmText = prompt("Чтобы удалить аккаунт и все данные навсегда, введите слово DELETE");
    if (confirmText === 'DELETE') {
        try {
            await deleteAccount(telegramId);
            alert('Аккаунт успешно удален.');
            handleLogout();
        } catch (e) {
            alert('Ошибка при удалении аккаунта.');
            console.error(e);
        }
    }
  };

  const handleLogoutClick = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.showConfirm) {
      tg.showConfirm('Вы точно хотите выйти из аккаунта мастера?', (isConfirmed: boolean) => {
        if (isConfirmed && onLogout) {
          onLogout();
        }
      });
    } else {
      const isConfirmed = window.confirm('Вы точно хотите выйти из аккаунта мастера?');
      if (isConfirmed && onLogout) {
        onLogout();
      }
    }
  };

  // --- MANUAL BOOKING ACTIONS ---
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
      // Отправляем запрос на сервер
      const response = await createManualBooking(
        Number(selectedNewSlotId),
        newClientName,
        newClientPhone
      );

      // Закрываем модалку создания
      handleCloseCreateModal();
      // Обновляем список записей
      loadBookings();

      // Если клиент НОВЫЙ (не найден в базе), открываем окно шеринга
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
    // Формируем ссылку на бота с параметром deep link (master_ID)
    const botUrl = `https://t.me/ConnectedTimeBot?start=master_${telegramId}`;

    const text = `Здравствуйте, ${newClientDetails.name}! Я записал(а) вас на процедуру.\n\nПожалуйста, перейдите по ссылке ниже в мой профиль, чтобы посмотреть детали записи и в будущем записываться самостоятельно:\n\n${botUrl}`;

    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(botUrl)}&text=${encodeURIComponent(text)}`;

    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }

    setIsShareModalOpen(false); // Закрываем окно после отправки
  };

  // --- RENDER CONTENT ---
  const renderBookings = () => (
    <div style={{ paddingBottom: 100, position: 'relative', minHeight: '100%' }}>
      <div style={{ padding: '10px 16px' }}>
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

      {loadingBookings && <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner size="m"/></div>}

      {!loadingBookings && bookings.length === 0 && (
        <Placeholder
            header="Нет записей"
            description="На этот период записей пока нет. Отдыхайте!"
        >
           <LottieIcon src="/stickers/duck_out.json" size={140} />
        </Placeholder>
      )}

      <List style={{ background: 'var(--tgui--secondary_bg_color)' }}>
        {bookings.map((b) => (
          <Section key={b.id} footer={
             b.status === 'pending' ?
             "Клиент ждет подтверждения" :
             (b.status === 'confirmed' ? "Запись подтверждена" : "Запись отклонена")
          }>
            <Cell
              before={<Avatar size={40} src={b.photo_url || undefined} fallbackIcon={<Icon28UserCircleOutline />} />}
              description={`Время: ${new Date(b.slot.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
              after={
                b.status === 'pending' && <span style={{color: 'orange', fontSize: 12}}>Ожидание</span>
              }
            >
              {b.client_name || b.name || 'Клиент'}
              <div style={{ fontSize: 13, color: 'var(--tgui--hint_color)' }}>
                 {b.service_name}
              </div>
            </Cell>

            {b.client_phone && (
                <Cell>
                    <Button
                        mode="bezeled"
                        size="s"
                        before={<Icon28PhoneOutline />}
                        component="a"
                        // @ts-ignore
                        href={`tel:${b.client_phone}`}
                        stretched
                    >
                        Позвонить {b.client_phone}
                    </Button>
                </Cell>
            )}
            {b.username && (
                <Cell>
                       <Button
                           mode="plain"
                           size="s"
                           component="a"
                           // @ts-ignore
                           href={`https://t.me/${b.username.replace('@', '')}`}
                           target="_blank"
                           stretched
                           style={{ color: 'var(--tgui--link_color)' }}
                       >
                           Написать @{b.username.replace('@', '')}
                       </Button>
                </Cell>
            )}

            {b.status === 'pending' && (
              <Cell>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button
                    size="m"
                    mode="filled"
                    stretched
                    before={<Icon28CheckCircleOutline />}
                    onClick={() => handleConfirm(b.id)}
                  >
                    Принять
                  </Button>
                  <Button
                    size="m"
                    mode="bezeled"
                    stretched
                    before={<Icon28CancelCircleOutline />}
                    onClick={() => handleReject(b.id)}
                    style={{ color: 'var(--tgui--destructive_text_color)' }}
                  >
                    Отклонить
                  </Button>
                </div>
              </Cell>
            )}
          </Section>
        ))}
      </List>

      {/* ПЛАВАЮЩАЯ КНОПКА (FAB) ДЛЯ ДОБАВЛЕНИЯ ЗАПИСИ */}
      <div
        onClick={() => setIsCreateModalOpen(true)}
        style={{
          position: 'fixed',
          bottom: 120,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: 'var(--tgui--button_color)',
          color: 'var(--tgui--button_text_color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          zIndex: 100,
          transition: 'transform 0.1s',
        }}
        onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
        onPointerUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        onPointerLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <span style={{ fontSize: 32, lineHeight: '32px', marginTop: -2 }}>+</span>
      </div>
    </div>
  );

  const renderServices = () => (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level="2">Мои услуги</Title>
        <Button size="s" onClick={onAddService}>+ Добавить</Button>
      </div>

      {loadingServices && <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner size="m"/></div>}

      <List style={{ background: 'var(--tgui--secondary_bg_color)' }}>
        {services.map((s) => (
           <Section key={s.id}>
             <Cell
               description={`${s.duration} мин • ${s.price} сум`}
               multiline
               after={
                  <Button
                    mode="bezeled"
                    size="s"
                    style={{ color: 'var(--tgui--destructive_text_color)' }}
                    onClick={(e) => {
                       e.stopPropagation();
                       handleDeleteService(s.id);
                    }}
                  >
                    <Icon28DeleteOutline />
                  </Button>
               }
             >
               {s.name}
             </Cell>
           </Section>
        ))}

        {services.length === 0 && !loadingServices && (
           <Placeholder
             header="Нет услуг"
             description="Добавьте услуги, чтобы клиенты могли записываться."
           >
              <LottieIcon src="/stickers/duck_out.json" size={140} />
           </Placeholder>
        )}
      </List>
    </div>
  );

  const renderProfile = () => (
     <div style={{ paddingBottom: 100 }}>
        <List style={{ background: 'var(--tgui--secondary_bg_color)' }}>
          <Section header="Мой профиль">
             <Cell before={<Icon28EditOutline />} onClick={onEditProfile} expandable>
                Редактировать профиль
             </Cell>
             <Cell before={<Icon28StatisticsOutline />} onClick={onOpenAnalytics} expandable>
                Статистика и доходы
             </Cell>
             <Cell before={<Icon28FavoriteOutline />} onClick={onOpenReviews} expandable>
                Мои отзывы
             </Cell>
          </Section>

          <Section header="Управление расписанием">
             <Cell before={<Icon28CalendarOutline />} onClick={onOpenSchedule} expandable>
                Настроить слоты
             </Cell>
          </Section>

          <Section header="Аккаунт">
             <Cell>
               <Button
                 mode="filled" size="l" stretched onClick={onSwitchToClient}
                 style={{ background: 'var(--tgui--button_color)' }}
               >
                  Вернуться в режим клиента
               </Button>
             </Cell>
             <Cell>
                <Button mode="bezeled" size="l" stretched onClick={handleLogoutClick}>
                    Выйти из аккаунта
                </Button>
             </Cell>
             <Cell>
                <Button
                    mode="bezeled" size="m" stretched onClick={handleDeleteAccount}
                    style={{ color: 'var(--tgui--destructive_text_color)', borderColor: 'var(--tgui--destructive_text_color)' }}
                >
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
      <Tabbar>
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
      <Modal
        header={<Modal.Header>Новая запись</Modal.Header>}
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      >
        <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <Input
            header="Имя клиента"
            placeholder="Например, Анна"
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
          />

          <Input
            header="Телефон клиента"
            placeholder="+7..."
            value={newClientPhone}
            onChange={(e) => setNewClientPhone(e.target.value)}
          />

          <Select
            header="Услуга"
            value={selectedNewServiceId}
            onChange={(e) => setSelectedNewServiceId(e.target.value)}
          >
            <option value="" disabled hidden>Выберите услугу</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.price} сум)
              </option>
            ))}
          </Select>

          <Select
            header="Доступное время (Свободные слоты)"
            value={selectedNewSlotId}
            onChange={(e) => setSelectedNewSlotId(e.target.value)}
            disabled={!selectedNewServiceId || availableSlots.length === 0}
          >
            <option value="" disabled hidden>
              {!selectedNewServiceId
                ? 'Сначала выберите услугу'
                : availableSlots.length === 0
                  ? 'Нет свободных слотов'
                  : 'Выберите время'}
            </option>
            {availableSlots.map((s) => {
              const d = new Date(s.time);
              const dateStr = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
              const timeStr = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
              return (
                <option key={s.id} value={s.id}>
                  {dateStr} в {timeStr}
                </option>
              );
            })}
          </Select>

          <div style={{ marginTop: 8 }}>
            <Button
              size="l"
              mode="filled"
              stretched
              loading={isCreatingManual}
              onClick={handleManualCreateSubmit}
            >
              Записать клиента
            </Button>
            <Button
              size="l"
              mode="plain"
              stretched
              onClick={handleCloseCreateModal}
              style={{ marginTop: 8, color: 'var(--tgui--hint_color)' }}
            >
              Отмена
            </Button>
          </div>
        </div>
      </Modal>

      {/* МОДАЛЬНОЕ ОКНО "ПОДЕЛИТЬСЯ ССЫЛКОЙ" (Для новых клиентов) */}
      <Modal
        header={<Modal.Header>Новый клиент</Modal.Header>}
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
      >
        <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>

          <div style={{ width: 80, height: 80, background: 'var(--tgui--secondary_bg_color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Icon28UserCircleOutline width={48} height={48} style={{ color: 'var(--tgui--button_color)' }} />
          </div>

          <h3 style={{ margin: '0 0 8px', fontSize: 20, color: 'var(--tgui--text_color)' }}>
            Отправить ссылку?
          </h3>

          <p style={{ margin: '0 0 24px', fontSize: 15, color: 'var(--tgui--hint_color)', lineHeight: '1.4' }}>
            Клиент <b>{newClientDetails.name}</b> ({newClientDetails.phone}) еще не пользуется нашим ботом.<br/><br/>
            Отправьте ему ссылку на ваш профиль в Telegram, чтобы он мог видеть свои записи и записываться сам!
          </p>

          <Button
            size="l"
            mode="filled"
            stretched
            onClick={handleShareLink}
          >
            Поделиться ссылкой
          </Button>

          <Button
            size="l"
            mode="plain"
            stretched
            onClick={() => setIsShareModalOpen(false)}
            style={{ marginTop: 8, color: 'var(--tgui--hint_color)' }}
          >
            Не сейчас
          </Button>

        </div>
      </Modal>

    </div>
  );
};