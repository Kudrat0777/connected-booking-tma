import React, { useMemo, useState, useEffect } from 'react';
import { AppRoot } from '@telegram-apps/telegram-ui';

// Client Screens
import { WelcomeScreen } from './screens/WelcomeScreen';
import { ServicesScreen } from './screens/ServicesScreen';
import { SlotsScreen } from './screens/SlotsScreen';
import { BookingConfirmScreen } from './screens/BookingConfirmScreen';
import { BookingSuccessScreen } from './screens/BookingSuccessScreen'; // НОВЫЙ ЭКРАН УСПЕХА
import { ProfileScreen } from './screens/ProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LeaveReviewScreen } from './screens/LeaveReviewScreen';
import { ReviewsListScreen } from './screens/ReviewsListScreen';
import { ClientRegistrationScreen } from './screens/ClientRegistrationScreen';

// Master Screens
import { MasterWelcomeScreen } from './screens/MasterWelcomeScreen';
import { MasterLoginScreen } from './screens/MasterLoginScreen';
import { MasterDashboardScreen } from './screens/MasterDashboardScreen';
import { MasterScheduleScreen } from './screens/MasterScheduleScreen';
import { MasterEditProfileScreen } from './screens/MasterEditProfileScreen';
import { MasterAnalyticsScreen } from './screens/MasterAnalyticsScreen';
import { MasterReviewsScreen } from './screens/MasterReviewsScreen';
import { MasterCreateServiceScreen } from './screens/MasterCreateServiceScreen';
import { PortfolioViewerScreen } from './screens/PortfolioViewerScreen';
import { MasterPublicProfileScreen } from './screens/MasterPublicProfileScreen';

import type { Service, Slot, Booking } from './helpers/api';
import { checkClientProfile, registerClient } from './helpers/api';
import { getUserFromQuery, getStartParam } from './helpers/telegramQueryUser';

const originalFetch = window.fetch;
window.fetch = async function () {
    let [resource, config] = arguments;
    if (!config) config = {};
    if (!config.headers) config.headers = {};
    config.headers['ngrok-skip-browser-warning'] = 'true';
    config.headers['bypass-tunnel-reminder'] = 'true';
    config.headers['Accept'] = 'application/json';
    return await originalFetch(resource, config);
};

const API_BASE = 'https://vdw9a2moqg9j.share.zrok.io/api';

type Screen =
  | 'welcome' | 'services' | 'slots' | 'bookingConfirm' | 'bookingDone'
  | 'profile' | 'settings' | 'leave_review' | 'client_reviews_list'
  | 'master_welcome' | 'master_login' | 'master_dashboard'
  | 'master_schedule' | 'master_edit_profile' | 'master_analytics'
  | 'master_reviews' | 'master_create_service' | 'client_portfolio'
  | 'client_registration' | 'client_master_profile';

type MainTab = 'bookings' | 'masters' | 'settings';

const App: React.FC = () => {
  const tg = (window as any).Telegram?.WebApp;

  const [appearance, setAppearance] = useState<'light' | 'dark'>(() => {
    if (tg?.colorScheme === 'dark') return 'dark';
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

      if (params.bg_color) {
          root.style.setProperty('--tgui--bg_color', params.bg_color);
          root.style.setProperty('--tgui--secondary_bg_color', params.secondary_bg_color || params.bg_color);
          document.body.style.backgroundColor = params.bg_color;
      } else {
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
    applyTheme();

    tg.onEvent('themeChanged', applyTheme);
    return () => tg.offEvent('themeChanged', applyTheme);
  }, [tg]);

  const user = useMemo(() => {
    if (tg?.initDataUnsafe?.user) return tg.initDataUnsafe.user;
    return getUserFromQuery();
  }, [tg]);

  const [screen, setScreen] = useState<Screen>('welcome');
  const [mainTab, setMainTab] = useState<MainTab>('bookings');
  const [isAppLoading, setIsAppLoading] = useState(true);

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
      const uid = user?.id || (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!uid) return;
      try {
        const res = await fetch(`${API_BASE}/masters/me/?telegram_id=${uid}`);
        if (res.ok) {
           const data = await res.json();
           setCurrentMaster(data);
        }
      } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const initApp = async () => {
       setIsAppLoading(true);

       const isMasterLoggedIn = localStorage.getItem('is_master_logged_in') === 'true';
       const isClientLoggedIn = localStorage.getItem('is_client_logged_in') === 'true';

       if (isMasterLoggedIn) {
           setScreen('master_dashboard');
           setIsAppLoading(false);
           loadCurrentMaster();
           return;
       }

       const startParam = getStartParam();
       if (startParam && startParam.startsWith('master_')) {
          const idStr = startParam.replace('master_', '');
          const mId = parseInt(idStr);
          if (!isNaN(mId)) {
             setSelectedMasterId(mId);
             setScreen('client_master_profile');
             setIsAppLoading(false);
             return;
          }
       }

       if (isClientLoggedIn) {
           const uid = user?.id;
           if (uid) {
               setMainTab('bookings');
               setScreen('profile');
               setIsAppLoading(false);

               checkClientProfile(uid).then((profile) => {
                   if (!profile) {
                       localStorage.removeItem('is_client_logged_in');
                       setScreen('welcome');
                   }
               });
               return;
           }
       }

       const params = new URLSearchParams(window.location.search);
       if (params.get('role') === 'master') {
         setScreen('master_welcome');
       } else {
         setScreen('welcome');
       }
       setIsAppLoading(false);
    };

    setTimeout(initApp, 100);
  }, [user?.id]);

  const handleServiceSelected = (service: Service) => { setSelectedService(service); setScreen('slots'); };
  const handleSlotSelected = (slot: Slot) => { setSelectedSlot(slot); setScreen('bookingConfirm'); };
  const handleBookingSuccess = (booking: Booking) => { setCreatedBooking(booking); setScreen('bookingDone'); };

  const handleMasterLogout = () => {
    localStorage.removeItem('is_master_logged_in');
    setCurrentMaster(null);
    setSelectedMasterId(null);
    setSelectedMasterName(null);
    setScreen('master_welcome');
  };

  const handleClientLogout = () => {
    localStorage.removeItem('is_client_logged_in');
    setScreen('welcome');
  };

  const resetToStart = () => {
    setSelectedService(null);
    setSelectedSlot(null);
    setCreatedBooking(null);
    setSelectedMasterName(null);
    setSelectedMasterId(null);
    if (localStorage.getItem('is_client_logged_in') === 'true') {
        setMainTab('bookings');
        setScreen('profile');
    } else {
        setScreen('welcome');
    }
  };

  const handleClientLogin = async (sourceUser?: any) => {
    const tgInstance = (window as any).Telegram?.WebApp;
    const currentUser = sourceUser || user || tgInstance?.initDataUnsafe?.user;

    if (!currentUser?.id) {
      if (tgInstance?.showAlert) {
          tgInstance.showAlert("⚠️ Ошибка: Приложение открыто как обычная ссылка. Пожалуйста, настройте кнопку в боте как Web App.");
      } else {
          alert("⚠️ Ошибка: Откройте приложение через специальную кнопку меню в боте Telegram.");
      }
      return;
    }

    setIsAppLoading(true);
    try {
      const profile = await checkClientProfile(currentUser.id);

      if (!profile) {
        await registerClient({
          telegram_id: currentUser.id,
          first_name: currentUser.first_name || 'Клиент',
          last_name: currentUser.last_name || '',
          username: currentUser.username || '',
        });
      }

      localStorage.setItem('is_client_logged_in', 'true');
      setMainTab('bookings');
      setScreen('profile');

    } catch (e) {
      console.error("Login/Registration error:", e);
      alert("Произошла ошибка при соединении с сервером.");
    } finally {
      setIsAppLoading(false);
    }
  };

  const platform = tg?.platform || 'base';
  const isIos = ['macos', 'ios'].includes(platform);

  if (isAppLoading) {
    return (
        <AppRoot appearance={appearance} platform={isIos ? 'ios' : 'base'}>
          <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', color: 'var(--tgui--text_color)' }}>
            Загрузка...
          </div>
        </AppRoot>
      );
  }

  return (
    <AppRoot appearance={appearance} platform={isIos ? 'ios' : 'base'}>

      {screen === 'welcome' && (
        <WelcomeScreen onContinue={(tgUser) => handleClientLogin(tgUser)} />
      )}

      {screen === 'client_registration' && user && (
        <ClientRegistrationScreen
          telegramId={user.id}
          onBack={() => setScreen('welcome')}
          onComplete={() => {
            localStorage.setItem('is_client_logged_in', 'true');
            setMainTab('bookings');
            setScreen('profile');
          }}
        />
      )}

      {screen === 'services' && (
        <ServicesScreen
          onBack={() => {
            if (localStorage.getItem('is_client_logged_in') === 'true') setScreen('profile');
            else setScreen('welcome');
          }}
          onServiceSelected={handleServiceSelected}
          selectedMasterName={selectedMasterName}
          masterId={selectedMasterId}
        />
      )}

      {screen === 'slots' && selectedService && (
        <SlotsScreen
          service={selectedService}
          onBack={() => {
              if (selectedMasterId) setScreen('client_master_profile');
              else setScreen('services');
          }}
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

      {/* НОВЫЙ ЭКРАН УСПЕШНОГО БРОНИРОВАНИЯ */}
      {screen === 'bookingDone' && createdBooking && (
        <BookingSuccessScreen
           booking={createdBooking}
           onGoHome={resetToStart}
        />
      )}

      {screen === 'client_reviews_list' && reviewsMasterId && (
        <ReviewsListScreen masterId={reviewsMasterId} isOpen={true} onClose={() => setScreen('profile')} />
      )}

      {screen === 'client_portfolio' && portfolioMaster && (
        <PortfolioViewerScreen masterId={portfolioMaster.id} masterName={portfolioMaster.name} onBack={() => setScreen('profile')} />
      )}

      {screen === 'profile' && user && (
        <ProfileScreen
          telegramId={user.id}
          initialTab={mainTab}
          onBack={() => setScreen('welcome')}
          onLogout={handleClientLogout}
          onOpenMasterProfile={(masterId, masterName) => {
            setSelectedMasterId(masterId);
            setSelectedMasterName(masterName || null);
            setScreen('client_master_profile');
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

      {/* MASTER SCREENS */}
      {screen === 'master_welcome' && (
        <MasterWelcomeScreen onStart={() => {}} onLogin={() => setScreen('master_login')} />
      )}

      {screen === 'master_login' && user && (
        <MasterLoginScreen
          telegramId={user.id}
          onBack={() => setScreen('master_welcome')}
          onComplete={() => setScreen('master_dashboard')}
        />
      )}

      {screen === 'master_dashboard' && user && (
        <MasterDashboardScreen
          telegramId={user.id}
          onSwitchToClient={() => {
              if (localStorage.getItem('is_client_logged_in') === 'true') setScreen('profile');
              else setScreen('welcome');
          }}
          onOpenSchedule={() => setScreen('master_schedule')}
          onEditProfile={() => {
             loadCurrentMaster();
             setScreen('master_edit_profile');
          }}
          onOpenAnalytics={() => setScreen('master_analytics')}
          onOpenReviews={() => setScreen('master_reviews')}
          onAddService={() => setScreen('master_create_service')}
          onLogout={handleMasterLogout}
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

      {screen === 'master_create_service' && user && (
        <MasterCreateServiceScreen
          telegramId={user.id}
          onBack={() => setScreen('master_dashboard')}
          onSuccess={() => setScreen('master_dashboard')}
        />
      )}

      {screen === 'client_master_profile' && selectedMasterId && (
        <MasterPublicProfileScreen
          masterId={selectedMasterId}
          onBack={() => {
            if (localStorage.getItem('is_client_logged_in') === 'true') setScreen('profile');
            else setScreen('welcome');
          }}
          onBook={(name) => {
            setSelectedMasterName(name);
            setScreen('services');
          }}
          onServiceClick={(service) => {
            setSelectedService(service);
            setScreen('slots');
          }}
        />
      )}
    </AppRoot>
  );
};

export default App;