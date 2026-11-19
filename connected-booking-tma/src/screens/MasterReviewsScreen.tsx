// Отзывы мастера в его кабинете.
import React from 'react';

import { fetchMasterReviews } from '../helpers/api';
import { useLanguage } from '../helpers/LanguageContext';
import { ReviewsView } from '../components/ReviewsView';

type Props = { telegramId: number; onBack: () => void };

export const MasterReviewsScreen: React.FC<Props> = ({ telegramId, onBack }) => {
  const { t } = useLanguage();
  return (
    <ReviewsView load={() => fetchMasterReviews(telegramId)} onBack={onBack}
      emptyTitle={t('rv_empty')} emptyText={t('rv_empty_desc')} />
  );
};
