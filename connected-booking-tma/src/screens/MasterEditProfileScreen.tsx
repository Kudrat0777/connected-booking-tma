import React, { useState, useEffect } from 'react';
import {
  List,
  Input,
  Textarea,
  Button,
  Section,
  Avatar,
  Spinner
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


// =========================================================
// УМНЫЕ КОМПОНЕНТЫ ДЛЯ КАРТИНОК (ОБХОДЯТ ZROK И ПИШУТ ОШИБКИ)
// =========================================================
const SafeAvatar: React.FC<{ path: string, onChange: (e: any) => void }> = ({ path, onChange }) => {
    const [src, setSrc] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!path) return;
        const url = getFullImageUrl(path);
        if (!url) return;

        fetch(url)
            .then(res => res.ok ? res.blob() : Promise.reject())
            .then(blob => setSrc(URL.createObjectURL(blob)))
            .catch(() => {});
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
                if (!res.ok) throw new Error(`Ошибка Django: ${res.status}`);
                const blob = await res.blob();
                if (blob.type.includes('text/html')) throw new Error('Заблокировал Zrok');
                setSrc(URL.createObjectURL(blob));
            })
            .catch(e => setErr(e.message));
    }, [path]);

    if (err) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffebee', padding: 8, textAlign: 'center' }}>
                <span style={{ color: 'red', fontSize: 11, fontWeight: 'bold' }}>{err}</span>
            </div>
        );
    }

    if (!src) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--tgui--secondary_bg_color)' }}>
                <Spinner size="s" />
            </div>
        );
    }

    return <img src={src} alt="work" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
};
// =========================================================


type Props = {
  telegramId: number;
  initialData?: {
    name: string;
    bio: string;
    avatarUrl?: string;
    phone: string;
  };
  onBack: () => void;
  onSaved: () => void;
};

export const MasterEditProfileScreen: React.FC<Props> = ({
  telegramId,
  initialData,
  onBack,
  onSaved,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [bio, setBio] = useState(initialData?.bio || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
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
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingPortfolio(false);
      }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateMasterProfile(telegramId, { name, bio, phone });
      onSaved();
    } catch (e) {
      console.error(e);
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
      } catch (err) {
        alert('Ошибка загрузки аватара');
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setLoadingPortfolio(true);
          try {
              await uploadPortfolioPhoto(telegramId, e.target.files[0]);
              await loadPortfolio();
          } catch (err) {
              alert('Ошибка загрузки фото');
          } finally {
              setLoadingPortfolio(false);
          }
      }
  };

  const handleDeletePhoto = async (id: number) => {
      if(!window.confirm('Удалить фото?')) return;
      try {
          await deletePortfolioPhoto(id);
          setPortfolio(prev => prev.filter(p => p.id !== id));
      } catch(e) {
          alert('Ошибка удаления');
      }
  };

  return (
    <ScreenLayout title="Редактировать профиль" onBack={onBack}>
      <List style={{ background: 'var(--tgui--secondary_bg_color)', minHeight: '100vh', paddingBottom: 60 }}>

        {/* --- АВАТАР --- */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px 24px' }}>

          <SafeAvatar path={avatarUrl} onChange={handleAvatarChange} />

          <div style={{ marginTop: 12, color: 'var(--tgui--hint_color)', fontSize: 14 }}>
            Нажмите на фото, чтобы изменить
          </div>
        </div>

        {/* --- ЛИЧНЫЕ ДАННЫЕ --- */}
        <Section header="Личные данные">
          <Input header="Имя" placeholder="Как вас зовут?" value={name} onChange={(e) => setName(e.target.value)} />
          <Input header="Телефон" placeholder="+7 999 000 00 00" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Textarea header="О себе" placeholder="Расскажите о своем опыте и специализации..." value={bio} onChange={(e) => setBio(e.target.value)} />
        </Section>

        {/* --- ПОРТФОЛИО --- */}
        <Section header="Мое портфолио" footer="Загрузите фото ваших лучших работ.">
            <div style={{ padding: '16px', background: 'var(--tgui--bg_color)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>

                    {/* Фотографии портфолио */}
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

                    {/* Кнопка добавления фото */}
                    <label style={{
                        backgroundColor: 'var(--tgui--secondary_bg_color)',
                        borderRadius: 12, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        aspectRatio: '1/1', transition: 'opacity 0.2s',
                    }}>
                        {loadingPortfolio ? (
                            <Spinner size="m" />
                        ) : (
                            <>
                                <Icon28AddCircleOutline width={32} height={32} style={{ color: 'var(--tgui--hint_color)', marginBottom: 4 }} />
                                <span style={{ fontSize: 13, color: 'var(--tgui--hint_color)', fontWeight: 500 }}>Добавить</span>
                            </>
                        )}
                        <input type="file" hidden accept="image/*" onChange={handlePortfolioUpload} />
                    </label>

                </div>
            </div>
        </Section>

        <div style={{ padding: '24px 16px' }}>
           <Button size="l" mode="filled" stretched loading={loading} onClick={handleSave}>
             Сохранить изменения
           </Button>
        </div>

      </List>
    </ScreenLayout>
  );
};