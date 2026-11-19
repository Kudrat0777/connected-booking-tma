// Отзывы о мастере для клиента (со страницы мастера).
import React from 'react';

import { fetchReviews } from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { ReviewsView } from '../components/ReviewsView';

type Props = {
  masterId: number;
  isOpen?: boolean; // осталось от старой модалки, экран теперь всегда открыт целиком
  onClose: () => void;
};

export const ReviewsListScreen: React.FC<Props> = ({ masterId, onClose }) => {
  const { t } = useLanguage();
  return (
    <ReviewsView load={() => fetchReviews(masterId, 200)} onBack={onClose}
      emptyTitle={t('rv_empty_client')} emptyText={t('rv_empty_client_desc')} />
  );
};
