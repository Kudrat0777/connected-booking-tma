import React, { useState } from 'react';
import { Button, Textarea, Headline } from '@telegram-apps/telegram-ui';
import { Icon28Favorite, Icon28FavoriteOutline } from '@vkontakte/icons';
import { addReview, Booking } from '../helpers/api';

type Props = {
  booking: Booking | null;
  onClose: () => void;
  onSuccess: () => void;
  telegramId: number;
};

export const RateBookingModal: React.FC<Props> = ({ booking, onClose, onSuccess, telegramId }) => {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  if (!booking) return null;

  // Пытаемся безопасно достать имя мастера
  // В типе Slot (из api.ts) у нас есть booking.slot.service.master (это number ID)
  // И booking.slot.service.master_name (строка)
  const masterName = booking.master_name || booking.slot.service.master_name || 'Мастера';
  const masterId = booking.slot.service.master;

  const handleSubmit = async () => {
    if (!masterId) {
        alert('Ошибка: Не удалось определить ID мастера');
        return;
    }
    setLoading(true);
    try {
      await addReview({
        master_id: masterId,
        rating: rating,
        text: text,
        telegram_id: telegramId,
        author_name: booking.client_name || 'Клиент'
      });
      alert('Спасибо за отзыв!');
      onSuccess();
      onClose();
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Ошибка при отправке отзыва');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(2px)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 500,
          background: 'var(--tgui--bg_color)',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: '24px 16px 40px',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.2)',
          transform: 'translateY(0)',
          transition: 'transform 0.3s ease-out',
          animation: 'slideUp 0.3s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
           <Headline weight="2">Оценить визит</Headline>
           <div style={{ color: 'var(--tgui--hint_color)', fontSize: 14, marginTop: 4 }}>
             Как прошел визит к {masterName}?
           </div>
        </div>

        {/* ЗВЕЗДЫ */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <div key={star} onClick={() => setRating(star)} style={{ cursor: 'pointer', transform: 'scale(1.2)' }}>
               {star <= rating ? (
                 <Icon28Favorite width={36} height={36} style={{ color: '#FFC107' }} />
               ) : (
                 <Icon28FavoriteOutline width={36} height={36} style={{ color: 'var(--tgui--hint_color)' }} />
               )}
            </div>
          ))}
        </div>

        {/* ТЕКСТ */}
        <div style={{ marginBottom: 20 }}>
           <Textarea
             header="Ваш комментарий"
             placeholder="Напишите пару слов (необязательно)"
             value={text}
             onChange={e => setText(e.target.value)}
           />
        </div>

        <Button size="l" stretched mode="filled" loading={loading} onClick={handleSubmit}>
           Отправить отзыв
        </Button>
      </div>
    </div>
  );
};