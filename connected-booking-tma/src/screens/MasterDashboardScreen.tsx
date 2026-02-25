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
  Title
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
  deleteAccount
} from '../helpers/api';
import type { Booking, Service } from '../helpers/api';

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

    // Если мы внутри Telegram, используем красивое нативное окно
    if (tg?.showConfirm) {
      tg.showConfirm('Вы точно хотите выйти из аккаунта мастера?', (isConfirmed: boolean) => {
        if (isConfirmed && onLogout) {
          onLogout();
        }
      });
    } else {
      // Фолбэк для браузера вне Telegram
      const isConfirmed = window.confirm('Вы точно хотите выйти из аккаунта мастера?');
      if (isConfirmed && onLogout) {
        onLogout();
      }
    }
  };

  // --- RENDER CONTENT ---
  const renderBookings = () => (
    <div style={{ paddingBottom: 100 }}>
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
           {/* АНИМАЦИЯ ДЛЯ ЗАПИСЕЙ */}
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

            {/* --- КНОПКА ЗВОНКА (Если есть телефон) --- */}
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

            {/* Actions for Pending */}
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
      <div
        onClick={() => {
          // Пока просто выводим алерт. Позже здесь будет открытие модалки
          alert('Здесь откроется окно добавления клиента!');
        }}
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
          // Легкая анимация при нажатии
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
               description={`${s.duration} мин • ${s.price} ₽`}
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
              {/* АНИМАЦИЯ ДЛЯ УСЛУГ */}
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
    </div>
  );
};