import React, { useEffect, useState } from 'react';
import {
  Modal,
  Placeholder,
  Spinner,
  Avatar,
  Text,
  Title
} from '@telegram-apps/telegram-ui';
import { Icon28Favorite } from '@vkontakte/icons';
import { fetchReviews, Review } from '../helpers/api';

// ИМПОРТИРУЕМ ХУК ЛОКАЛИЗАЦИИ
import { useLanguage } from '../helpers/LanguageContext';

type Props = {
  masterId: number;
  isOpen: boolean;       // Новое свойство: открыта ли модалка
  onClose: () => void;   // Новое свойство: закрытие модалки
};

export const ReviewsListScreen: React.FC<Props> = ({ masterId, isOpen, onClose }) => {
  // ПОДКЛЮЧАЕМ ПЕРЕВОДЫ
  const { t, lang } = useLanguage();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Загружаем отзывы только когда модалка открывается
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchReviews(masterId)
        .then(setReviews)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [masterId, isOpen]);

  const average = reviews.length
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  // Локализация даты
  const localeForDate = lang === 'uz' ? 'uz-UZ' : (lang === 'en' ? 'en-US' : 'ru-RU');

  // Формируем текст "На основе Х оценок" (используем ключи, добавленные ранее для MasterReviewsScreen)
  let ratingsText = '';
  if (lang === 'uz') {
      ratingsText = `${reviews.length} ${t('m_reviews_ratings_many')} ${t('m_reviews_based_on').toLowerCase()}`;
  } else {
      const ratingWord = reviews.length === 1 ? t('m_reviews_ratings_1') : t('m_reviews_ratings_many');
      ratingsText = `${t('m_reviews_based_on')} ${reviews.length} ${ratingWord}`;
  }

  return (
    <Modal
      header={<Modal.Header>{t('reviews_modal_title')}</Modal.Header>}
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <div style={{
          padding: '0 16px 32px',
          backgroundColor: 'var(--tg-theme-bg-color)',
          minHeight: '40vh',
          maxHeight: '80vh',
          overflowY: 'auto'
      }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
            <Spinner size="l" />
          </div>
        ) : reviews.length === 0 ? (
          <Placeholder
            header={t('m_reviews_no_reviews')}
            description={t('reviews_first_to_rate')}
          >
             <div style={{ fontSize: 40 }}>💬</div>
          </Placeholder>
        ) : (
          <>
            {/* Блок статистики сверху */}
            <div style={{
                padding: '16px',
                textAlign: 'center',
                backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                borderRadius: '16px',
                marginBottom: '24px'
            }}>
               <div style={{ fontSize: 40, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--tg-theme-text-color)' }}>
                  <Icon28Favorite style={{ color: '#FFB703', width: 36, height: 36 }} />
                  {average}
               </div>
               <div style={{ color: 'var(--tg-theme-hint-color)', fontSize: 15, marginTop: '4px' }}>
                  {ratingsText}
               </div>
            </div>

            {/* Список отзывов (без Section и Cell, так как в модалке красивее смотрится лента) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {reviews.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px' }}>
                  <Avatar size={44} fallbackIcon={<span style={{fontSize: 22}}>👤</span>} />

                  <div style={{ flex: 1, borderBottom: i === reviews.length - 1 ? 'none' : '1px solid var(--tg-theme-secondary-bg-color)', paddingBottom: '16px' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                       <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--tg-theme-text-color)' }}>
                         {r.author_name || t('m_reviews_client')}
                       </span>
                       <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
                          {new Date(r.created_at).toLocaleDateString(localeForDate)}
                       </span>
                    </div>

                    <div style={{ display: 'flex', color: '#FFB703', fontSize: 14, marginBottom: '8px' }}>
                       {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                    </div>

                    {r.text && (
                       <Text style={{ color: 'var(--tg-theme-text-color)', lineHeight: '1.4', fontSize: 15 }}>
                         {r.text}
                       </Text>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};