import React, { useMemo, useState, useEffect } from 'react';
import { AppRoot, Spinner } from '@telegram-apps/telegram-ui';

import { LanguageProvider, useLanguage } from './helpers/LanguageContext';

// Client Screens
import { WelcomeScreen } from './screens/WelcomeScreen';
import { SlotsScreen } from './screens/SlotsScreen';
import { BookingSuccessScreen } from './screens/BookingSuccessScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { LeaveReviewScreen } from './screens/LeaveReviewScreen';

// Master Screens
import { MasterWelcomeScreen } from './screens/MasterWelcomeScreen';
import { MasterLoginScreen } from './screens/MasterLoginScreen';
import { MasterDashboardScreen } from './screens/MasterDashboardScreen';
import { MasterWorkHoursScreen } from './screens/MasterWorkHoursScreen';
import { SalonCalendarScreen } from './screens/SalonCalendarScreen';
import { AnyMasterScreen } from './screens/AnyMasterScreen';
import { MasterClientsScreen } from './screens/MasterClientsScreen';
import { MasterClientDetailScreen } from './screens/MasterClientDetailScreen';
import { MasterEditProfileScreen } from './screens/MasterEditProfileScreen';
import { MasterAnalyticsScreen } from './screens/MasterAnalyticsScreen';
import { MasterReviewsScreen } from './screens/MasterReviewsScreen';
import { MasterPublicProfileScreen } from './screens/MasterPublicProfileScreen';
import { MasterRegistrationScreen } from './screens/MasterRegistrationScreen';
import { MasterLinksScreen } from './screens/MasterLinksScreen';
import { MasterTeamScreen } from './screens/MasterTeamScreen';
import { MasterGroupsScreen } from './screens/MasterGroupsScreen';
import { BusinessPublicScreen } from './screens/BusinessPublicScreen';

import type { Service, Booking } from './helpers/api';
import { checkClientProfile, registerClient, fetchCurrentMaster, fetchMasterBySlug, fetchBooking, trackVisit, updateUserProfile } from './helpers/api';
import { REBOOK_SOURCE, parseStartParam, rememberSource } from './helpers/links';
import { applyBrand } from './helpers/brand';
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

    // Кто делает запрос: подписанные Telegram данные (initData). Бэкенд проверяет подпись
    // и больше не верит telegram_id из параметров запроса.
    const isApiCall = url.startsWith(API_BASE) || url.includes('/api/');
    if (isApiCall) {
        const initData = (window as any).Telegram?.WebApp?.initData;
        if (initData) {
            config.headers['Authorization'] = `tma ${initData}`;
        } else if (import.meta.env.DEV) {
            // Разработка в обычном браузере: бэкенд примет этот заголовок только при TMA_DEV_AUTH=1
            const devId = new URLSearchParams(window.location.search).get('uid');
            if (devId) config.headers['X-Dev-Telegram-Id'] = devId;
        }
    }

    return await originalFetch(resource, config);
};

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

type Screen =
  | 'welcome' | 'slots' | 'bookingDone'
  | 'profile' | 'leave_review'
  | 'master_welcome' | 'master_login' | 'master_registration' | 'master_dashboard'
  | 'master_schedule' | 'master_edit_profile' | 'master_analytics'
  | 'master_reviews' | 'client_master_profile'
  | 'master_links' | 'master_team' | 'client_business' | 'master_member_schedule'
  | 'master_groups' | 'salon_calendar' | 'client_any_master' | 'master_clients' | 'master_client_detail';

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

      // Кнопки, ссылки и акценты — фирменный зелёный Connected поверх темы Telegram
      applyBrand(isDark);
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
  const [mainTab, setMainTab] = useState<MainTab>('masters');

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null);

  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [currentMaster, setCurrentMaster] = useState<any>(null);

  // СОСТОЯНИЕ ДЛЯ ХРАНЕНИЯ ЦЕЛЕВОГО МАСТЕРА ИЗ ДИПЛИНКА
  const [targetMasterIdForNewClient, setTargetMasterIdForNewClient] = useState<number | null>(null);
  // Заведение из таргет-ссылки b_<slug> и код приглашения join_<код>
  const [businessSlug, setBusinessSlug] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [clientKey, setClientKey] = useState<string | null>(null);
  const [targetBusinessForNewClient, setTargetBusinessForNewClient] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  // Владелец/админ редактирует график мастера своей команды
  const [scheduleMasterId, setScheduleMasterId] = useState<number | null>(null);

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

  const loadCurrentMaster = async (_uid?: number) => {
      try {
        const data = await fetchCurrentMaster();
        if (data) {
           setCurrentMaster(data);
           return true;
        }
      } catch (e) { console.error('Failed to load master', e); }
      return false;
  };

  // Куда вести клиента после входа: заведение или мастер из ссылки, иначе — главная
  const openClientTarget = (masterId: number | null, bizSlug: string | null) => {
      if (bizSlug) {
          setBusinessSlug(bizSlug);
          setHistory(['profile']);
          setScreenState('client_business');
      } else if (masterId) {
          setSelectedMasterId(masterId);
          setHistory(['profile']);
          setScreenState('client_master_profile');
      } else {
          setMainTab('masters');
          resetScreen('profile');
      }
  };

  // Кнопка «Написать отзыв» из бота: сразу на экран отзыва об этом визите
  const openReviewTarget = async (bookingId: number) => {
      const bk = await fetchBooking(bookingId).catch(() => null);
      setMainTab('bookings');
      if (!bk) { resetScreen('profile'); return; }
      setReviewBooking(bk);
      setHistory(['profile']);
      setScreenState('leave_review');
  };

  // «Записаться снова» из сообщения бота: сразу выбор времени на ту же услугу
  const openRebookTarget = async (bookingId: number) => {
      const bk = await fetchBooking(bookingId).catch(() => null);
      // В записи услуга приходит целиком (с мастером) — её и отдаём экрану выбора времени
      const service = bk?.slot?.service as unknown as Service | undefined;
      setMainTab('masters');
      if (!service?.id) { resetScreen('profile'); return; }
      rememberSource(REBOOK_SOURCE); // в аналитике мастера запись будет видна как «напоминание»
      setSelectedService(service);
      setHistory(['profile']);
      setScreenState('slots');
  };

  // === ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ===
  useEffect(() => {
    // Используем флаг isMounted, чтобы избежать ошибок если компонент размонтируется
    let isMounted = true;

    const initApp = async () => {
       setIsAppLoading(true);

       try {
           const uid = user?.id || (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id;

           // 1. Разбираем ссылку: b_<заведение>__<метка>, m_<мастер>__<метка>, join_<код>, master_<id>
           let dipLinkMasterId: number | null = null;
           let dipLinkBusiness: string | null = null;
           const target = parseStartParam(getStartParam());
           if (target?.kind === 'legacy_master') {
              dipLinkMasterId = target.id;
           } else if (target?.kind === 'business') {
              dipLinkBusiness = target.slug;
              rememberSource(target.source);
              trackVisit({ business: target.slug, source: target.source });
           } else if (target?.kind === 'master') {
              rememberSource(target.source);
              trackVisit({ master: target.slug, source: target.source });
              const m = await fetchMasterBySlug(target.slug).catch(() => null);
              if (m) dipLinkMasterId = m.id;
           }

           // ЕСЛИ НЕТ ПОЛЬЗОВАТЕЛЯ -> Экран приветствия
           if (!uid) {
               if (isMounted) {
                   resetScreen('welcome');
                   setIsAppLoading(false);
               }
               return;
           }

           // 2. ПАНЕЛЬ МАСТЕРА. Вход — через Telegram: если мастер уже зарегистрирован, сразу в кабинет.
           const params = new URLSearchParams(window.location.search);
           if (params.get('role') === 'master' || target?.kind === 'join') {
               if (target?.kind === 'join') {
                   // Приглашение в команду: сразу на регистрацию в заведение
                   if (isMounted) {
                       setInviteCode(target.code);
                       resetScreen('master_registration');
                       setIsAppLoading(false);
                   }
                   return;
               }
               const loggedOut = localStorage.getItem('is_master_logged_out') === 'true';
               const isMasterLoaded = !loggedOut && await loadCurrentMaster();
               if (isMounted) {
                   resetScreen(isMasterLoaded ? 'master_dashboard' : 'master_welcome');
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
               // Бот пишет на языке приложения: исправляем и тех, кому раньше записался не тот язык
               if (profile.language !== lang) updateUserProfile(uid, { language: lang }).catch(() => {});
               localStorage.setItem('is_client_logged_in', 'true');

               if (target?.kind === 'review') await openReviewTarget(target.bookingId);
               else if (target?.kind === 'rebook') await openRebookTarget(target.bookingId);
               else openClientTarget(dipLinkMasterId, dipLinkBusiness);
           } else {
               // Новый клиент: Telegram уже знает, кто это, — регистрируем молча и сразу
               // открываем нужный экран, без приветственных слайдов и кнопки «Начать работу»
               const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user || user;
               try {
                   await registerClient({
                       telegram_id: uid,
                       first_name: tgUser?.first_name || '',
                       last_name: tgUser?.last_name || '',
                       username: tgUser?.username || '',
                       language: lang,
                   });
                   localStorage.setItem('is_client_logged_in', 'true');
                   if (isMounted) {
                       if (target?.kind === 'review') await openReviewTarget(target.bookingId);
                       else if (target?.kind === 'rebook') await openRebookTarget(target.bookingId);
                       else openClientTarget(dipLinkMasterId, dipLinkBusiness);
                   }
               } catch (e) {
                   // Сервер недоступен — показываем приветствие, оттуда можно повторить вход
                   console.error('Auto registration failed', e);
                   localStorage.removeItem('is_client_logged_in');
                   if (dipLinkMasterId) setTargetMasterIdForNewClient(dipLinkMasterId);
                   if (dipLinkBusiness) setTargetBusinessForNewClient(dipLinkBusiness);
                   resetScreen('welcome');
               }
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

      openClientTarget(targetMasterIdForNewClient, targetBusinessForNewClient);
      setTargetMasterIdForNewClient(null);
      setTargetBusinessForNewClient(null);
    } catch (e) {
      console.error("Login/Registration error:", e);
      alert("Произошла ошибка при соединении с сервером.");
    } finally {
      setIsAppLoading(false);
    }
  };

  const handleMasterLogout = () => {
    localStorage.setItem('is_master_logged_out', 'true');
    setCurrentMaster(null);
    setSelectedMasterId(null);
    resetScreen('master_welcome');
  };

  const handleClientLogout = () => {
    localStorage.removeItem('is_client_logged_in');
    resetScreen('welcome');
  };

  const resetToStart = () => {
    setSelectedService(null);
    setCreatedBooking(null);
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

      {screen === 'slots' && selectedService && (
        <SlotsScreen
          service={selectedService}
          onBack={() => goBack('profile')}
          user={user}
          onBooked={(booking) => { setCreatedBooking(booking); resetScreen('bookingDone'); }}
        />
      )}

      {screen === 'bookingDone' && createdBooking && (
        <BookingSuccessScreen
           booking={createdBooking}
           onGoHome={resetToStart}
           onBookMore={() => { resetToStart(); setMainTab('masters'); }}
        />
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
          onOpenMasterProfile={(masterId) => {
            setSelectedMasterId(masterId);
            pushScreen('client_master_profile');
          }}
          onReview={(booking) => {
              setReviewBooking(booking);
              pushScreen('leave_review');
          }}
        />
      )}

      {screen === 'leave_review' && user && reviewBooking && (
        <LeaveReviewScreen
          booking={reviewBooking}
          onBack={() => goBack('profile')}
          onDone={() => { setMainTab('bookings'); resetScreen('profile'); }}
        />
      )}

      {/* MASTER SCREENS */}
      {screen === 'master_welcome' && (
        <MasterWelcomeScreen
          onStart={() => {}}
          onLogin={async () => {
              localStorage.removeItem('is_master_logged_out');
              if (await loadCurrentMaster()) resetScreen('master_dashboard');
              else pushScreen('master_login');
          }}
          onRegister={async () => {
              localStorage.removeItem('is_master_logged_out');
              if (await loadCurrentMaster()) resetScreen('master_dashboard');
              else pushScreen('master_registration');
          }}
        />
      )}

      {/* НОВЫЙ БЛОК РЕГИСТРАЦИИ МАСТЕРА */}
      {screen === 'master_registration' && user && (
        <MasterRegistrationScreen
          telegramId={user.id}
          inviteCode={inviteCode}
          onBack={() => { setInviteCode(null); goBack('master_welcome'); }}
          onComplete={() => {
              localStorage.removeItem('is_master_logged_out');
              setInviteCode(null);
              loadCurrentMaster(user.id);
              resetScreen('master_dashboard');
          }}
        />
      )}

      {screen === 'master_login' && user && (
        <MasterLoginScreen
          telegramId={user.id}
          onBack={() => goBack('master_welcome')}
          onComplete={() => {
              localStorage.removeItem('is_master_logged_out');
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
          onLogout={handleMasterLogout}
          onOpenLinks={() => pushScreen('master_links')}
          onOpenTeam={() => pushScreen('master_team')}
          onOpenSalonCalendar={() => pushScreen('salon_calendar')}
          onOpenClients={() => pushScreen('master_clients')}
          onOpenGroups={() => pushScreen('master_groups')}
        />
      )}

      {screen === 'master_groups' && <MasterGroupsScreen onBack={() => goBack('master_dashboard')} />}

      {screen === 'master_clients' && (
        <MasterClientsScreen
          onBack={() => goBack('master_dashboard')}
          onOpenClient={(key) => { setClientKey(key); pushScreen('master_client_detail'); }}
        />
      )}

      {screen === 'master_client_detail' && clientKey && (
        <MasterClientDetailScreen clientKey={clientKey} onBack={() => goBack('master_clients')} />
      )}

      {screen === 'salon_calendar' && (
        <SalonCalendarScreen onBack={() => goBack('master_dashboard')} />
      )}

      {screen === 'master_links' && (
        <MasterLinksScreen
          onBack={() => goBack('master_dashboard')}
          onOpenAnalytics={() => pushScreen('master_analytics')}
        />
      )}

      {screen === 'master_team' && (
        <MasterTeamScreen
          onBack={() => goBack('master_dashboard')}
          onOpenSchedule={(memberId) => { setScheduleMasterId(memberId); pushScreen('master_member_schedule'); }}
        />
      )}

      {screen === 'master_member_schedule' && scheduleMasterId && (
        <MasterWorkHoursScreen masterId={scheduleMasterId} onBack={() => goBack('master_team')} />
      )}

      {screen === 'client_business' && businessSlug && (
        <BusinessPublicScreen
          slug={businessSlug}
          onBack={() => goBack('profile')}
          onOpenMaster={(masterId) => {
            setSelectedMasterId(masterId);
            pushScreen('client_master_profile');
          }}
          onAnyMaster={(name) => { setBusinessName(name); pushScreen('client_any_master'); }}
        />
      )}

      {screen === 'client_any_master' && businessSlug && (
        <AnyMasterScreen
          slug={businessSlug}
          businessName={businessName}
          onBack={() => goBack('client_business')}
          onDone={() => { setMainTab('bookings'); resetScreen('profile'); }}
        />
      )}

      {screen === 'master_schedule' && user && (
        <MasterWorkHoursScreen onBack={() => goBack('master_dashboard')} />
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
             city: currentMaster.city,
             category: currentMaster.category,
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