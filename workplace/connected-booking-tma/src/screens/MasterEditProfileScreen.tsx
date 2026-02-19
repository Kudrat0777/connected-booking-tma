import React, { useState, useEffect, useRef } from 'react';
import {
  Input,
  Textarea,
  Button,
  Section,
  Avatar,
  File,
  Spinner,
  Cell
} from '@telegram-apps/telegram-ui';
import { Icon28AddCircleOutline, Icon28DeleteOutline } from '@vkontakte/icons';
import { ScreenLayout } from '../components/ScreenLayout';
import {
  updateMasterProfile,
  uploadMasterAvatar,
  fetchPortfolio,
  uploadPortfolioPhoto,
  deletePortfolioPhoto,
  PortfolioItem
} from '../helpers/api';

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

  // State для портфолио
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);

  useEffect(() => {
      // Загружаем портфолио при открытии
      loadPortfolio();
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
              await loadPortfolio(); // Перезагружаем список
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
      <div style={{ padding: 16, paddingBottom: 50 }}>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <label style={{ position: 'relative', cursor: 'pointer' }}>
             <Avatar size={96} src={avatarUrl} />
             <div style={{
               position: 'absolute', bottom: 0, right: 0,
               background: 'var(--tgui--link_color)', borderRadius: '50%',
               width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center'
             }}>
               <span style={{ color: '#fff', fontSize: 16 }}>+</span>
             </div>
             <input type="file" hidden accept="image/*" onChange={handleAvatarChange} />
          </label>
        </div>

        <Section header="Личные данные">
          <Input
            header="Имя"
            placeholder="Ваше имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Textarea
            header="О себе"
            placeholder="Расскажите о своем опыте..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <Input
            header="Телефон"
            placeholder="+7..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Section>

        {/* СЕКЦИЯ ПОРТФОЛИО */}
        <Section header="Мое портфолио">
            <div style={{ padding: 12 }}>
                {/* Сетка фото */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                    {portfolio.map(item => (
                        <div key={item.id} style={{ position: 'relative', aspectRatio: '1/1' }}>
                            <img
                                src={item.image_url}
                                alt="work"
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                            />
                            <div
                                onClick={() => handleDeletePhoto(item.id)}
                                style={{
                                    position: 'absolute', top: 4, right: 4,
                                    background: 'rgba(0,0,0,0.5)', borderRadius: '50%',
                                    width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                <Icon28DeleteOutline style={{ width: 16, height: 16, color: '#fff' }} />
                            </div>
                        </div>
                    ))}

                    {/* Кнопка добавления */}
                    <label style={{
                        border: '2px dashed var(--tgui--hint_color)',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        aspectRatio: '1/1'
                    }}>
                        {loadingPortfolio ? <Spinner size="s" /> : <Icon28AddCircleOutline style={{ color: 'var(--tgui--link_color)' }} />}
                        <input type="file" hidden accept="image/*" onChange={handlePortfolioUpload} />
                    </label>
                </div>
                <div style={{ fontSize: 12, color: 'var(--tgui--hint_color)', textAlign: 'center' }}>
                    Загрузите фото ваших лучших работ
                </div>
            </div>
        </Section>

        <div style={{ marginTop: 24 }}>
           <Button size="l" mode="filled" stretched loading={loading} onClick={handleSave}>
             Сохранить изменения
           </Button>
        </div>

      </div>
    </ScreenLayout>
  );
};