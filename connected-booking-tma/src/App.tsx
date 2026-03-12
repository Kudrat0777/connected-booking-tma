import React, { useMemo, useState, useEffect } from 'react';
import { AppRoot } from '@telegram-apps/telegram-ui';

// Client Screens
import { WelcomeScreen } from './screens/WelcomeScreen';
import { ServicesScreen } from './screens/ServicesScreen';
import { SlotsScreen } from './screens/SlotsScreen';
import { BookingConfirmScreen } from './screens/BookingConfirmScreen';
import { BookingSuccessScreen } from './screens/BookingSuccessScreen';
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

// === ХУК ДЛЯ СОХРАНЕНИЯ СОСТОЯНИЙ ПРИ ПЕРЕЗАГРУЗКЕ ===
function useSessionState<T>(key: string, defaultValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved !== null) return JSON.parse(saved) as T;
    } catch (e) {
      console.error(`Error reading ${key} from sessionStorage`, e);
    }
    return defaultValue;
  });

  const setPersistentState = (val: T | ((prev: T) => T)) => {
    setState((prev) => {
      const nextVal = val instanceof Function ? (val as Function)(prev) : val;
      try {
        sessionStorage.setItem(key, JSON.stringify(nextVal));
      } catch (e) {
        console.error(`Error saving ${key} to sessionStorage`, e);
      }
      return nextVal;
    });
  };

  return [state, setPersistentState];
}

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
          root.style.setProperty('--tg-theme-bg-color', params.bg_color);
          root.style.setProperty('--tg-theme-secondary-bg-color', params.secondary_bg_color || params.bg_color);
          document.body.style.backgroundColor = params.bg_color;
      } else {
          const fallbackBg = isDark ? '#000000' : '#ffffff';
          const fallbackSec = isDark ? '#1c1c1d' : '#f1f1f1';
          root.style.setProperty('--tg-theme-bg-color', fallbackBg);
          root.style.setProperty('--tg-theme-secondary-bg-color', fallbackSec);
          document.body.style.backgroundColor = fallbackBg;
      }

      if (params.text_color) root.style.setProperty('--tg-theme-text-color', params.text_color);
      if (params.hint_color) root.style.setProperty('--tg-theme-hint-color', params.hint_color);
      if (params.button_color) {
          root.style.setProperty('--tg-theme-button-color', params.button_color);
          root.style.setProperty('--tg-theme-button-text-color', params.button_text_color || '#ffffff');
      }
      if (params.destructive_text_color) {
          root.style.setProperty('--tg-theme-destructive-text-color', params.destructive_text_color);
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

  // === ИСПОЛЬЗУЕМ SESSION STORAGE ДЛЯ ВСЕХ СОСТОЯНИЙ ===
  const [screen, setScreenState] = useSessionState<Screen>('app_screen', 'welcome');
  const [history, setHistory] = useSessionState<Screen[]>('app_history', []);
  const [mainTab, setMainTab] = useSessionState<MainTab>('app_mainTab', 'bookings');

  const [selectedService, setSelectedService] = useSessionState<Service | null>('app_selService', null);
  const [selectedSlot, setSelectedSlot] = useSessionState<Slot | null>('app_selSlot', null);
  const [createdBooking, setCreatedBooking] = useSessionState<Booking | null>('app_createdBooking', null);
  const [selectedMasterName, setSelectedMasterName] = useSessionState<string | null>('app_selMasterName', null);
  const [selectedMasterId, setSelectedMasterId] = useSessionState<number | null>('app_selMasterId', null);

  const [reviewMaster, setReviewMaster] = useSessionState<{id: number, name: string} | null>('app_reviewMaster', null);
  const [currentMaster, setCurrentMaster] = useSessionState<any>('app_currentMaster', null);
  const [reviewsMasterId, setReviewsMasterId] = useSessionState<number | null>('app_reviewsMasterId', null);
  const [portfolioMaster, setPortfolioMaster] = useSessionState<{id: number, name: string} | null>('app_portfolioMaster', null);

  const [isAppLoading, setIsAppLoading] = useState(true);

  // === УМНАЯ НАВИГАЦИЯ (РОУТЕР С ИСТОРИЕЙ) ===
  const pushScreen = (newScreen: Screen) => {
      setHistory(prev => [...prev, screen]); // Добавляем текущий экран в историю
      setScreenState(newScreen);             // Переходим на новый
  };

  const goBack = (fallbackScreen: Screen) => {
      setHistory(prev => {
          const nextHistory = [...prev];
          const previousScreen = nextHistory.pop();
          setScreenState(previousScreen || fallbackScreen);
          return nextHistory;
      });
  };

  const resetScreen = (newScreen: Screen) => {
      setHistory([]); // Сбрасываем историю
      setScreenState(newScreen);
  };


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

       const params = new URLSearchParams(window.location.search);
       const urlRole = params.get('role');

       const isClientLoggedIn = localStorage.getItem('is_client_logged_in') === 'true';
       const uid = user?.id || (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id;

       // 1. ЕСЛИ ЕСТЬ СОХРАНЕННАЯ СЕССИЯ (Пользователь перезагрузил страницу)
       const savedScreen = sessionStorage.getItem('app_screen');
       if (savedScreen) {
           if (urlRole === 'master' && uid) {
               loadCurrentMaster();
           }
           setIsAppLoading(false);
           return; // Прерываем инициализацию, так как сессия загрузится сама!
       }

       // 2. ДИПЛИНК НА ПРОФИЛЬ МАСТЕРА
       const startParam = getStartParam();
       if (startParam && startParam.startsWith('master_')) {
          const idStr = startParam.replace('master_', '');
          const mId = parseInt(idStr);
          if (!isNaN(mId)) {
             setSelectedMasterId(mId);
             resetScreen('client_master_profile');
             setIsAppLoading(false);
             return;
          }
       }

       // 3. ЖЕСТКАЯ ПРОВЕРКА НА МАСТЕРА ЧЕРЕЗ URL
       if (urlRole === 'master') {
           if (uid) {
               try {
                   const res = await fetch(`${API_BASE}/masters/me/?telegram_id=${uid}`);
                   if (res.ok) {
                       const data = await res.json();
                       setCurrentMaster(data);
                       localStorage.setItem('is_master_logged_in', 'true');
                       resetScreen('master_dashboard');
                   } else {
                       resetScreen('master_welcome');
                   }
               } catch (e) {
                   resetScreen('master_welcome');
               }
           } else {
               resetScreen('master_welcome');
           }
           setIsAppLoading(false);
           return;
       }

       // 4. ЛОГИКА ДЛЯ КЛИЕНТСКОГО БОТА
       if (isClientLoggedIn && uid) {
           setMainTab('bookings');
           resetScreen('profile');
           setIsAppLoading(false);

           checkClientProfile(uid).then((profile) => {
               if (!profile) {
                   localStorage.removeItem('is_client_logged_in');
                   resetScreen('welcome');
               }
           });
           return;
       }

       // 5. ЕСЛИ ВООБЩЕ НИЧЕГО НЕТ
       resetScreen('welcome');
       setIsAppLoading(false);
    };

    setTimeout(initApp, 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleMasterLogout = () => {
    localStorage.removeItem('is_master_logged_in');
    setCurrentMaster(null);
    setSelectedMasterId(null);
    setSelectedMasterName(null);
    resetScreen('master_welcome');
  };

  const handleClientLogout = () => {
    localStorage.removeItem('is_client_logged_in');
    sessionStorage.clear(); // Полностью очищаем сессию при логауте
    resetScreen('welcome');
  };

  const resetToStart = () => {
    setSelectedService(null);
    setSelectedSlot(null);
    setCreatedBooking(null);
    setSelectedMasterName(null);
    setSelectedMasterId(null);
    if (localStorage.getItem('is_client_logged_in') === 'true') {
        setMainTab('bookings');
        resetScreen('profile');
    } else {
        resetScreen('welcome');
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
      resetScreen('profile');

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
          <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', color: 'var(--tg-theme-text-color)' }}>
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
          onBack={() => goBack('welcome')}
          onComplete={() => {
            localStorage.setItem('is_client_logged_in', 'true');
            setMainTab('bookings');
            resetScreen('profile');
          }}
        />
      )}

      {screen === 'services' && (
        <ServicesScreen
          onBack={() => goBack('profile')}
          onServiceSelected={(service) => { setSelectedService(service); pushScreen('slots'); }}
          selectedMasterName={selectedMasterName}
          masterId={selectedMasterId}
        />
      )}

      {screen === 'slots' && selectedService && (
        <SlotsScreen
          service={selectedService}
          onBack={() => goBack('services')}
          onSlotSelected={(slot) => { setSelectedSlot(slot); pushScreen('bookingConfirm'); }}
        />
      )}

      {screen === 'bookingConfirm' && selectedService && selectedSlot && (
        <BookingConfirmScreen
          service={selectedService}
          slot={selectedSlot}
          onBack={() => goBack('slots')}
          onSuccess={(booking) => { setCreatedBooking(booking); pushScreen('bookingDone'); }}
          user={user}
        />
      )}

      {screen === 'bookingDone' && createdBooking && (
        <BookingSuccessScreen
           booking={createdBooking}
           onGoHome={resetToStart}
        />
      )}

      {screen === 'client_reviews_list' && reviewsMasterId && (
        <ReviewsListScreen masterId={reviewsMasterId} isOpen={true} onClose={() => goBack('profile')} />
      )}

      {screen === 'client_portfolio' && portfolioMaster && (
        <PortfolioViewerScreen masterId={portfolioMaster.id} masterName={portfolioMaster.name} onBack={() => goBack('profile')} />
      )}

      {screen === 'profile' && user && (
        <ProfileScreen
          telegramId={user.id}
          initialTab={mainTab}
          onBack={() => {
             // Если мы в профиле, закрываем приложение (так как это главный экран)
             const tgInst = (window as any).Telegram?.WebApp;
             if (tgInst?.close) tgInst.close();
          }}
          onLogout={handleClientLogout}
          onOpenMasterProfile={(masterId, masterName) => {
            setSelectedMasterId(masterId);
            setSelectedMasterName(masterName || null);
            pushScreen('client_master_profile');
          }}
          onReview={(booking) => {
              const masterId = booking.slot.service.master;
              const masterName = booking.master_name || 'Мастер';
              setReviewMaster({ id: masterId, name: masterName });
              pushScreen('leave_review');
          }}
          onOpenMasterReviews={(id) => {
            setReviewsMasterId(id);
            pushScreen('client_reviews_list');
          }}
          onOpenPortfolio={(id, name) => {
            setPortfolioMaster({ id, name });
            pushScreen('client_portfolio');
          }}
        />
      )}

      {screen === 'leave_review' && user && reviewMaster && (
        <LeaveReviewScreen
          telegramId={user.id}
          masterId={reviewMaster.id}
          masterName={reviewMaster.name}
          userFirstName={user.first_name}
          onBack={() => goBack('profile')}
          onSuccess={() => goBack('profile')}
        />
      )}

      {/* MASTER SCREENS */}
      {screen === 'master_welcome' && (
        <MasterWelcomeScreen onStart={() => {}} onLogin={() => pushScreen('master_login')} />
      )}

      {screen === 'master_login' && user && (
        <MasterLoginScreen
          telegramId={user.id}
          onBack={() => goBack('master_welcome')}
          onComplete={() => {
              loadCurrentMaster();
              resetScreen('master_dashboard');
          }}
        />
      )}

      {screen === 'master_dashboard' && user && (
        <MasterDashboardScreen
          telegramId={user.id}
          onSwitchToClient={() => {
              if (localStorage.getItem('is_client_logged_in') === 'true') resetScreen('profile');
              else resetScreen('welcome');
          }}
          onOpenSchedule={() => pushScreen('master_schedule')}
          onEditProfile={() => {
             loadCurrentMaster();
             pushScreen('master_edit_profile');
          }}
          onOpenAnalytics={() => pushScreen('master_analytics')}
          onOpenReviews={() => pushScreen('master_reviews')}
          onAddService={() => pushScreen('master_create_service')}
          onLogout={handleMasterLogout}
        />
      )}

      {screen === 'master_schedule' && user && (
        <MasterScheduleScreen telegramId={user.id} onBack={() => goBack('master_dashboard')} />
      )}

      {screen === 'master_edit_profile' && user && (
        <MasterEditProfileScreen
          telegramId={user.id}
          initialData={currentMaster ? {
             name: currentMaster.name,
             bio: currentMaster.bio,
             avatarUrl: currentMaster.avatar_url,
             phone: currentMaster.phone,
             address: currentMaster.address,
             experience_years: currentMaster.experience_years,
          } : undefined}
          onBack={() => goBack('master_dashboard')}
          onSaved={() => { loadCurrentMaster(); goBack('master_dashboard'); }}
        />
      )}

      {screen === 'master_analytics' && user && (
        <MasterAnalyticsScreen telegramId={user.id} onBack={() => goBack('master_dashboard')} />
      )}

      {screen === 'master_reviews' && user && (
        <MasterReviewsScreen telegramId={user.id} onBack={() => goBack('master_dashboard')} />
      )}

      {screen === 'client_master_profile' && selectedMasterId && (
        <MasterPublicProfileScreen
          masterId={selectedMasterId}
          onBack={() => goBack('profile')}
          onBook={(name) => {
            setSelectedMasterName(name);
            pushScreen('services');
          }}
          onServiceClick={(service) => {
            setSelectedService(service);
            pushScreen('slots');
          }}
        />
      )}
    </AppRoot>
  );
};

export default App;