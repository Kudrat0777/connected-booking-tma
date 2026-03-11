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
import '../css/SettingsScreen.css';

type Props = {
  telegramId: number;
  onBack: () => void;
  onLogout: () => void;
};

export const SettingsScreen: React.FC<Props> = ({ telegramId, onBack, onLogout }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Загружаем данные при открытии
  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        try {
            const user = await fetchUserProfile(telegramId);
            if (user) {
                setFirstName(user.first_name || '');
                setLastName(user.last_name || '');
                setPhone(user.phone || '');
            }
        } catch (e) {
            const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
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
    try {
      await updateUserProfile(telegramId, {
        first_name: firstName,
        last_name: lastName,
        phone: phone
      });
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.showAlert) {
          tg.showAlert('Профиль успешно обновлен!');
      } else {
          alert('Профиль успешно обновлен!');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка при сохранении. Попробуйте позже.');
    } finally {
      setSaving(false);
    }
  };

  // Запрос телефона у Telegram
  const requestPhone = () => {
     const tg = (window as any).Telegram?.WebApp;
     if (tg && tg.requestContact) {
         tg.requestContact((ok: boolean, result: any) => {
             if (ok && result?.response?.contact?.phone_number) {
                 let p = result.response.contact.phone_number;
                 if (!p.startsWith('+')) p = '+' + p;
                 setPhone(p);
             } else if (ok && result?.contact?.phone_number) {
                 let p = result.contact.phone_number;
                 if (!p.startsWith('+')) p = '+' + p;
                 setPhone(p);
             } else {
                 if (tg.showAlert) tg.showAlert('Не удалось получить номер.');
             }
         });
     } else {
         alert('Эта функция работает только в мобильном приложении Telegram.');
     }
  };

  // Логика удаления аккаунта
  const handleDeleteAccountClick = () => {
    const tg = (window as any).Telegram?.WebApp;
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
        if (isConfirmed) {
          executeDeletion();
        }
      });
    } else {
      const isConfirmed = window.confirm(confirmMessage);
      if (isConfirmed) {
        executeDeletion();
      }
    }
  };

  return (
    <div className="settings-root">
      {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
              <Spinner size="l" />
          </div>
      ) : (
          <>
            <div className="settings-avatar-container">
               <Avatar size={96} src={undefined} fallbackIcon={<Icon28UserCircleOutline width={48} height={48} />} />
            </div>

            <List>
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

              {/* Секция с контактами и ячейкой действия */}
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

                 {/* Кликабельная ячейка вместо кнопки */}
                 <Cell
                   before={<Icon28PhoneOutline style={{ color: 'var(--tg-theme-button-color)' }} />}
                   onClick={requestPhone}
                 >
                   <span className="cell-action-left" style={{ color: 'var(--tg-theme-button-color)' }}>
                     Заполнить из Telegram
                   </span>
                 </Cell>
              </Section>

              {/* Ячейка сохранения */}
              <Section>
                 <Cell onClick={handleSave}>
                    <div className="cell-action-center" style={{ color: 'var(--tg-theme-button-color)' }}>
                      {saving ? 'Со��ранение...' : 'Сохранить изменения'}
                    </div>
                 </Cell>
              </Section>

              {/* Опасная зона */}
              <Section footer="Удаление аккаунта сотрет ваш профиль и историю записей из базы данных.">
                  <Cell onClick={handleDeleteAccountClick}>
                      <div className="cell-action-center" style={{ color: 'var(--tg-theme-destructive-text-color)' }}>
                         Удалить аккаунт
                      </div>
                  </Cell>
              </Section>
            </List>
          </>
      )}
    </div>
  );
};