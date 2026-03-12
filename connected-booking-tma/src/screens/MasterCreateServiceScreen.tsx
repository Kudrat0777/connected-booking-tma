import React, { useState, useEffect } from 'react';
import {
  Input,
  Button,
  Select,
  Textarea,
  Modal
} from '@telegram-apps/telegram-ui';
import { createServiceByMaster } from '../helpers/api';

type Props = {
  telegramId: number;
  isOpen: boolean;        // Модалка открыта/закрыта
  onClose: () => void;    // Закрытие без сохранения
  onSuccess: () => void;  // Успешное создание
};

export const MasterCreateServiceScreen: React.FC<Props> = ({
  telegramId,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('60'); // 1 час по умолчанию
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Очистка формы при открытии
  useEffect(() => {
      if (isOpen) {
          setName('');
          setPrice('');
          setDuration('60');
          setDescription('');
      }
  }, [isOpen]);

  const handleSubmit = async () => {
    const tg = (window as any).Telegram?.WebApp;

    if (!name.trim() || !price || !duration) {
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
      if (tg?.showAlert) tg.showAlert('Заполните обязательные поля: Название и Цена');
      else alert('Заполните обязательные поля');
      return;
    }

    setLoading(true);
    try {
      await createServiceByMaster(
        telegramId,
        name.trim(),
        Number(price),
        Number(duration),
        description.trim()
      );
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      onSuccess();
    } catch (e: any) {
      console.error(e);
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
      alert('Ошибка ��ри создании услуги');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      header={<Modal.Header>Новая услуга</Modal.Header>}
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <div style={{
          padding: '0 16px 80px', // Большой отступ снизу для клавиатуры
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          maxHeight: '85vh',
          overflowY: 'auto'
      }}>

        <Input
          header="Название услуги"
          placeholder="Например: Мужская стрижка"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Input
          header="Цена (UZS)"
          placeholder="Например: 50000"
          type="number"
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <Select
          header="Длительность"
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
          placeholder="Что входит в эту услугу? Эта информация поможет клиенту."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div style={{ marginTop: 16 }}>
          <Button
            size="l"
            mode="filled"
            stretched
            loading={loading}
            onClick={handleSubmit}
          >
            Создать услугу
          </Button>
          <Button
            size="l"
            mode="plain"
            stretched
            onClick={onClose}
            style={{ marginTop: 8 }}
          >
            Отмена
          </Button>
        </div>

      </div>
    </Modal>
  );
};