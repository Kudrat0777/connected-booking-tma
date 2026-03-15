import React, { useState, useEffect } from 'react';
import {
  List,
  Section,
  Input,
  Cell,
  Avatar,
  Spinner,
  Select
} from '@telegram-apps/telegram-ui';
import { Icon28PhoneOutline, Icon28UserCircleOutline } from '@vkontakte/icons';

import { updateUserProfile, fetchUserProfile, deleteAccount, updateMasterProfile } from '../helpers/api';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

import { useLanguage } from '../helpers/LanguageContext';
import { LangCode } from '../helpers/translations';

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

  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  const { lang, setLang, t } = useLanguage();

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
        phone: phone,
      });
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      if (tg?.showAlert) tg.showAlert(t('success') || 'Success!');
    } catch (e) {
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
    } finally {
      setSaving(false);
    }
  };

  const handleLangChange = async (newLang: LangCode) => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();

    setLang(newLang);

    if (telegramId) {
        try {
            // Обновляем язык для клиента
            await updateUserProfile(telegramId, { language: newLang });

            // Пытаемся обновить язык для профиля мастера (ошибку игнорируем, если он не мастер)
            await updateMasterProfile(telegramId, { language: newLang }).catch(() => {});
        } catch (e) {
            console.error("Failed to update language on backend:", e);
        }
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
             }
         });
     }
  };

  const handleDeleteAccountClick = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('warning');

    const executeDeletion = async () => {
      setLoading(true);
      try {
        await deleteAccount(telegramId);
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoading(false);
        onLogout();
      }
    };

    if (tg?.showConfirm) {
      tg.showConfirm('Are you sure?', (isConfirmed: boolean) => {
        if (isConfirmed) executeDeletion();
      });
    } else {
      if (window.confirm('Are you sure?')) executeDeletion();
    }
  };

  const handleWalletClick = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();

    if (wallet) {
      tonConnectUI.disconnect();
    } else {
      tonConnectUI.openModal();
    }
  };

  const formatAddress = (address: string) => {
      return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', minHeight: '100%', paddingBottom: 100 }}>
      {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}><Spinner size="l" /></div>
      ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0 16px' }}>
               <Avatar size={96} src={userPhoto} fallbackIcon={<Icon28UserCircleOutline width={48} height={48} />} />
               <div style={{ marginTop: 12, fontSize: 20, fontWeight: 600, color: 'var(--tg-theme-text-color)' }}>
                   {firstName} {lastName}
               </div>
            </div>

            <List>
              {/* ================= ВЫБОР ЯЗЫКА ================= */}
              <Section>
                  <Select
                     header="Language / Язык / Til"
                     value={lang}
                     onChange={(e) => handleLangChange(e.target.value as LangCode)}
                  >
                     <option value="en">🇬🇧 English</option>
                     <option value="ru">🇷🇺 Русский</option>
                     <option value="uz">🇺🇿 O'zbekcha</option>
                  </Select>
              </Section>

              {/* ================= WEB 3 ================= */}
              <Section header={t('web3_title')} footer={t('web3_desc')}>
                <Cell
                   onClick={handleWalletClick}
                   after={
                       <span style={{ color: wallet ? 'var(--tg-theme-hint-color)' : 'var(--tg-theme-link-color)', fontWeight: 500, fontSize: 15 }}>
                           {wallet ? formatAddress(wallet.account.address) : t('connect')}
                       </span>
                   }
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 28, height: 28, backgroundColor: '#0098EA', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white"/>
                              <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 500, color: 'var(--tg-theme-text-color)' }}>{t('ton_wallet')}</span>
                          <span style={{ backgroundColor: 'rgba(255, 171, 0, 0.15)', color: '#FFAB00', fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>
                              {t('soon')}
                          </span>
                      </div>
                  </div>
                </Cell>
              </Section>

              {/* ================= ЛИЧНЫЕ ДАННЫЕ ================= */}
              <Section header={t('personal_data')}>
                <Input
                  header={t('first_name')}
                  placeholder={t('first_name')}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <Input
                  header={t('last_name')}
                  placeholder={t('last_name')}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </Section>

              {/* ================= КОНТАКТЫ ================= */}
              <Section header={t('contacts')}>
                 <Input
                   header={t('phone')}
                   placeholder="+7 999 000-00-00"
                   value={phone}
                   onChange={(e) => setPhone(e.target.value)}
                 />
                 <Cell before={<Icon28PhoneOutline style={{ color: 'var(--tg-theme-button-color)' }} />} onClick={requestPhone}>
                   <span style={{ color: 'var(--tg-theme-button-color)', fontWeight: 500 }}>{t('fill_from_tg')}</span>
                 </Cell>
              </Section>

              <Section>
                 <Cell onClick={handleSave}>
                    <div style={{ color: 'var(--tg-theme-button-color)', textAlign: 'center', fontWeight: 500, width: '100%' }}>
                      {saving ? t('saving') : t('save_changes')}
                    </div>
                 </Cell>
              </Section>

              <Section header={t('account')}>
                  <Cell onClick={() => { if (window.confirm('Log out?')) onLogout(); }}>
                      <span style={{ color: 'var(--tg-theme-text-color)', fontWeight: 500 }}>{t('logout')}</span>
                  </Cell>
                  <Cell onClick={handleDeleteAccountClick}>
                      <span style={{ color: 'var(--tg-theme-destructive-text-color)', fontWeight: 500 }}>{t('delete_account')}</span>
                  </Cell>
              </Section>
            </List>
          </>
      )}
    </div>
  );
};