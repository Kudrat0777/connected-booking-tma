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

import { useLanguage } from '../helpers/LanguageContext';

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
  const { t } = useLanguage();
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
        author_name: userFirstName || t('m_reviews_client')
      });
      alert(t('rev_success'));
      onSuccess();
    } catch (e: any) {
      console.error(e);
      alert(e.message || t('rev_error'));
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
              <Icon28FavoriteOutline width={48} height={48} style={{ color: 'var(--tg-theme-hint-color)' }} />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <ScreenLayout title={t('rev_rating_title')} onBack={onBack}>
      <div style={{ padding: 16 }}>
        <Placeholder
           header={`${t('rev_how_was_visit')} ${masterName}?`}
           description={t('rev_rate_desc')}
        >
           {renderStars()}
           <Title level="3" style={{ marginBottom: 20 }}>{rating} {t('rev_out_of_5')}</Title>
        </Placeholder>

        <Section>
          <Textarea
            header={t('rev_comment')}
            placeholder={t('rev_comment_ph')}
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
            {t('rev_btn_send')}
          </Button>
        </div>
      </div>
    </ScreenLayout>
  );
};