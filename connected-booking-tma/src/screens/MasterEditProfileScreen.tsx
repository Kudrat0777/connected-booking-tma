import React, { useState, useRef } from 'react';
import {
  List,
  Section,
  Input,
  Button,
  Avatar,
  Textarea
} from '@telegram-apps/telegram-ui';
import { Icon28AddCircleOutline } from '@vkontakte/icons';
import { updateMasterProfile, uploadMasterAvatar } from '../helpers/api';
import { ScreenLayout } from '../components/ScreenLayout';

type Props = {
  telegramId: number;
  initialData?: { name: string; bio: string; avatarUrl?: string; phone?: string };
  onBack: () => void;
  onSaved: () => void;
};

export const MasterEditProfileScreen: React.FC<Props> = ({ telegramId, initialData, onBack, onSaved }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [bio, setBio] = useState(initialData?.bio || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatarUrl || '');

  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Обработка выбора файла
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const res = await uploadMasterAvatar(telegramId, file);
      setAvatarUrl(res.avatar_url); // Сразу показываем новую аватарку
    } catch (err) {
      console.error(err);
      alert('Не удалось загрузить фото');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return alert('Имя не может быть пустым');

    setLoading(true);
    try {
      await updateMasterProfile(telegramId, { name, bio, phone });
      onSaved(); // Возвращаемся назад и обновляем данные
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout title="Редактирование" onBack={onBack}>
      <List style={{ background: 'var(--tgui--secondary_bg_color)' }}>

        {/* СЕКЦИЯ АВАТАРКИ */}
        <Section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20 }}>
           <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
             <Avatar size={96} src={avatarUrl} />
             <div style={{
               position: 'absolute', bottom: 0, right: 0,
               background: 'var(--tgui--button_color)',
               borderRadius: '50%', padding: 4, border: '2px solid var(--tgui--bg_color)'
             }}>
               <Icon28AddCircleOutline style={{ color: '#fff', width: 20, height: 20 }} />
             </div>
           </div>
           <input
             type="file"
             ref={fileInputRef}
             style={{ display: 'none' }}
             accept="image/*"
             onChange={handleFileChange}
           />
        </Section>

        {/* СЕКЦИЯ ДАННЫХ */}
        <Section header="Основная информация">
          <Input
            header="Имя мастера"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Как вас видят клиенты"
          />
          <Input
            header="Телефон"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+7 900 ..."
          />
          <Textarea
            header="О себе (Bio)"
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Напишите о своем опыте и навыках..."
          />
        </Section>

        <Section>
          <Button size="l" mode="filled" stretched loading={loading} onClick={handleSave}>
            Сохранить изменения
          </Button>
        </Section>

      </List>
    </ScreenLayout>
  );
};