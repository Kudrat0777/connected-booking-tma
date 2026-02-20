import React, { useMemo, useState, useEffect } from 'react';
import { AppRoot } from '@telegram-apps/telegram-ui';

// Client Screens
import { WelcomeScreen } from './screens/WelcomeScreen';
import { ServicesScreen } from './screens/ServicesScreen';
import { SlotsScreen } from './screens/SlotsScreen';
import { BookingConfirmScreen } from './screens/BookingConfirmScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LeaveReviewScreen } from './screens/LeaveReviewScreen';
import { ReviewsListScreen } from './screens/ReviewsListScreen';

// Master Screens
import { MasterWelcomeScreen } from './screens/MasterWelcomeScreen';
import { MasterRegistrationScreen } from './screens/MasterRegistrationScreen';
import { MasterDashboardScreen } from './screens/MasterDashboardScreen';
import { MasterScheduleScreen } from './screens/MasterScheduleScreen';
import { MasterEditProfileScreen } from './screens/MasterEditProfileScreen';
import { MasterAnalyticsScreen } from './screens/MasterAnalyticsScreen';
import { MasterReviewsScreen } from './screens/MasterReviewsScreen';
import { MasterCreateServiceScreen } from './screens/MasterCreateServiceScreen';
import { PortfolioViewerScreen } from './screens/PortfolioViewerScreen';

import type { Service, Slot, Booking } from './helpers/api';
import { getUserFromQuery, getStartParam } from './helpers/telegramQueryUser';

// ==========================================
// ГЛОБАЛЬНЫЙ ПАТЧ ДЛЯ ОБХОДА ZROK/NGROK
// ==========================================
const originalFetch = window.fetch;
window.fetch = async function () {
    let [resource, config] = arguments;
    if (!config) {
        config = {};
    }
    if (!config.headers) {
        config.headers = {};
    }
    // Добавляем секретные заголовки в КАЖДЫЙ запрос
    config.headers['ngrok-skip-browser-warning'] = 'true';
    config.headers['bypass-tunnel-reminder'] = 'true';
    config.headers['Accept'] = 'application/json';

    return await originalFetch(resource, config);
};
// ==========================================


const API_BASE = 'https://mnlyd16bdcfn.share.zrok.io/api';

// ... ДАЛЬШЕ ВЕСЬ ВАШ КОД КАК БЫЛ ...

type Screen =
  | 'welcome'
  | 'services'
  | 'slots'
  | 'bookingConfirm'
  | 'bookingDone'
  | 'profile'
  | 'settings'
  | 'leave_review'
  | 'client_reviews_list'
  | 'master_welcome'
  | 'master_registration'
  | 'master_dashboard'
  | 'master_schedule'
  | 'master_edit_profile'
  | 'master_analytics'
  | 'master_reviews'
  | 'master_create_service'
  | 'client_portfolio';

type MainTab = 'bookings' | 'masters' | 'settings';

const App: React.FC = () => {
  const tg = (window as any).Telegram?.WebApp;

  // 1. Инициализируем тему СРАЗУ, чтобы избежать мерцания белого
  const [appearance, setAppearance] = useState<'light' | 'dark'>(() => {
    if (tg?.colorScheme === 'dark') return 'dark';
    // Если tg не готов, проверим системные настройки браузера
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });

  useEffect(() => {
    if (!tg) return;

    const applyTheme = () => {
      const isDark = tg.colorScheme === 'dark';
      setAppearance(isDark ? 'dark' : 'light');

      const params = tg.themeParams;
      const root = document.documentElement;

      // Принудительно устанавливаем CSS переменные для Telegram UI
      if (params.bg_color) {
          root.style.setProperty('--tgui--bg_color', params.bg_color);
          root.style.setProperty('--tgui--secondary_bg_color', params.secondary_bg_color || params.bg_color);
          document.body.style.backgroundColor = params.bg_color;
      } else {
          // Фоллбэк, если параметров нет (например, в браузере)
          const fallbackBg = isDark ? '#000000' : '#ffffff';
          const fallbackSec = isDark ? '#1c1c1d' : '#f1f1f1';
          root.style.setProperty('--tgui--bg_color', fallbackBg);
          root.style.setProperty('--tgui--secondary_bg_color', fallbackSec);
          document.body.style.backgroundColor = fallbackBg;
      }

      if (params.text_color) root.style.setProperty('--tgui--text_color', params.text_color);
      if (params.hint_color) root.style.setProperty('--tgui--hint_color', params.hint_color);
      if (params.button_color) {
          root.style.setProperty('--tgui--button_color', params.button_color);
          root.style.setProperty('--tgui--button_text_color', params.button_text_color || '#ffffff');
      }
      if (params.destructive_text_color) {
          root.style.setProperty('--tgui--destructive_text_color', params.destructive_text_color);
      }

      tg.setHeaderColor(params.bg_color || (isDark ? '#000000' : '#ffffff'));
      tg.setBackgroundColor(params.bg_color || (isDark ? '#000000' : '#ffffff'));
    };

    tg.ready();
    tg.expand();

    // Применяем тему сразу
    applyTheme();

    // Слушаем изменения темы (когда пользователь меняет её в настройках ТГ)
    tg.onEvent('themeChanged', applyTheme);
    return () => tg.offEvent('themeChanged', applyTheme);
  }, [tg]);

  const user = useMemo(() => {
    if (tg?.initDataUnsafe?.user) return tg.initDataUnsafe.user;
    return getUserFromQuery();
  }, [tg]);

  const [screen, setScreen] = useState<Screen>('welcome');
  const [mainTab, setMainTab] = useState<MainTab>('bookings');

  // State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  const [selectedMasterName, setSelectedMasterName] = useState<string | null>(null);
  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null);

  const [reviewMaster, setReviewMaster] = useState<{id: number, name: string} | null>(null);
  const [currentMaster, setCurrentMaster] = useState<any>(null);
  const [reviewsMasterId, setReviewsMasterId] = useState<number | null>(null);
  const [portfolioMaster, setPortfolioMaster] = useState<{id: number, name: string} | null>(null);

  const loadCurrentMaster = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(`${API_BASE}/masters/me/?telegram_id=${user.id}`);
        if (res.ok) {
           const data = await res.json();
           setCurrentMaster(data);
        }
      } catch (e) { console.error(e); }
  };

  // Логика инициализации (Роли + Deep Linking)
  useEffect(() => {
    const initApp = async () => {
       const params = new URLSearchParams(window.location.search);
       if (params.get('role') === 'master') {
         setScreen('master_welcome');
         return;
       }

       const startParam = getStartParam();
       if (startParam && startParam.startsWith('master_')) {
          const idStr = startParam.replace('master_', '');
          const mId = parseInt(idStr);

          if (!isNaN(mId)) {
             try {
                 const res = await fetch(`${API_BASE}/masters/${mId}/`);
                 if (res.ok) {
                     const mData = await res.json();
                     setSelectedMasterId(mId);
                     setSelectedMasterName(mData.name);
                     setScreen('services');
                 }
             } catch (e) {
                 console.error('Deep link error', e);
             }
          }
       }
    };

    initApp();
  }, []);

  const handleServiceSelected = (service: Service) => {
    setSelectedService(service);
    setScreen('slots');
  };

  const handleSlotSelected = (slot: Slot) => {
    setSelectedSlot(slot);
    setScreen('bookingConfirm');
  };

  const handleBookingSuccess = (booking: Booking) => {
    setCreatedBooking(booking);
    setScreen('bookingDone');
  };

  const resetToStart = () => {
    setSelectedService(null);
    setSelectedSlot(null);
    setCreatedBooking(null);
    setSelectedMasterName(null);
    setSelectedMasterId(null);
    setScreen('welcome');
  };

  const platform = tg?.platform || 'base';
  const isIos = ['macos', 'ios'].includes(platform);

  return (
    <AppRoot appearance={appearance} platform={isIos ? 'ios' : 'base'}>

      {/* CLIENT SCREENS */}
      {screen === 'welcome' && (
        <WelcomeScreen
          onContinue={() => {
            setSelectedMasterName(null);
            setSelectedMasterId(null);
            setScreen('services');
          }}
          onOpenMyBookings={() => { setMainTab('bookings'); setScreen('profile'); }}
        />
      )}
      {screen === 'services' && (
        <ServicesScreen
          onBack={() => setScreen('welcome')}
          onServiceSelected={handleServiceSelected}
          selectedMasterName={selectedMasterName}
          masterId={selectedMasterId}
        />
      )}
      {screen === 'slots' && selectedService && (
        <SlotsScreen
          service={selectedService}
          onBack={() => setScreen('services')}
          onSlotSelected={handleSlotSelected}
        />
      )}
      {screen === 'bookingConfirm' && selectedService && selectedSlot && (
        <BookingConfirmScreen
          service={selectedService}
          slot={selectedSlot}
          onBack={() => setScreen('slots')}
          onSuccess={handleBookingSuccess}
          user={user}
        />
      )}
      {screen === 'bookingDone' && createdBooking && (
        <div style={{ padding: 20, minHeight: '100vh', background: 'var(--tgui--bg_color)' }}>
          <h2 style={{ color: 'var(--tgui--text_color)' }}>Бронь создана!</h2>
          <button onClick={resetToStart} style={{ marginTop: 16, padding: '10px 20px' }}>На главный экран</button>
        </div>
      )}
      {screen === 'client_reviews_list' && reviewsMasterId && (
        <ReviewsListScreen
            masterId={reviewsMasterId}
            onBack={() => setScreen('profile')}
        />
      )}
      {screen === 'client_portfolio' && portfolioMaster && (
        <PortfolioViewerScreen
            masterId={portfolioMaster.id}
            masterName={portfolioMaster.name}
            onBack={() => setScreen('profile')}
        />
      )}
      {screen === 'profile' && user && (
        <ProfileScreen
          telegramId={user.id}
          initialTab={mainTab}
          onBack={() => setScreen('welcome')}
          onGoToServices={(masterName) => {
            setSelectedMasterName(masterName || null);
            setScreen('services');
          }}
          onReview={(booking) => {
              const masterId = booking.slot.service.master;
              const masterName = booking.master_name || 'Мастер';
              setReviewMaster({ id: masterId, name: masterName });
              setScreen('leave_review');
          }}
          onOpenMasterReviews={(id) => {
            setReviewsMasterId(id);
            setScreen('client_reviews_list');
          }}
          onOpenPortfolio={(id, name) => {
            setPortfolioMaster({ id, name });
            setScreen('client_portfolio');
          }}
        />
      )}
      {screen === 'leave_review' && user && reviewMaster && (
        <LeaveReviewScreen
          telegramId={user.id}
          masterId={reviewMaster.id}
          masterName={reviewMaster.name}
          userFirstName={user.first_name}
          onBack={() => setScreen('profile')}
          onSuccess={() => setScreen('profile')}
        />
      )}
      {screen === 'settings' && user && (
        <SettingsScreen telegramId={user.id} onBack={() => setScreen('profile')} />
      )}

      {/* MASTER SCREENS */}
      {screen === 'master_welcome' && (
        <MasterWelcomeScreen
          onStart={() => setScreen('master_registration')}
          onLogin={() => setScreen('master_dashboard')}
        />
      )}
      {screen === 'master_registration' && user && (
        <MasterRegistrationScreen
          telegramId={user.id}
          initialName={[user.first_name, user.last_name].filter(Boolean).join(' ')}
          onBack={() => setScreen('master_welcome')}
          onComplete={() => setScreen('master_dashboard')}
        />
      )}
      {screen === 'master_dashboard' && user && (
        <MasterDashboardScreen
          telegramId={user.id}
          onSwitchToClient={() => setScreen('welcome')}
          onOpenSchedule={() => setScreen('master_schedule')}
          onEditProfile={() => {
             loadCurrentMaster();
             setScreen('master_edit_profile');
          }}
          onOpenAnalytics={() => setScreen('master_analytics')}
          onOpenReviews={() => setScreen('master_reviews')}
          onAddService={() => setScreen('master_create_service')}
        />
      )}
      {screen === 'master_schedule' && user && (
        <MasterScheduleScreen telegramId={user.id} onBack={() => setScreen('master_dashboard')} />
      )}
      {screen === 'master_edit_profile' && user && (
        <MasterEditProfileScreen
          telegramId={user.id}
          initialData={currentMaster ? {
             name: currentMaster.name,
             bio: currentMaster.bio,
             avatarUrl: currentMaster.avatar_url,
             phone: currentMaster.phone
          } : undefined}
          onBack={() => setScreen('master_dashboard')}
          onSaved={() => { loadCurrentMaster(); setScreen('master_dashboard'); }}
        />
      )}
      {screen === 'master_analytics' && user && (
        <MasterAnalyticsScreen telegramId={user.id} onBack={() => setScreen('master_dashboard')} />
      )}
      {screen === 'master_reviews' && user && (
        <MasterReviewsScreen telegramId={user.id} onBack={() => setScreen('master_dashboard')} />
      )}

      {/* ЭКРАН СОЗДАНИЯ УСЛУГИ */}
      {screen === 'master_create_service' && user && (
        <MasterCreateServiceScreen
          telegramId={user.id}
          onBack={() => setScreen('master_dashboard')}
          onSuccess={() => setScreen('master_dashboard')}
        />
      )}

    </AppRoot>
  );
};

export default App;