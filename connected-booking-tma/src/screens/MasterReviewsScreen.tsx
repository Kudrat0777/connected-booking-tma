import React, { useEffect, useState } from 'react';
import {
  List,
  Section,
  Cell,
  Placeholder,
  Spinner,
  Avatar
} from '@telegram-apps/telegram-ui';
import { Icon28Favorite } from '@vkontakte/icons';
import { ScreenLayout } from '../components/ScreenLayout';
import { fetchMasterReviews, Review } from '../helpers/api';

type Props = {
  telegramId: number;
  onBack: () => void;
};

export const MasterReviewsScreen: React.FC<Props> = ({ telegramId, onBack }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMasterReviews(telegramId)
      .then(setReviews)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [telegramId]);

  // Подсчет среднего рейтинга
  const average = reviews.length
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <ScreenLayout title="Мои отзывы" onBack={onBack}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
          <Spinner size="l" />
        </div>
      ) : reviews.length === 0 ? (
        <Placeholder
          header="Нет отзывов"
          description="Клиенты пока не оставили оценок."
        >
           <div style={{ fontSize: 40 }}>⭐️</div>
        </Placeholder>
      ) : (
        <>
          {/* Шапка со средним рейтингом */}
          <div style={{ padding: 16, textAlign: 'center' }}>
             <div style={{ fontSize: 32, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Icon28Favorite style={{ color: 'orange', width: 32, height: 32 }} />
                {average}
             </div>
             <div style={{ color: 'var(--tgui--hint_color)', fontSize: 14 }}>
                На основе {reviews.length} отзывов
             </div>
          </div>

          <List style={{ background: 'var(--tgui--secondary_bg_color)' }}>
            {reviews.map((r, i) => (
              <Section key={i}>
                <Cell
                   before={<Avatar size={40} fallbackIcon={<span style={{fontSize: 20}}>👤</span>} />}
                   description={
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                         {/* Звездочки */}
                         <div style={{ display: 'flex', color: 'orange', fontSize: 12 }}>
                            {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                         </div>
                         {/* Текст отзыва */}
                         {r.text && (
                            <span style={{ color: 'var(--tgui--text_color)', fontSize: 15 }}>
                              {r.text}
                            </span>
                         )}
                         {/* Дата */}
                         <span style={{ fontSize: 12, opacity: 0.6 }}>
                            {new Date(r.created_at).toLocaleDateString()}
                         </span>
                      </div>
                   }
                   multiline
                >
                   {r.author_name || 'Клиент'}
                </Cell>
              </Section>
            ))}
          </List>
        </>
      )}
    </ScreenLayout>
  );
};