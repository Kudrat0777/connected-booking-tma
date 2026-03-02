import React, { useState, useEffect } from 'react';
import {
  List,
  Input,
  Textarea,
  Button,
  Section,
  Avatar,
  Spinner,
  Select
} from '@telegram-apps/telegram-ui';
import {
  Icon28AddCircleOutline,
  Icon28DeleteOutline,
  Icon28UserCircleOutline
} from '@vkontakte/icons';

import { ScreenLayout } from '../components/ScreenLayout';

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
const SafeAvatar: React.FC<{ path: string, onChange: (e: any) => void }> = ({ path, onChange }) => {
    const [src, setSrc] = useState<string | undefined>(undefined);
    useEffect(() => {
        if (!path) return;
        const url = getFullImageUrl(path);
        if (!url) return;
        fetch(url).then(res => res.ok ? res.blob() : Promise.reject()).then(blob => setSrc(URL.createObjectURL(blob))).catch(() => {});
    }, [path]);

    return (
      <label style={{ position: 'relative', cursor: 'pointer' }}>
          <Avatar size={96} src={src || undefined} fallbackIcon={<Icon28UserCircleOutline />} />
          <div style={{
              position: 'absolute', bottom: 0, right: 0, background: 'var(--tgui--button_color)',
              border: '4px solid var(--tgui--secondary_bg_color)', borderRadius: '50%', width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}>
              <span style={{ color: 'var(--tgui--button_text_color)', fontSize: 24, lineHeight: '24px', marginTop: -2 }}>+</span>
          </div>
          <input type="file" hidden accept="image/*" onChange={onChange} />
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

    if (err) return <div style={{ width: '100%', height: '100%', background: '#ffebee' }} />;
    if (!src) return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--tgui--secondary_bg_color)' }}><Spinner size="s" /></div>;
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
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatarUrl || '');
  const [loading, setLoading] = useState(false);

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);

  useEffect(() => {
      loadPortfolio();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPortfolio = async () => {
      setLoadingPortfolio(true);
      try {
          const items = await fetchPortfolio(undefined, telegramId);
          setPortfolio(items);
      } catch (e) { console.error(e); }
      finally { setLoadingPortfolio(false); }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateMasterProfile(telegramId, { name, bio, phone, city, address });
      onSaved();
    } catch (e) {
      alert('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      try {
        const res = await uploadMasterAvatar(telegramId, e.target.files[0]);
        setAvatarUrl(res.avatar_url);
      } catch (err) { alert('Ошибка загрузки аватара'); }
      finally { setLoading(false); }
    }
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setLoadingPortfolio(true);
          try {
              await uploadPortfolioPhoto(telegramId, e.target.files[0]);
              await loadPortfolio();
          } catch (err) { alert('Ошибка загрузки фото'); }
          finally { setLoadingPortfolio(false); }
      }
  };

  const handleDeletePhoto = async (id: number) => {
      if(!window.confirm('Удалить фото?')) return;
      try {
          await deletePortfolioPhoto(id);
          setPortfolio(prev => prev.filter(p => p.id !== id));
      } catch(e) { alert('Ошибка удаления'); }
  };

  return (
    <ScreenLayout title="Редактировать профиль" onBack={onBack}>
      <List style={{ background: 'var(--tgui--secondary_bg_color)', minHeight: '100vh', paddingBottom: 60 }}>

        {/* --- АВАТАР --- */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px 24px' }}>
          <SafeAvatar path={avatarUrl} onChange={handleAvatarChange} />
          <div style={{ marginTop: 12, color: 'var(--tgui--hint_color)', fontSize: 14 }}>Нажмите на фото, чтобы изменить</div>
        </div>

        {/* --- ЛИЧНЫЕ ДАННЫЕ --- */}
        <Section header="Личные данные">
          <Input header="Имя" placeholder="Как вас зовут?" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea header="О себе" placeholder="Расскажите о своем опыте..." value={bio} onChange={(e) => setBio(e.target.value)} />
        </Section>

        {/* --- ЛОКАЦИЯ И КОНТАКТЫ --- */}
        <Section header="Локация и контакты" footer="Укажите номер телефона и точный адрес или вставьте ссылку на Яндекс/Google карты">
          <Input header="Телефон" placeholder="+998 90 000 00 00" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Select header="Город" value={city} onChange={(e) => setCity(e.target.value)}>
             {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Textarea
             header="Адрес или ссылка на карту"
             placeholder="Ул. Амира Темура 10, либо ссылка https://yandex.ru/maps/..."
             value={address}
             onChange={(e) => setAddress(e.target.value)}
          />
        </Section>

        {/* --- ПОРТФОЛИО --- */}
        <Section header="Мое портфолио" footer="Загрузите фото ваших лучших работ.">
            <div style={{ padding: '16px', background: 'var(--tgui--bg_color)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {portfolio.map(item => (
                        <div key={item.id} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 12, overflow: 'hidden' }}>
                            <SafePortfolioImage path={item.image_url} />
                            <div
                                onClick={() => handleDeletePhoto(item.id)}
                                style={{
                                    position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.5)',
                                    borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)'
                                }}
                            >
                                <Icon28DeleteOutline width={20} height={20} style={{ color: '#fff' }} />
                            </div>
                        </div>
                    ))}
                    <label style={{
                        backgroundColor: 'var(--tgui--secondary_bg_color)', borderRadius: 12, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', aspectRatio: '1/1'
                    }}>
                        {loadingPortfolio ? <Spinner size="m" /> : (
                            <><Icon28AddCircleOutline width={32} height={32} style={{ color: 'var(--tgui--hint_color)' }} /><span style={{ fontSize: 13, color: 'var(--tgui--hint_color)' }}>Добавить</span></>
                        )}
                        <input type="file" hidden accept="image/*" onChange={handlePortfolioUpload} />
                    </label>
                </div>
            </div>
        </Section>

        <div style={{ padding: '24px 16px' }}>
           <Button size="l" mode="filled" stretched loading={loading} onClick={handleSave}>Сохранить изменения</Button>
        </div>
      </List>
    </ScreenLayout>
  );
};