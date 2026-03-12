import React, { useEffect, useState, useRef } from 'react';
import {
  List,
  Section,
  Cell,
  Placeholder,
  Spinner,
  Avatar,
  Title,
  Text
} from '@telegram-apps/telegram-ui';
import { Icon28Favorite } from '@vkontakte/icons';
import lottie from 'lottie-web';

import { fetchMasterReviews, Review } from '../helpers/api';

// --- Компонент для Lottie анимации ---
const LottieIcon: React.FC<{ src: string; size?: number }> = ({ src, size = 120 }) => {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    try {
      const anim = lottie.loadAnimation({
        container: container.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: src,
      });
      return () => anim.destroy();
    } catch (e) { console.error(e); }
  }, [src]);
  return <div ref={container} style={{ width: size, height: size, margin: '0 auto 16px' }} />;
};

type Props = {
  telegramId: number;
  onBack: () => void;
};

export const MasterReviewsScreen: React.FC<Props> = ({ telegramId, onBack }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Настройка нативной кнопки "Назад"
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.BackButton.onClick(onBack);
      tg.BackButton.show();
    }
    return () => {
      if (tg) {
        tg.BackButton.offClick(onBack);
        tg.BackButton.hide();
      }
    };
  }, [onBack]);

  useEffect(() => {
    fetchMasterReviews(telegramId)
      .then((data) => {
          setReviews(data);
          const tg = (window as any).Telegram?.WebApp;
          if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      })
      .catch((e) => {
          console.error(e);
          const tg = (window as any).Telegram?.WebApp;
          if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
      })
      .finally(() => setLoading(false));
  }, [telegramId]);

  const average = reviews.length
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', minHeight: '100vh', paddingBottom: 60 }}>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <Spinner size="l" />
        </div>
      ) : reviews.length === 0 ? (
        <div style={{ paddingTop: 60 }}>
            <Placeholder
              header="Нет отзывов"
              description="Здесь появятся оценки и комментарии от ваших клиентов."
            >
               <LottieIcon src="/stickers/duck_out.json" size={140} />
            </Placeholder>
        </div>
      ) : (
        <>
          {/* Б��ок с общим рейтингом (Стиль App Store) */}
          <div style={{
              padding: '40px 20px 32px',
              textAlign: 'center',
              backgroundColor: 'var(--tg-theme-bg-color)',
              borderBottom: '1px solid var(--tg-theme-secondary-bg-color)'
          }}>
             <Title level="1" weight="1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: 56, color: 'var(--tg-theme-text-color)' }}>
                {average}
                <Icon28Favorite style={{ color: '#FF9500', width: 44, height: 44 }} />
             </Title>
             <Text style={{ color: 'var(--tg-theme-hint-color)', fontSize: 15, marginTop: 8, display: 'block' }}>
                На основе {reviews.length} {reviews.length === 1 ? 'оценки' : 'оценок'}
             </Text>
          </div>

          {/* Список отзывов */}
          <List style={{ padding: '0 16px', marginTop: 16 }}>
            {reviews.map((r, i) => (
              <Section key={i}>
                <Cell
                   before={
                      <Avatar
                         size={48}
                         fallbackIcon={<span style={{fontSize: 24}}>👤</span>}
                         style={{ border: '2px solid var(--tg-theme-secondary-bg-color)' }}
                      />
                   }
                   description={
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                         {/* Звездочки */}
                         <div style={{ display: 'flex', color: '#FF9500', fontSize: 14, letterSpacing: 2 }}>
                            {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                         </div>

                         {/* Текст отзыва */}
                         {r.text && (
                            <span style={{ color: 'var(--tg-theme-text-color)', fontSize: 15, lineHeight: '1.4' }}>
                              {r.text}
                            </span>
                         )}

                         {/* Дата */}
                         <span style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', marginTop: 4, fontWeight: 500 }}>
                            {new Date(r.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                         </span>
                      </div>
                   }
                   multiline
                >
                   <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--tg-theme-text-color)' }}>
                       {r.author_name || 'Клиент'}
                   </span>
                </Cell>
              </Section>
            ))}
          </List>
        </>
      )}
    </div>
  );
};