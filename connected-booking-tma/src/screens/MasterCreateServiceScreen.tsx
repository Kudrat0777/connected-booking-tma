import React, { useState } from 'react';
import {
  Input,
  Button,
  Section,
  Select,
  Textarea,
  List
} from '@telegram-apps/telegram-ui';
import { Icon28ChevronLeftOutline } from '@vkontakte/icons';
import { createServiceByMaster } from '../helpers/api';
import '../css/MasterCreateServiceScreen.css';

type Props = {
  telegramId: number;
  onBack: () => void;
  onSuccess: () => void;
};

export const MasterCreateServiceScreen: React.FC<Props> = ({ telegramId, onBack, onSuccess }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('60'); // 1 χас по емолчанию
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
    <div className="master-create-service-root">
      <div className="master-create-service-container">
        <div className="master-create-service-header">
          <button className="master-create-service-back-btn" onClick={onBack}>
            <Icon28ChevronLeftOutline />
          </button>
          <h1 className="master-create-service-title">Новая услуга</h1>
        </div>

        <div className="master-create-service-content">
          <List>
            <Section header="Основное">
              <Input
                header="Название"
                placeholder="Например: Мужская стрижка"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                header="Цена (сум)"
                placeholder="50000"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </Section>

            <Section header="Длительность и описание">
              <Select
                header="Фдлительность"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              >
                <option value="15">15 мин</option>
                <option value="30">30 мин</option>
                <option value="45">45 мин</option>
                <option value="60">1 час</option>
                <option value="90">1.5 часа</option>
                <option value="120">2 часа</option>
                <option value="150">2.5 часа</option>
                <option value="180">3 часа</option>
                <option value="240">4 часа</option>
              </Select>

              <Textarea
                header="Описание (необязательно)"
                placeholder="Что входит в услугу..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Section>
          </List>

          <div className="master-create-service-actions">
            <Button
              size="l"
              mode="filled"
              stretched
              loading={loading}
              onClick={handleSubmit}
            >
              Создать услугь
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};