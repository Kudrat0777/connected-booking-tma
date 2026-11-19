// Отзывы о мастере для клиента: открываются поверх страницы мастера.
import React from 'react';

import { fetchReviews } from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { ReviewsView } from '../components/ReviewsView';

type Props = {
  masterId: number;
  onClose: () => void;
};

export const ReviewsListScreen: React.FC<Props> = ({ masterId, onClose }) => {
  const { t } = useLanguage();
  // Поверх страницы мастера: показываем, только когда открыли
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, overflowY: 'auto' }}>
      <ReviewsView load={() => fetchReviews(masterId, 200)} onBack={onClose}
        emptyTitle={t('rv_empty_client')} emptyText={t('rv_empty_client_desc')} />
    </div>
  );
};
