import React, { useState, useEffect } from 'react';
import {
  List,
  Section,
  Input,
  Button,
  Cell,
  Avatar,
  Spinner
} from '@telegram-apps/telegram-ui';
import { ScreenLayout } from '../components/ScreenLayout';
import { Icon28PhoneOutline, Icon28UserCircleOutline } from '@vkontakte/icons';
import { updateUserProfile, fetchUserProfile, deleteAccount } from '../helpers/api';

type Props = {
  telegramId: number;
  onBack: () => void;
  onLogout: () => void; // Мы оставим название пропса onLogout, но по факту он будет вызываться после удаления аккаунта
};

export const SettingsScreen: React.FC<Props> = ({ telegramId, onBack, onLogout }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 1. Загружаем данные при открытии
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
    setSaving(true);
    try {
      await updateUserProfile(telegramId, {
        first_name: firstName,
        last_name: lastName,
        phone: phone
      });
      alert('✅ Профиль успешно обновлен!');
    } catch (e) {
      console.error(e);
      alert('❌ Ошибка при сохранении. Попробуйте позже.');
    } finally {
      setSaving(false);
    }
  };

  // 3. Запрос телефона у Telegram
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
                 alert('Не удалось получить номер или вы отменили действие.');
             }
         });
     } else {
         alert('Эта функция работает только в мобильном приложении Telegram.');
     }
  };

  // 4. Логика УДАЛЕНИЯ аккаунта
  const handleDeleteAccountClick = () => {
    const tg = (window as any).Telegram?.WebApp;
    const confirmMessage = 'Вы уверены, что хотите навсегда удалить свой аккаунт? Ваши данные будут стерты.';

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
    <ScreenLayout title="Настройки" onBack={onBack}>
       <div style={{
           height: 'calc(100vh - 120px)',
           overflowY: 'auto',
           WebkitOverflowScrolling: 'touch',
           paddingBottom: 40
       }}>
          <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
             <Avatar size={96} src={undefined} fallbackIcon={<Icon28UserCircleOutline />} />
          </div>

          {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                  <Spinner size="m" />
              </div>
          ) : (
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
                    placeholder="Ваше фамилия"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </Section>

                <Section header="Контакты">
                   <Input
                     header="Телефон"
                     placeholder="+7 999 000-00-00"
                     value={phone}
                     onChange={(e) => setPhone(e.target.value)}
                   />
                   <Cell>
                     <Button
                        mode="bezeled"
                        before={<Icon28PhoneOutline />}
                        stretched
                        onClick={requestPhone}
                     >
                        Взять из Telegram
                     </Button>
                   </Cell>
                   <div style={{ padding: '0 16px 16px', fontSize: 12, color: 'var(--tgui--hint_color)' }}>
                      Номер телефона нужен, чтобы мастера могли связаться с вами для подтверждения записи.
                   </div>
                </Section>

                <Section>
                   <Cell>
                     <Button
                        mode="filled"
                        size="l"
                        stretched
                        loading={saving}
                        onClick={handleSave}
                     >
                        Сохранить изменения
                     </Button>
                   </Cell>
                </Section>

                <Section footer="Удаление аккаунта сотрет ваш профиль из базы данных.">
                    <Cell>
                        <Button
                          mode="bezeled"
                          size="m"
                          stretched
                          onClick={handleDeleteAccountClick}
                          style={{color: 'var(--tgui--destructive_text_color)', borderColor: 'var(--tgui--destructive_text_color)'}}
                        >
                            Удалить аккаунт
                        </Button>
                    </Cell>
                </Section>
              </List>
          )}
      </div>
    </ScreenLayout>
  );
};