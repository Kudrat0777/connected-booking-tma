import React, { useState } from 'react';
import {
  Input,
  Button,
  Section,
  Select,
  Textarea
} from '@telegram-apps/telegram-ui';
import { ScreenLayout } from '../components/ScreenLayout';
import { createServiceByMaster } from '../helpers/api';

type Props = {
  telegramId: number;
  onBack: () => void;
  onSuccess: () => void;
};

export const MasterCreateServiceScreen: React.FC<Props> = ({ telegramId, onBack, onSuccess }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('60'); // 60 минут по умолчанию
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !price || !duration) {
      alert('Заполните обязательные поля (Название, Цена, Длительность)');
      return;
    }

    setLoading(true);
    try {
      await createServiceByMaster(
        telegramId,
        name,
        Number(price),
        Number(duration),
        description
      );
      onSuccess();
    } catch (e: any) {
      console.error(e);
      alert('Ошибка при создании услуги');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout title="Новая услуга" onBack={onBack}>
      <div style={{ padding: 16 }}>

        <Section header="Основное">
           <Input
             header="Название"
             placeholder="Например: Мужская стрижка"
             value={name}
             onChange={(e) => setName(e.target.value)}
           />
           <Input
             header="Цена (₽)"
             placeholder="1000"
             type="number"
             value={price}
             onChange={(e) => setPrice(e.target.value)}
           />
        </Section>

        <Section header="Длительность и описание">
           {/* Используем header прямо в Select, как в Input */}
           <Select
             header="Длительность"
             value={duration}
             onChange={(e) => setDuration(e.target.value)}
           >
                <option value="30">30 мин</option>
                <option value="60">1 час</option>
                <option value="90">1.5 часа</option>
                <option value="120">2 часа</option>
                <option value="180">3 часа</option>
           </Select>

           <Textarea
             header="Описание (необязательно)"
             placeholder="Что входит в услугу..."
             value={description}
             onChange={(e) => setDescription(e.target.value)}
           />
        </Section>

        <div style={{ marginTop: 24 }}>
           <Button
             size="l"
             mode="filled"
             stretched
             loading={loading}
             onClick={handleSubmit}
           >
             Создать услугу
           </Button>
        </div>

      </div>
    </ScreenLayout>
  );
};