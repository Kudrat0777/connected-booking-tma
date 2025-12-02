import React, { useState } from 'react';
import {
  Section,
  Button,
  Textarea,
  Placeholder,
  Title
} from '@telegram-apps/telegram-ui';
import { Icon28Favorite, Icon28FavoriteOutline } from '@vkontakte/icons';
import { ScreenLayout } from '../components/ScreenLayout';
import { addReview } from '../helpers/api';

type Props = {
  telegramId: number;
  masterId: number;
  masterName: string;
  userFirstName?: string;
  onBack: () => void;
  onSuccess: () => void;
};

export const LeaveReviewScreen: React.FC<Props> = ({
  telegramId,
  masterId,
  masterName,
  userFirstName,
  onBack,
  onSuccess
}) => {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await addReview({
        master_id: masterId,
        telegram_id: telegramId,
        rating,
        text,
        author_name: userFirstName || 'Клиент'
      });
      alert('Спасибо за ваш отзыв!');
      onSuccess();
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Ошибка при отправке отзыва');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return (
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '20px 0' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <div key={star} onClick={() => setRating(star)} style={{ cursor: 'pointer' }}>
            {star <= rating ? (
              <Icon28Favorite width={48} height={48} style={{ color: '#FFD700' }} />
            ) : (
              <Icon28FavoriteOutline width={48} height={48} style={{ color: 'var(--tgui--hint_color)' }} />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <ScreenLayout title="Оценка" onBack={onBack}>
      <div style={{ padding: 16 }}>
        <Placeholder
           header={`Как вам визит к ${masterName}?`}
           description="Поставьте оценку и напишите пару слов."
        >
           {renderStars()}
           <Title level="3" style={{ marginBottom: 20 }}>{rating} из 5</Title>
        </Placeholder>

        <Section>
          <Textarea
            header="Ваш комментарий (необязательно)"
            placeholder="Все понравилось, мастер профи..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </Section>

        <div style={{ marginTop: 24 }}>
          <Button
            size="l"
            mode="filled"
            stretched
            loading={loading}
            onClick={handleSubmit}
          >
            Отправить отзыв
          </Button>
        </div>
      </div>
    </ScreenLayout>
  );
};