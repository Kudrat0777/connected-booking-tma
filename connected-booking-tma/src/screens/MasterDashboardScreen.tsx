import React, { useState, useEffect } from 'react';
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
  Icon28FavoriteOutline
} from '@vkontakte/icons';

import { fetchMasterBookings, confirmBooking, rejectBooking, fetchMyServices } from '../helpers/api';
import type { Booking, Service } from '../helpers/api';

type Props = {
  telegramId: number;
  onSwitchToClient: () => void;
  onOpenSchedule: () => void;
  onEditProfile: () => void;
  onOpenAnalytics: () => void;
  onOpenReviews: () => void;
};

type Tab = 'bookings' | 'services' | 'profile';
type BookingFilter = 'today' | 'tomorrow' | 'week';

export const MasterDashboardScreen: React.FC<Props> = ({
  telegramId,
  onSwitchToClient,
  onOpenSchedule,
  onEditProfile,
  onOpenAnalytics,
  onOpenReviews // <--- ДЕСТРУКТУРИЗАЦИЯ
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
        <Placeholder header="Нет записей" description="На этот период записей пока нет.">
           <div style={{ fontSize: 40 }}>📅</div>
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
              {b.name || 'Клиент'}
              <div style={{ fontSize: 13, color: 'var(--tgui--hint_color)' }}>
                 {b.service_name}
              </div>
            </Cell>

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
    </div>
  );

  const renderServices = () => (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level="2">Мои услуги</Title>
        <Button size="s" onClick={() => alert('Функция добавления в разработке')}>+ Добавить</Button>
      </div>

      {loadingServices && <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner size="m"/></div>}

      <List style={{ background: 'var(--tgui--secondary_bg_color)' }}>
        {services.map((s) => (
           <Section key={s.id}>
             <Cell
               description={`${s.duration} мин • ${s.price} ₽`}
               multiline
             >
               {s.name}
             </Cell>
           </Section>
        ))}
      </List>
    </div>
  );

  const renderProfile = () => (
     <div style={{ paddingBottom: 100 }}>
        <List style={{ background: 'var(--tgui--secondary_bg_color)' }}>

          <Section header="Мой профиль">
             <Cell
               before={<Icon28EditOutline />}
               onClick={onEditProfile}
               expandable
             >
                Редактировать профиль
             </Cell>
             <Cell
               before={<Icon28StatisticsOutline />}
               onClick={onOpenAnalytics}
               expandable
             >
                Статистика и доходы
             </Cell>
             <Cell
               before={<Icon28FavoriteOutline />}
               onClick={onOpenReviews}
               expandable
             >
                Мои отзывы
             </Cell>
          </Section>

          <Section header="Управление расписанием">
             <Cell
               before={<Icon28CalendarOutline />}
               onClick={onOpenSchedule}
               expandable
             >
                Настроить слоты
             </Cell>
          </Section>

          <Section header="Аккаунт">
             <Cell>
               <Button 
                 mode="filled" 
                 size="l" 
                 stretched 
                 onClick={onSwitchToClient}
                 style={{ background: 'var(--tgui--button_color)' }}
               >
                  Вернуться в режим клиента
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
        <Tabbar.Item 
          text="Календарь" 
          selected={activeTab === 'bookings'} 
          onClick={() => setActiveTab('bookings')}
        >
          <Icon28CalendarOutline />
        </Tabbar.Item>
        <Tabbar.Item 
          text="Услуги" 
          selected={activeTab === 'services'} 
          onClick={() => setActiveTab('services')}
        >
          <Icon28ServicesOutline />
        </Tabbar.Item>
        <Tabbar.Item 
          text="Профиль" 
          selected={activeTab === 'profile'} 
          onClick={() => setActiveTab('profile')}
        >
          <Icon28UserCircleOutline />
        </Tabbar.Item>
      </Tabbar>
    </div>
  );
};