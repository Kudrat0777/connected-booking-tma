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
import { checkClientProfile } from './helpers/api';
import { getUserFromQuery, getStartParam } from './helpers/telegramQueryUser';

const originalFetch = window.fetch;
window.fetch = async function () {
    let [resource, config] = arguments;
    if (!config) {
        config = {};
    }
    if (!config.headers) {
        config.headers = {};
    }
    config.headers['ngrok-skip-browser-warning'] = 'true';
    config.headers['bypass-tunnel-reminder'] = 'true';
    config.headers['Accept'] = 'application/json';

    return await originalFetch(resource, config);
};

const API_BASE = 'https://rsod7mx79rps.share.zrok.io/api';

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
  | 'master_login'
  | 'master_dashboard'
  | 'master_schedule'
  | 'master_edit_profile'
  | 'master_analytics'
  | 'master_reviews'
  | 'master_create_service'
  | 'client_portfolio'
  | 'client_registration'
  | 'client_master_profile';

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

    // --- ЛОГИКА ИНИЦИАЛИЗАЦИИ ---
  useEffect(() => {
    const initApp = async () => {
       setIsAppLoading(true);

       const uid = user?.id || (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id;

       // 1. ПРОВЕРКА DEEP LINK (Переход клиента к конкретному мастеру)
       // Deep link всегда имеет приоритет (даже если мастер перешел по ссылке другого мастера,
       // он откроет его как клиент).
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

       if (uid) {
           try {
               // 2. УМНАЯ ПРОВЕРКА РОЛИ
               // Сначала спрашиваем бэкенд: "Этот Telegram ID принадлежит мастеру?"
               const masterRes = await fetch(`${API_BASE}/masters/by_telegram/?telegram_id=${uid}`);
               if (masterRes.ok) {
                   const masterData = await masterRes.json();

                   if (masterData.exists) {
                       // ЭТО МАСТЕР!
                       // Проверяем, не нажал ли он кнопку "Вернуться в режим клиента"
                       const isClientMode = localStorage.getItem('force_client_mode') === 'true';

                       if (!isClientMode) {
                           localStorage.setItem('is_master_logged_in', 'true');
                           setCurrentMaster(masterData.master);
                           setScreen('master_dashboard');
                           setIsAppLoading(false);
                           return;
                       }
                   }
               }

               // 3. ЕСЛИ ЭТО НЕ МАСТЕР (или он включил режим клиента)
               // Проверяем, есть ли он в базе клиентов
               const profile = await checkClientProfile(uid);
               if (profile) {
                   localStorage.setItem('is_client_logged_in', 'true');
                   setMainTab('bookings'); // Сразу показываем будущие записи
                   setScreen('profile');
                   setIsAppLoading(false);
                   return;
               } else {
                   // Новый клиент -> Регистрация
                   setScreen('client_registration');
                   setIsAppLoading(false);
                   return;
               }

           } catch (e) {
               console.error("Auth check error:", e);
           }
       }

       // 4. ЕСЛИ НИЧЕГО НЕ СРАБОТАЛО ИЛИ НЕТ UID - ПОКАЗЫВАЕМ СТАРТОВЫЙ ЭКРАН
       const params = new URLSearchParams(window.location.search);
       if (params.get('role') === 'master') {
         setScreen('master_welcome');
       } else {
         setScreen('welcome');
       }
       setIsAppLoading(false);
    };

    setTimeout(initApp, 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Выход мастера
  const handleMasterLogout = () => {
    localStorage.removeItem('is_master_logged_in');
    setCurrentMaster(null);
    setSelectedMasterId(null);
    setSelectedMasterName(null);
    setScreen('master_welcome');
  };

  // Выход клиента
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

    // Если клиент авторизован, кидаем в профиль, иначе на главную
    if (localStorage.getItem('is_client_logged_in') === 'true') {
        setScreen('profile');
    } else {
        setScreen('welcome');
    }
  };

  const handleClientLogin = async () => {
    if (!user?.id) {
      alert("Не удалось определить ваш Telegram ID.");
      return;
    }

    setIsAppLoading(true);
    try {
      const profile = await checkClientProfile(user.id);

      if (profile) {
        // СОХРАНЯЕМ СЕССИЮ КЛИЕНТА
        localStorage.setItem('is_client_logged_in', 'true');
        setMainTab('bookings');
        setScreen('profile');
      } else {
        setScreen('client_registration');
      }
    } catch (e) {
      console.error(e);
      setScreen('client_registration');
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

      {/* CLIENT SCREENS */}
      {screen === 'welcome' && (
        <WelcomeScreen onContinue={handleClientLogin} />
      )}

      {screen === 'client_registration' && user && (
        <ClientRegistrationScreen
          telegramId={user.id}
          onBack={() => setScreen('welcome')}
          onComplete={() => {
            // СОХРАНЯЕМ СЕССИЮ ПОСЛЕ УСПЕШНОЙ РЕГИСТРАЦИИ
            localStorage.setItem('is_client_logged_in', 'true');
            setMainTab('bookings');
            setScreen('profile');
          }}
        />
      )}

      {screen === 'services' && (
        <ServicesScreen
          onBack={() => {
            // Умная кнопка назад: если залогинен, возвращаем в профиль
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
        <ReviewsListScreen masterId={reviewsMasterId} onBack={() => setScreen('profile')} />
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
          onGoToServices={(masterId, masterName) => {
            // Теперь мы сохраняем ID и Имя, и открываем ВИЗИТКУ!
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
              // Включаем "режим клиента" для мастера
              localStorage.setItem('force_client_mode', 'true');
              if (localStorage.getItem('is_client_logged_in') === 'true') {
                  setScreen('profile');
              } else {
                  // Если мастер еще ни разу не заходил как клиент, отправим его на логин/регистрацию клиента
                  handleClientLogin();
              }
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
             phone: currentMaster.phone,
             city: currentMaster.city,
             address: currentMaster.address
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
        />
      )}
    </AppRoot>
  );
};

export default App;