import React, { useState, useEffect } from 'react';
import {
  List,
  Section,
  Input,
  Cell,
  Avatar,
  Spinner
} from '@telegram-apps/telegram-ui';
import { Icon28PhoneOutline, Icon28UserCircleOutline } from '@vkontakte/icons';
import { updateUserProfile, fetchUserProfile, deleteAccount } from '../helpers/api';

// ИМПОРТИРУЕМ ХУКИ TON CONNECT ВМЕСТО КНОПКИ
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

type Props = {
  telegramId: number;
  onBack: () => void;
  onLogout: () => void;
};

export const SettingsScreen: React.FC<Props> = ({ telegramId, onBack, onLogout }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [userPhoto, setUserPhoto] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ХУКИ ДЛЯ РАБОТЫ С КОШЕЛЬКОМ
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  // Загружаем данные
  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        const tg = (window as any).Telegram?.WebApp;
        const tgUser = tg?.initDataUnsafe?.user;

        if (tgUser?.photo_url) {
            setUserPhoto(tgUser.photo_url);
        }

        try {
            const user = await fetchUserProfile(telegramId);
            if (user) {
                setFirstName(user.first_name || tgUser?.first_name || '');
                setLastName(user.last_name || tgUser?.last_name || '');
                setPhone(user.phone || '');
            }
        } catch (e) {
            if (tgUser) {
                setFirstName(tgUser.first_name || '');
                setLastName(tgUser.last_name || '');
            }
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [telegramId]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const tg = (window as any).Telegram?.WebApp;
    try {
      await updateUserProfile(telegramId, {
        first_name: firstName,
        last_name: lastName,
        phone: phone
      });
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      if (tg?.showAlert) {
          tg.showAlert('Профиль успешно обновлен!');
      } else {
          alert('Профиль успешно обновлен!');
      }
    } catch (e) {
      console.error(e);
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
      alert('Ошибка при сохранении. Попробуйте позже.');
    } finally {
      setSaving(false);
    }
  };

  const requestPhone = () => {
     const tg = (window as any).Telegram?.WebApp;
     if (tg && tg.requestContact) {
         tg.requestContact((ok: boolean, result: any) => {
             if (ok && result?.response?.contact?.phone_number) {
                 let p = result.response.contact.phone_number;
                 if (!p.startsWith('+')) p = '+' + p;
                 setPhone(p);
                 if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
             } else if (ok && result?.contact?.phone_number) {
                 let p = result.contact.phone_number;
                 if (!p.startsWith('+')) p = '+' + p;
                 setPhone(p);
                 if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
             } else {
                 if (tg.showAlert) tg.showAlert('Не удалось получить номер.');
             }
         });
     } else {
         alert('Эта функция работает только в мобильном приложении Telegram.');
     }
  };

  const handleDeleteAccountClick = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('warning');

    const confirmMessage = 'Вы уверены, что хотите навсегда удалить свой аккаунт? Ваши записи и данные будут стерты.';

     const executeDeletion = async () => {
      setLoading(true);
      try {
        await deleteAccount(telegramId);
      } catch (e: any) {
        console.error("Ошибка при удалении:", e);
        alert('Не удалось связаться с сервером, но мы все равно выйдем из аккаунта.');
      } finally {
        setLoading(false);
        onLogout();
      }
    };

    if (tg?.showConfirm) {
      tg.showConfirm(confirmMessage, (isConfirmed: boolean) => {
        if (isConfirmed) executeDeletion();
      });
    } else {
      const isConfirmed = window.confirm(confirmMessage);
      if (isConfirmed) executeDeletion();
    }
  };

  // ОБРАБОТЧИК КЛИКА ПО ЯЧЕЙКЕ КОШЕЛЬКА
  const handleWalletClick = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();

    if (wallet) {
      tonConnectUI.disconnect(); // Если подключен - отключаем
    } else {
      tonConnectUI.openModal(); // Если не подключен - открываем шторку
    }
  };

  // ФОРМАТИРОВАНИЕ АДРЕСА КОШЕЛЬКА
  const formatAddress = (address: string) => {
      return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div style={{
      backgroundColor: 'var(--tg-theme-secondary-bg-color)',
      minHeight: '100%',
      paddingBottom: 100
    }}>
      {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
              <Spinner size="l" />
          </div>
      ) : (
          <>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '32px 0 16px'
            }}>
               <Avatar
                  size={96}
                  src={userPhoto}
                  fallbackIcon={<Icon28UserCircleOutline width={48} height={48} />}
               />
               <div style={{
                   marginTop: 12,
                   fontSize: 20,
                   fontWeight: 600,
                   color: 'var(--tg-theme-text-color)'
               }}>
                   {firstName} {lastName}
               </div>
            </div>

            <List>

              {/* === КРАСИВАЯ НАТИВНАЯ ЯЧЕЙКА TON CONNECT === */}
              <Section header="Web3 (TON)" footer="Привяжите кошелек для будущих бонусов и скидок.">
                <Cell
                   onClick={handleWalletClick}
                   after={
                       <span style={{
                           color: wallet ? 'var(--tg-theme-hint-color)' : 'var(--tg-theme-link-color)',
                           fontWeight: 500,
                           fontSize: 15
                       }}>
                           {wallet ? formatAddress(wallet.account.address) : 'Подключить'}
                       </span>
                   }
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                          width: 28,
                          height: 28,
                          backgroundColor: '#0098EA',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                      }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white"/>
                              <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                      </div>

                      {/* НОВЫЙ БЛОК С ТЕКСТОМ И БЕЙДЖЕМ "СКОРО" */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 500, color: 'var(--tg-theme-text-color)' }}>TON Кошелек</span>
                          <span style={{
                              backgroundColor: 'rgba(255, 171, 0, 0.15)',
                              color: '#FFAB00',
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: 4,
                              textTransform: 'uppercase'
                          }}>Скоро</span>
                      </div>

                  </div>
                </Cell>
              </Section>
              {/* ================================================= */}

              <Section header="Личные данные">
                <Input
                  header="Имя"
                  placeholder="Ваше имя"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <Input
                  header="Фамилия"
                  placeholder="Ваша фамилия"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </Section>

              <Section
                header="Контакты"
                footer="Номер телефона нужен, чтобы мастера могли связаться с вами для подтверждения записи."
              >
                 <Input
                   header="Телефон"
                   placeholder="+7 999 000-00-00"
                   value={phone}
                   onChange={(e) => setPhone(e.target.value)}
                 />

                 <Cell
                   before={<Icon28PhoneOutline style={{ color: 'var(--tg-theme-button-color)' }} />}
                   onClick={requestPhone}
                 >
                   <span style={{ color: 'var(--tg-theme-button-color)', fontWeight: 500 }}>
                     Заполнить из Telegram
                   </span>
                 </Cell>
              </Section>

              <Section>
                 <Cell onClick={handleSave}>
                    <div style={{
                        color: 'var(--tg-theme-button-color)',
                        textAlign: 'center',
                        fontWeight: 500,
                        width: '100%'
                    }}>
                      {saving ? 'Сохранение...' : 'Сохранить изменения'}
                    </div>
                 </Cell>
              </Section>

              <Section header="Аккаунт" footer="Удаление аккаунта сотрет ваш профиль и историю записей из базы данных.">
                  <Cell
                      onClick={() => {
                          const isConfirmed = window.confirm('Вы точно хотите выйти из аккаунта?');
                          if (isConfirmed) onLogout();
                      }}
                  >
                      <span style={{ color: 'var(--tg-theme-text-color)', fontWeight: 500 }}>
                         Выйти из аккаунта
                      </span>
                  </Cell>

                  <Cell
                      onClick={handleDeleteAccountClick}
                  >
                      <span style={{ color: 'var(--tg-theme-destructive-text-color)', fontWeight: 500 }}>
                         Удалить аккаунт
                      </span>
                  </Cell>
              </Section>
            </List>
          </>
      )}
    </div>
  );
};