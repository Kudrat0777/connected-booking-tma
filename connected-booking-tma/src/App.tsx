import React, { useMemo, useState, useEffect } from 'react';
import { AppRoot, Spinner } from '@telegram-apps/telegram-ui';

import { LanguageProvider, useLanguage } from './helpers/LanguageContext';

// Client Screens
import { WelcomeScreen } from './screens/WelcomeScreen';
import { ServicesScreen } from './screens/ServicesScreen';
import { SlotsScreen } from './screens/SlotsScreen';
import { BookingConfirmScreen } from './screens/BookingConfirmScreen';
import { BookingSuccessScreen } from './screens/BookingSuccessScreen';
import { ProfileScreen } from './screens/ProfileScreen';
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

    // Проверяем, куда идет запрос
    const url = typeof resource === 'string' ? resource : (resource instanceof Request ? resource.url : '');

    // ДОБАВЛЯЕМ ЗАГОЛОВКИ NGROK/ZROK ТОЛЬКО ЕСЛИ ЗАПРОС ИДЕТ НА НАШ БЭКЕНД
    if (url.includes('zrok.io') || url.includes('ngrok-free.app')) {
        config.headers['ngrok-skip-browser-warning'] = 'true';
        config.headers['bypass-tunnel-reminder'] = 'true';
    }

    config.headers['Accept'] = 'application/json';

    return await originalFetch(resource, config);
};

const API_BASE = 'https://n6jlohcg6gtg.share.zrok.io/api';

type Screen =
  | 'welcome' | 'services' | 'slots' | 'bookingConfirm' | 'bookingDone'
  | 'profile' | 'leave_review' | 'client_reviews_list'
  | 'master_welcome' | 'master_login' | 'master_dashboard'
  | 'master_schedule' | 'master_edit_profile' | 'master_analytics'
  | 'master_reviews' | 'master_create_service' | 'client_portfolio'
  | 'client_registration' | 'client_master_profile';

type MainTab = 'bookings' | 'masters' | 'settings';


// ВЫНЕСЛИ ОСНОВНУЮ ЛОГИКУ В ОТДЕЛЬНЫЙ КОМПОНЕНТ, ЧТОБЫ ИСПОЛЬЗОВАТЬ USELANGUAGE
const AppContent: React.FC = () => {
  const tg = (window as any).Telegram?.WebApp;

  // Достаём язык
  const { lang } = useLanguage();

  const [appearance, setAppearance] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (!tg) return;
    const applyTheme = () => {
      const isDark = tg.colorScheme === 'dark';
      setAppearance(isDark ? 'dark' : 'light');

      const params = tg.themeParams || {};
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

      if (tg.setHeaderColor) tg.setHeaderColor(params.bg_color || (isDark ? '#000000' : '#ffffff'));
      if (tg.setBackgroundColor) tg.setBackgroundColor(params.bg_color || (isDark ? '#000000' : '#ffffff'));
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

  const [isAppLoading, setIsAppLoading] = useState(true);
  const [screen, setScreenState] = useState<Screen>('welcome');
  const [history, setHistory] = useState<Screen[]>([]);
  const [mainTab, setMainTab] = useState<MainTab>('bookings');

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [selectedMasterName, setSelectedMasterName] = useState<string | null>(null);
  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null);

  const [reviewMaster, setReviewMaster] = useState<{id: number, name: string} | null>(null);
  const [currentMaster, setCurrentMaster] = useState<any>(null);
  const [reviewsMasterId, setReviewsMasterId] = useState<number | null>(null);
  const [portfolioMaster, setPortfolioMaster] = useState<{id: number, name: string} | null>(null);

  // СОСТОЯНИЕ ДЛЯ ХРАНЕНИЯ ЦЕЛЕВОГО МАСТЕРА ИЗ ДИПЛИНКА
  const [targetMasterIdForNewClient, setTargetMasterIdForNewClient] = useState<number | null>(null);

  const pushScreen = (newScreen: Screen) => {
      setHistory(prev => [...prev, screen]);
      setScreenState(newScreen);
  };

  const goBack = (fallbackScreen: Screen) => {
      setHistory(prev => {
          if (prev.length === 0) {
              setScreenState(fallbackScreen);
              return [];
          }
          const nextHistory = [...prev];
          const previousScreen = nextHistory.pop();
          setScreenState(previousScreen as Screen);
          return nextHistory;
      });
  };

  const resetScreen = (newScreen: Screen) => {
      setHistory([]);
      setScreenState(newScreen);
  };

  const loadCurrentMaster = async (uid: number) => {
      try {
        const res = await fetch(`${API_BASE}/masters/me/?telegram_id=${uid}`);
        if (res.ok) {
           const data = await res.json();
           setCurrentMaster(data);
           return true;
        }
      } catch (e) { console.error('Failed to load master', e); }
      return false;
  };

  // === ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ===
  useEffect(() => {
    // Используем флаг isMounted, чтобы избежать ошибок если компонент размонтируется
    let isMounted = true;

    const initApp = async () => {
       setIsAppLoading(true);

       try {
           const uid = user?.id || (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id;

           // 1. Проверяем диплинк (startapp=master_XXX)
           let dipLinkMasterId: number | null = null;
           const startParam = getStartParam();
           if (startParam && startParam.startsWith('master_')) {
              const idStr = startParam.replace('master_', '');
              const parsedId = parseInt(idStr);
              if (!isNaN(parsedId)) {
                 dipLinkMasterId = parsedId;
              }
           }

           // ЕСЛИ НЕТ ПОЛЬЗОВАТЕЛЯ -> Экран приветствия
           if (!uid) {
               if (isMounted) {
                   resetScreen('welcome');
                   setIsAppLoading(false);
               }
               return;
           }

           // 2. ПРОВЕРКА РОЛИ МАСТЕРА
           const params = new URLSearchParams(window.location.search);
           if (params.get('role') === 'master') {
               const isMasterLoaded = await loadCurrentMaster(uid);
               if (isMounted) {
                   if (isMasterLoaded || localStorage.getItem('is_master_logged_in') === 'true') {
                       resetScreen('master_dashboard');
                   } else {
                       resetScreen('master_welcome');
                   }
                   setIsAppLoading(false);
               }
               return;
           }

           // 3. ЛОГИКА ДЛЯ КЛИЕНТА (ОСНОВНАЯ)
           let profile = null;
           try {
               profile = await checkClientProfile(uid);
           } catch (e) {
               console.error("Profile check failed", e);
           }

           if (!isMounted) return;

           if (profile) {
               // Клиент существует в базе
               localStorage.setItem('is_client_logged_in', 'true');

               if (dipLinkMasterId) {
                   setSelectedMasterId(dipLinkMasterId);
                   setHistory(['profile']); // Чтобы кнопка "назад" возвращала в меню
                   setScreenState('client_master_profile');
               } else {
                   setMainTab('bookings');
                   resetScreen('profile');
               }
           } else {
               // Новый клиент
               localStorage.removeItem('is_client_logged_in');

               if (dipLinkMasterId) {
                   setTargetMasterIdForNewClient(dipLinkMasterId);
               }
               resetScreen('welcome');
           }

       } catch (error) {
           console.error("Critical error during init:", error);
           if (isMounted) resetScreen('welcome');
       } finally {
           if (isMounted) {
               setIsAppLoading(false);
           }
       }
    };

    initApp();

    return () => {
        isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Обрати внимание: мы НЕ добавляем lang сюда, чтобы не вызывать initApp при смене языка


  // === ОБРАБОТЧИКИ СОБЫТИЙ ===
  const handleClientLogin = async (sourceUser?: any) => {
    const tgInstance = (window as any).Telegram?.WebApp;
    const currentUser = sourceUser || user || tgInstance?.initDataUnsafe?.user;

    if (!currentUser?.id) {
      alert("⚠️ Ошибка: Откройте приложение через Telegram.");
      return;
    }

    setIsAppLoading(true);
    try {
      const profile = await checkClientProfile(currentUser.id);
      if (!profile) {
        // ПЕРЕДАЕМ lang ПРИ РЕГИСТРАЦИИ!
        await registerClient({
          telegram_id: currentUser.id,
          first_name: currentUser.first_name || 'Клиент',
          last_name: currentUser.last_name || '',
          username: currentUser.username || '',
          language: lang,
        });
      }

      localStorage.setItem('is_client_logged_in', 'true');

      if (targetMasterIdForNewClient) {
          setSelectedMasterId(targetMasterIdForNewClient);
          setTargetMasterIdForNewClient(null);
          setHistory(['profile']);
          setScreenState('client_master_profile');
      } else {
          setMainTab('bookings');
          resetScreen('profile');
      }
    } catch (e) {
      console.error("Login/Registration error:", e);
      alert("Произошла ошибка при соединении с сервером.");
    } finally {
      setIsAppLoading(false);
    }
  };

  const handleMasterLogout = () => {
    localStorage.removeItem('is_master_logged_in');
    setCurrentMaster(null);
    setSelectedMasterId(null);
    setSelectedMasterName(null);
    resetScreen('master_welcome');
  };

  const handleClientLogout = () => {
    localStorage.removeItem('is_client_logged_in');
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

  const platform = tg?.platform || 'base';
  const isIos = ['macos', 'ios'].includes(platform);

  // === РЕНДЕР ===
  if (isAppLoading) {
    return (
        <AppRoot appearance={appearance} platform={isIos ? 'ios' : 'base'}>
          <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--tg-theme-bg-color)' }}>
             <Spinner size="l" />
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
            if (targetMasterIdForNewClient) {
                setSelectedMasterId(targetMasterIdForNewClient);
                setTargetMasterIdForNewClient(null);
                setHistory(['profile']);
                setScreenState('client_master_profile');
            } else {
                setMainTab('bookings');
                resetScreen('profile');
            }
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
              loadCurrentMaster(user.id);
              resetScreen('master_dashboard');
          }}
        />
      )}

      {screen === 'master_dashboard' && user && (
        <MasterDashboardScreen
          telegramId={user.id}
          onSwitchToClient={() => { resetScreen('profile'); }}
          onOpenSchedule={() => pushScreen('master_schedule')}
          onEditProfile={() => { loadCurrentMaster(user.id); pushScreen('master_edit_profile'); }}
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
          onSaved={() => { loadCurrentMaster(user.id); goBack('master_dashboard'); }}
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

const AppWrapper: React.FC = () => {
    return (
        <LanguageProvider>
            <AppContent />
        </LanguageProvider>
    );
};

export default AppWrapper;