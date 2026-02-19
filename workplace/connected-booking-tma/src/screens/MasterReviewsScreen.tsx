import React, { useEffect, useState } from 'react';
import {
  List,
  Section,
  Cell,
  Placeholder,
  Spinner,
  Avatar,
  Title
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

  const average = reviews.length
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <ScreenLayout title="Мои отзывы" onBack={onBack}>
      {/* ОБЕРТКА ДЛЯ СКРОЛЛА */}
      <div
        style={{
          height: 'calc(100vh - 70px)', // Высота экрана минус примерная высота шапки
          overflowY: 'auto',            // Включаем вертикальный скролл
          WebkitOverflowScrolling: 'touch', // Плавный скролл на айфонах
          paddingBottom: 40             // Отступ снизу, чтобы контент не прилипал
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
            <Spinner size="l" />
          </div>
        ) : reviews.length === 0 ? (
          <Placeholder
            header="Нет отзывов"
            description="Здесь появятся оценки и комментарии от ваших клиентов."
          >
             <div style={{ fontSize: 40 }}>💬</div>
          </Placeholder>
        ) : (
          <>
            {/* Блок с рейтингом */}
            <div style={{ padding: 20, textAlign: 'center', background: 'var(--tgui--bg_color)' }}>
               <Title level="1" weight="1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 32 }}>
                  <Icon28Favorite style={{ color: 'orange', width: 32, height: 32 }} />
                  {average}
               </Title>
               <div style={{ color: 'var(--tgui--hint_color)', fontSize: 14, marginTop: 4 }}>
                  На основе {reviews.length} оценок
               </div>
            </div>

            <List style={{ background: 'var(--tgui--secondary_bg_color)' }}>
              {reviews.map((r, i) => (
                <Section key={i}>
                  <Cell
                     before={<Avatar size={40} fallbackIcon={<span style={{fontSize: 20}}>👤</span>} />}
                     description={
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                           <div style={{ display: 'flex', color: 'orange', fontSize: 12 }}>
                              {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                           </div>
                           {r.text && (
                              <span style={{ color: 'var(--tgui--text_color)', fontSize: 15 }}>
                                {r.text}
                              </span>
                           )}
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
      </div>
    </ScreenLayout>
  );
};