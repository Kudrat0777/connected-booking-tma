import React, { useState, useEffect, useRef } from 'react';
import {
  List,
  Input,
  Textarea,
  Section,
  Avatar,
  Spinner,
  Select,
  Text
} from '@telegram-apps/telegram-ui';
import {
  Icon28AddCircleOutline,
  Icon28DeleteOutline,
  Icon28UserCircleOutline
} from '@vkontakte/icons';

import {
  updateMasterProfile,
  uploadMasterAvatar,
  fetchPortfolio,
  uploadPortfolioPhoto,
  deletePortfolioPhoto,
  PortfolioItem,
  getFullImageUrl
} from '../helpers/api';

const CITIES = ['Ургенч', 'Ташкент', 'Самарканд', 'Бухара', 'Хива'];

// =========================================================
// УМНЫЕ КОМПОНЕНТЫ ДЛЯ КАРТИНОК
// =========================================================
const SafeAvatar: React.FC<{ path: string, onChange: (e: any) => void, loading?: boolean }> = ({ path, onChange, loading }) => {
    const [src, setSrc] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!path) return;
        const url = getFullImageUrl(path);
        if (!url) return;
        fetch(url).then(res => res.ok ? res.blob() : Promise.reject()).then(blob => setSrc(URL.createObjectURL(blob))).catch(() => {});
    }, [path]);

    return (
      <label style={{ position: 'relative', cursor: 'pointer', display: 'block' }}>
          <Avatar
             size={100}
             src={src || undefined}
             fallbackIcon={<Icon28UserCircleOutline width={50} height={50} style={{ color: 'var(--tg-theme-hint-color)' }} />}
             style={{ border: '4px solid var(--tg-theme-bg-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
          />
          {loading ? (
             <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <Spinner size="m" />
             </div>
          ) : (
             <div style={{
                 position: 'absolute', bottom: 0, right: 0, backgroundColor: 'var(--tg-theme-button-color)',
                 border: '4px solid var(--tg-theme-bg-color)', borderRadius: '50%', width: 34, height: 34,
                 display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
             }}>
                 <span style={{ color: 'var(--tg-theme-button-text-color)', fontSize: 24, lineHeight: '24px', marginTop: -2 }}>+</span>
             </div>
          )}
          <input type="file" hidden accept="image/*" onChange={onChange} disabled={loading} />
      </label>
    );
};

const SafePortfolioImage: React.FC<{ path: string }> = ({ path }) => {
    const [src, setSrc] = useState<string | undefined>(undefined);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!path) return;
        const url = getFullImageUrl(path);
        if (!url) return;
        fetch(url)
            .then(async (res) => {
                if (!res.ok) throw new Error(`Ошибка`);
                const blob = await res.blob();
                setSrc(URL.createObjectURL(blob));
            })
            .catch(e => setErr(e.message));
    }, [path]);

    if (err) return <div style={{ width: '100%', height: '100%', backgroundColor: 'rgba(255, 59, 48, 0.1)' }} />;
    if (!src) return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}><Spinner size="s" /></div>;
    return <img src={src} alt="work" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
};

type Props = {
  telegramId: number;
  initialData?: {
    name: string;
    bio: string;
    avatarUrl?: string;
    phone: string;
    city?: string;
    address?: string;
    experience_years?: number; // ДОБАВИЛИ ОПЫТ РАБОТЫ В PROPS
  };
  onBack: () => void;
  onSaved: () => void;
};

export const MasterEditProfileScreen: React.FC<Props> = ({ telegramId, initialData, onBack, onSaved }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [bio, setBio] = useState(initialData?.bio || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [city, setCity] = useState(initialData?.city || 'Ургенч');
  const [address, setAddress] = useState(initialData?.address || '');
  // Состояние для опыта работы (по умолчанию 0, если нет)
  const [experience, setExperience] = useState(initialData?.experience_years !== undefined ? String(initialData.experience_years) : '0');
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatarUrl || '');

  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);

  // Используем Ref для актуальных данных формы, чтобы нативная кнопка всегда видела свежие значения
  const formRef = useRef({ name, bio, phone, city, address, experience });
  useEffect(() => {
      formRef.current = { name, bio, phone, city, address, experience };
  }, [name, bio, phone, city, address, experience]);

  // НАСТРОЙКА НАТИВНЫХ КНОПОК
  useEffect(() => {
      const tg = (window as any).Telegram?.WebApp;
      if (!tg) return;

      tg.BackButton.onClick(onBack);
      tg.BackButton.show();

      const handleMainClick = async () => {
          if (loading || avatarLoading || loadingPortfolio) return;

          const currentForm = formRef.current;
          if (!currentForm.name.trim()) {
              if (tg.showAlert) tg.showAlert('Пожалуйста, укажите ваше имя.');
              if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
              return;
          }

          setLoading(true);
          tg.MainButton.showProgress();
          tg.MainButton.disable();

          try {
              // Передаем данные на бэкенд (преобразуя опыт в число)
              await updateMasterProfile(telegramId, {
                  ...currentForm,
                  experience_years: Number(currentForm.experience) || 0
              });

              if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
              onSaved();
          } catch (e) {
              if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
              alert('Ошибка при сохранении профиля');
          } finally {
              setLoading(false);
              tg.MainButton.hideProgress();
              tg.MainButton.enable();
          }
      };

      tg.MainButton.setParams({
          text: 'СОХРАНИТЬ',
          color: tg.themeParams?.button_color || '#3390ec',
          text_color: tg.themeParams?.button_text_color || '#ffffff',
          is_active: true,
          is_visible: true
      });
      tg.MainButton.onClick(handleMainClick);

      return () => {
          tg.BackButton.offClick(onBack);
          tg.BackButton.hide();
          tg.MainButton.offClick(handleMainClick);
          tg.MainButton.hide();
      };
  }, [onBack, onSaved, loading, avatarLoading, loadingPortfolio, telegramId]);

  useEffect(() => {
      loadPortfolio();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerHaptic = (type: 'light' | 'selection' | 'warning' = 'selection') => {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.HapticFeedback) {
          if (type === 'warning') tg.HapticFeedback.notificationOccurred('warning');
          else if (type === 'light') tg.HapticFeedback.impactOccurred('light');
          else tg.HapticFeedback.selectionChanged();
      }
  };

  const loadPortfolio = async () => {
      setLoadingPortfolio(true);
      try {
          const items = await fetchPortfolio(undefined, telegramId);
          setPortfolio(items);
      } catch (e) { console.error(e); }
      finally { setLoadingPortfolio(false); }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      triggerHaptic('light');
      setAvatarLoading(true);
      try {
        const res = await uploadMasterAvatar(telegramId, e.target.files[0]);
        setAvatarUrl(res.avatar_url);
      } catch (err) { alert('Ошибка загрузки аватара'); }
      finally { setAvatarLoading(false); }
    }
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          triggerHaptic('light');
          setLoadingPortfolio(true);
          try {
              await uploadPortfolioPhoto(telegramId, e.target.files[0]);
              await loadPortfolio();
          } catch (err) { alert('Ошибка загрузки фото'); }
          finally { setLoadingPortfolio(false); }
      }
  };

  const handleDeletePhoto = async (id: number) => {
      triggerHaptic('warning');
      if(!window.confirm('Удалить это фото из портфолио?')) return;
      try {
          await deletePortfolioPhoto(id);
          setPortfolio(prev => prev.filter(p => p.id !== id));
      } catch(e) { alert('Ошибка удаления'); }
  };

  return (
    <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', minHeight: '100vh', paddingBottom: 80 }}>

      {/* --- АВАТАР --- */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px 24px', backgroundColor: 'var(--tg-theme-bg-color)', borderBottom: '1px solid var(--tg-theme-secondary-bg-color)' }}>
        <SafeAvatar path={avatarUrl} onChange={handleAvatarChange} loading={avatarLoading} />
        <Text style={{ marginTop: 16, color: 'var(--tg-theme-hint-color)', fontSize: 14 }}>
            Нажмите на фото, чтобы изменить
        </Text>
      </div>

      <List style={{ padding: '0 16px', marginTop: 16 }}>

        {/* --- ЛИЧНЫЕ ДАННЫЕ --- */}
        <Section header="Личные данные">
          <Input
             header="Имя"
             placeholder="Как вас зовут?"
             value={name}
             onChange={(e) => setName(e.target.value)}
             onFocus={() => triggerHaptic('selection')}
          />
          <Input
             header="Опыт работы (лет)"
             placeholder="Например: 5"
             type="number"
             inputMode="numeric"
             value={experience}
             onChange={(e) => setExperience(e.target.value)}
             onFocus={() => triggerHaptic('selection')}
          />
          <Textarea
             header="О себе"
             placeholder="Расскажите о своем опыте и навыках..."
             value={bio}
             onChange={(e) => setBio(e.target.value)}
             onFocus={() => triggerHaptic('selection')}
          />
        </Section>

        {/* --- ЛОКАЦИЯ И КОНТАКТЫ --- */}
        <Section header="Локация и контакты" footer="Укажите номер телефона и точный адрес или вставьте ссылку на Яндекс/Google Карты.">
          <Input
             header="Телефон"
             placeholder="+998 90 000 00 00"
             type="tel"
             value={phone}
             onChange={(e) => setPhone(e.target.value)}
             onFocus={() => triggerHaptic('selection')}
          />
          <Select header="Город" value={city} onChange={(e) => { triggerHaptic('selection'); setCity(e.target.value); }}>
             {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Textarea
             header="Адрес или ссылка на карту"
             placeholder="Ул. Амира Темура 10, либо ссылка https://yandex.ru/maps/..."
             value={address}
             onChange={(e) => setAddress(e.target.value)}
             onFocus={() => triggerHaptic('selection')}
          />
        </Section>

        {/* --- ПОРТФОЛИО --- */}
        <Section header="Мое портфолио" footer="Загрузите фото ваших лучших работ (до 10 шт).">
            <div style={{ padding: '16px', backgroundColor: 'var(--tg-theme-bg-color)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {portfolio.map(item => (
                        <div key={item.id} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                            <SafePortfolioImage path={item.image_url} />
                            <div
                                onClick={() => handleDeletePhoto(item.id)}
                                style={{
                                    position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(255, 59, 48, 0.9)',
                                    borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}
                            >
                                <Icon28DeleteOutline width={18} height={18} style={{ color: '#fff' }} />
                            </div>
                        </div>
                    ))}

                    {/* КНОПКА ДОБАВЛЕНИЯ ФОТО */}
                    <label style={{
                        backgroundColor: 'var(--tg-theme-secondary-bg-color)', borderRadius: 12, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', aspectRatio: '1/1',
                        border: '2px dashed rgba(0,0,0,0.1)', transition: 'background-color 0.2s ease'
                    }}>
                        {loadingPortfolio ? <Spinner size="m" /> : (
                            <>
                               <Icon28AddCircleOutline width={32} height={32} style={{ color: 'var(--tg-theme-hint-color)', marginBottom: 4 }} />
                               <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', fontWeight: 500 }}>Добавить</span>
                            </>
                        )}
                        <input type="file" hidden accept="image/*" onChange={handlePortfolioUpload} disabled={loadingPortfolio} />
                    </label>
                </div>
            </div>
        </Section>

      </List>
    </div>
  );
};