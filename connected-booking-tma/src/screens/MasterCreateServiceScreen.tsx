import React, { useState, useEffect } from 'react';
import {
  Input,
  Button,
  Select,
  Textarea,
  Modal
} from '@telegram-apps/telegram-ui';
import { createServiceByMaster } from '../helpers/api';

// ИМПОРТИРУЕМ ХУК ЛОКАЛИЗАЦИИ
import { useLanguage } from '../helpers/LanguageContext';

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
  // ПОДКЛЮЧАЕМ ПЕРЕВОДЫ
  const { t } = useLanguage();

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
      if (tg?.showAlert) tg.showAlert(t('m_error_fill_fields'));
      else alert(t('m_error_fill_fields'));
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
      alert(t('m_error_create_service'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      header={<Modal.Header>{t('m_new_service_title')}</Modal.Header>}
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
          header={t('m_service_name')}
          placeholder={t('m_service_name_placeholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Input
          header={t('m_service_price')}
          placeholder={t('m_service_price_placeholder')}
          type="number"
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <Select
          header={t('m_service_duration')}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        >
          <option value="15">15 {t('min')}</option>
          <option value="30">30 {t('min')}</option>
          <option value="45">45 {t('min')}</option>
          <option value="60">{t('m_hour_1')}</option>
          <option value="90">{t('m_hour_1_5')}</option>
          <option value="120">{t('m_hour_2')}</option>
          <option value="150">{t('m_hour_2_5')}</option>
          <option value="180">{t('m_hour_3')}</option>
          <option value="240">{t('m_hour_4')}</option>
        </Select>

        <Textarea
          header={t('m_service_desc')}
          placeholder={t('m_service_desc_placeholder')}
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
            {t('m_btn_create_service')}
          </Button>
          <Button
            size="l"
            mode="plain"
            stretched
            onClick={onClose}
            style={{ marginTop: 8 }}
          >
            {t('m_btn_cancel')}
          </Button>
        </div>

      </div>
    </Modal>
  );
};